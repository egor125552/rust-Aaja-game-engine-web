use serde::{Deserialize, Serialize};

pub const ROOM_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoomPresetV1 {
    pub schema_version: u32,
    pub name: String,
    pub wet: f32,
    pub decay_seconds: f32,
    pub pre_delay_seconds: f32,
    pub high_frequency_absorption: f32,
    pub early_reflections: f32,
    pub size: f32,
    pub tone_hz: f32,
}

impl RoomPresetV1 {
    pub fn normalize(mut self) -> Result<Self, String> {
        if self.schema_version != ROOM_SCHEMA_VERSION {
            return Err(format!(
                "unsupported room schema version: {}",
                self.schema_version
            ));
        }
        if self.name.trim().is_empty() {
            return Err("room name cannot be empty".into());
        }
        let values = [
            self.wet,
            self.decay_seconds,
            self.pre_delay_seconds,
            self.high_frequency_absorption,
            self.early_reflections,
            self.size,
            self.tone_hz,
        ];
        if values.into_iter().any(|value| !value.is_finite()) {
            return Err("room parameters must be finite".into());
        }

        self.wet = self.wet.clamp(0.0, 1.0);
        self.decay_seconds = self.decay_seconds.clamp(0.05, 12.0);
        self.pre_delay_seconds = self.pre_delay_seconds.clamp(0.0, 0.3);
        self.high_frequency_absorption = self.high_frequency_absorption.clamp(0.0, 1.0);
        self.early_reflections = self.early_reflections.clamp(0.0, 1.0);
        self.size = self.size.clamp(0.0, 1.0);
        self.tone_hz = self.tone_hz.clamp(80.0, 20_000.0);
        Ok(self)
    }
}

#[allow(clippy::too_many_arguments)]
fn room(
    name: &str,
    wet: f32,
    decay_seconds: f32,
    pre_delay_seconds: f32,
    high_frequency_absorption: f32,
    early_reflections: f32,
    size: f32,
    tone_hz: f32,
) -> RoomPresetV1 {
    RoomPresetV1 {
        schema_version: ROOM_SCHEMA_VERSION,
        name: name.into(),
        wet,
        decay_seconds,
        pre_delay_seconds,
        high_frequency_absorption,
        early_reflections,
        size,
        tone_hz,
    }
}

pub fn built_in(name: &str) -> Option<RoomPresetV1> {
    Some(match name {
        "dry" => room(name, 0.0, 0.08, 0.0, 0.1, 0.0, 0.0, 18_000.0),
        "small-room" => room(name, 0.24, 0.48, 0.008, 0.42, 0.68, 0.22, 11_500.0),
        "large-room" => room(name, 0.40, 1.55, 0.018, 0.35, 0.56, 0.66, 9_500.0),
        "long-corridor" => room(name, 0.48, 2.05, 0.032, 0.24, 0.82, 0.72, 12_500.0),
        "basement" => room(name, 0.34, 1.18, 0.014, 0.72, 0.52, 0.45, 5_200.0),
        "metal-room" => room(name, 0.45, 1.32, 0.010, 0.12, 0.88, 0.48, 15_500.0),
        "metal-corridor" => room(name, 0.52, 2.20, 0.030, 0.16, 0.90, 0.76, 14_500.0),
        "cave" => room(name, 0.62, 3.85, 0.036, 0.43, 0.48, 0.95, 8_200.0),
        "street" => room(name, 0.08, 0.34, 0.006, 0.22, 0.12, 0.75, 16_000.0),
        "outdoors" => room(name, 0.04, 0.20, 0.003, 0.18, 0.06, 1.0, 18_000.0),
        "forest" => room(name, 0.16, 0.72, 0.016, 0.76, 0.34, 0.88, 6_300.0),
        "underwater" => room(name, 0.38, 1.85, 0.024, 0.94, 0.26, 0.78, 1_100.0),
        _ => return None,
    })
}

#[cfg(test)]
pub fn names() -> &'static [&'static str] {
    &[
        "dry",
        "small-room",
        "large-room",
        "long-corridor",
        "basement",
        "metal-room",
        "metal-corridor",
        "cave",
        "street",
        "outdoors",
        "forest",
        "underwater",
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_builtin_is_valid() {
        for name in names() {
            assert!(built_in(name).and_then(|preset| preset.normalize().ok()).is_some());
        }
    }

    #[test]
    fn normalization_clamps_values() {
        let mut preset = built_in("cave").expect("known room");
        preset.wet = 4.0;
        preset.tone_hz = 30_000.0;
        let normalized = preset.normalize().expect("valid schema");
        assert_eq!(normalized.wet, 1.0);
        assert_eq!(normalized.tone_hz, 20_000.0);
    }

    #[test]
    fn future_schema_is_rejected() {
        let mut preset = built_in("cave").expect("known room");
        preset.schema_version = 2;
        assert!(preset.normalize().is_err());
    }
}
