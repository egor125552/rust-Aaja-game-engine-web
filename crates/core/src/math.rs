use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    pub const ZERO: Self = Self {
        x: 0.0,
        y: 0.0,
        z: 0.0,
    };

    pub fn new(x: f32, y: f32, z: f32) -> Result<Self, String> {
        let vector = Self { x, y, z };
        if vector.is_finite() {
            Ok(vector)
        } else {
            Err("vector components must be finite".into())
        }
    }

    pub fn is_finite(self) -> bool {
        self.x.is_finite() && self.y.is_finite() && self.z.is_finite()
    }

    pub fn distance(self, other: Self) -> f32 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        let dz = self.z - other.z;
        dx.mul_add(dx, dy.mul_add(dy, dz * dz)).sqrt()
    }
}

impl Default for Vec3 {
    fn default() -> Self {
        Self::ZERO
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DistanceModel {
    Linear,
    Inverse,
    Exponential,
}

impl DistanceModel {
    pub fn parse(value: &str) -> Result<Self, String> {
        match value {
            "linear" => Ok(Self::Linear),
            "inverse" => Ok(Self::Inverse),
            "exponential" => Ok(Self::Exponential),
            _ => Err(format!("unknown distance model: {value}")),
        }
    }
}

pub fn attenuation(
    distance: f32,
    model: DistanceModel,
    ref_distance: f32,
    max_distance: f32,
    rolloff: f32,
) -> Result<f32, String> {
    for (name, value) in [
        ("distance", distance),
        ("refDistance", ref_distance),
        ("maxDistance", max_distance),
        ("rolloff", rolloff),
    ] {
        if !value.is_finite() {
            return Err(format!("{name} must be finite"));
        }
    }

    let distance = distance.max(0.0);
    let reference = ref_distance.max(0.001);
    let maximum = max_distance.max(reference);
    let rolloff = rolloff.max(0.0);
    let clamped = distance.clamp(reference, maximum);
    let gain = match model {
        DistanceModel::Linear => {
            if maximum <= reference {
                1.0
            } else {
                1.0 - rolloff * (clamped - reference) / (maximum - reference)
            }
        }
        DistanceModel::Inverse => reference / (reference + rolloff * (clamped - reference)),
        DistanceModel::Exponential => (clamped / reference).powf(-rolloff),
    };
    Ok(gain.clamp(0.0, 1.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn computes_distance() {
        let value = Vec3::ZERO.distance(Vec3::new(3.0, 4.0, 12.0).expect("finite vector"));
        assert!((value - 13.0).abs() < 0.0001);
    }

    #[test]
    fn rejects_non_finite_vectors() {
        assert!(Vec3::new(f32::NAN, 0.0, 0.0).is_err());
    }

    #[test]
    fn attenuation_is_bounded() {
        for model in [
            DistanceModel::Linear,
            DistanceModel::Inverse,
            DistanceModel::Exponential,
        ] {
            let value =
                attenuation(10.0, model, 1.0, 100.0, 1.0).expect("valid attenuation inputs");
            assert!((0.0..=1.0).contains(&value));
        }
    }
}
