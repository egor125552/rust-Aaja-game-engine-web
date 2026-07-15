mod math;
mod presets;
mod scene;
mod voices;

use math::{DistanceModel, Vec3};
use presets::RoomPresetV1;
use scene::Scene;
use wasm_bindgen::prelude::*;

fn js_error(message: impl Into<String>) -> JsValue {
    JsValue::from_str(&message.into())
}

fn parse_json<T: serde::de::DeserializeOwned>(json: &str) -> Result<T, JsValue> {
    serde_json::from_str(json).map_err(|error| js_error(error.to_string()))
}

fn to_json<T: serde::Serialize>(value: &T) -> Result<String, JsValue> {
    serde_json::to_string(value).map_err(|error| js_error(error.to_string()))
}

#[wasm_bindgen]
pub struct CoreEngine {
    scene: Scene,
}

#[wasm_bindgen]
impl CoreEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            scene: Scene::default(),
        }
    }

    pub fn version(&self) -> String {
        env!("CARGO_PKG_VERSION").into()
    }

    #[wasm_bindgen(js_name = setListenerPosition)]
    pub fn set_listener_position(&mut self, x: f32, y: f32, z: f32) -> Result<(), JsValue> {
        self.scene
            .set_listener_position(Vec3::new(x, y, z).map_err(js_error)?);
        Ok(())
    }

    #[wasm_bindgen(js_name = upsertSource)]
    #[allow(clippy::too_many_arguments)]
    pub fn upsert_source(
        &mut self,
        id: &str,
        x: f32,
        y: f32,
        z: f32,
        volume: f32,
        priority: i32,
        category: &str,
    ) -> Result<(), JsValue> {
        self.scene
            .upsert_source(
                id,
                Vec3::new(x, y, z).map_err(js_error)?,
                volume,
                priority,
                category,
            )
            .map_err(js_error)
    }

    #[wasm_bindgen(js_name = setSourcePosition)]
    pub fn set_source_position(
        &mut self,
        id: &str,
        x: f32,
        y: f32,
        z: f32,
    ) -> Result<(), JsValue> {
        self.scene
            .set_source_position(id, Vec3::new(x, y, z).map_err(js_error)?)
            .map_err(js_error)
    }

    #[wasm_bindgen(js_name = setSourceActive)]
    pub fn set_source_active(&mut self, id: &str, active: bool) -> Result<(), JsValue> {
        self.scene.set_source_active(id, active).map_err(js_error)
    }

    #[wasm_bindgen(js_name = removeSource)]
    pub fn remove_source(&mut self, id: &str) -> bool {
        self.scene.remove_source(id)
    }

    #[wasm_bindgen(js_name = distanceToSource)]
    pub fn distance_to_source(&self, id: &str) -> Result<f32, JsValue> {
        self.scene.distance_to_source(id).map_err(js_error)
    }

    #[wasm_bindgen(js_name = attenuationForSource)]
    pub fn attenuation_for_source(
        &self,
        id: &str,
        model: &str,
        ref_distance: f32,
        max_distance: f32,
        rolloff: f32,
    ) -> Result<f32, JsValue> {
        let model = DistanceModel::parse(model).map_err(js_error)?;
        self.scene
            .attenuation_for_source(id, model, ref_distance, max_distance, rolloff)
            .map_err(js_error)
    }

    #[wasm_bindgen(js_name = selectVoiceToEvict)]
    pub fn select_voice_to_evict(
        &self,
        category: &str,
        category_limit: u32,
        total_limit: u32,
    ) -> String {
        self.scene
            .select_voice_to_evict(category, category_limit as usize, total_limit as usize)
            .unwrap_or_default()
            .into()
    }

    #[wasm_bindgen(js_name = roomPresetJson)]
    pub fn room_preset_json(&self, name: &str) -> Result<String, JsValue> {
        let preset = presets::built_in(name)
            .ok_or_else(|| js_error(format!("unknown room preset: {name}")))?
            .normalize()
            .map_err(js_error)?;
        to_json(&preset)
    }

    #[wasm_bindgen(js_name = normalizeRoomPresetJson)]
    pub fn normalize_room_preset_json(&self, json: &str) -> Result<String, JsValue> {
        let preset = parse_json::<RoomPresetV1>(json)?.normalize().map_err(js_error)?;
        to_json(&preset)
    }
}

impl Default for CoreEngine {
    fn default() -> Self {
        Self::new()
    }
}
