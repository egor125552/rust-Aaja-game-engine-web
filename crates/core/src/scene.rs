use crate::math::{attenuation, DistanceModel, Vec3};
use crate::voices::{select_voice_to_evict, VoiceCandidate};
use std::collections::BTreeMap;

#[derive(Debug, Clone)]
pub struct SourceState {
    pub position: Vec3,
    pub volume: f32,
    pub priority: i32,
    pub category: String,
    pub active: bool,
    pub started_order: u64,
}

#[derive(Debug, Default)]
pub struct Scene {
    listener: Vec3,
    sources: BTreeMap<String, SourceState>,
    next_started_order: u64,
}

impl Scene {
    pub fn set_listener_position(&mut self, position: Vec3) {
        self.listener = position;
    }

    pub fn upsert_source(
        &mut self,
        id: &str,
        position: Vec3,
        volume: f32,
        priority: i32,
        category: &str,
    ) -> Result<(), String> {
        if id.trim().is_empty() {
            return Err("source id cannot be empty".into());
        }
        if category.trim().is_empty() {
            return Err("source category cannot be empty".into());
        }
        if !volume.is_finite() {
            return Err("source volume must be finite".into());
        }

        let normalized_volume = volume.clamp(0.0, 1.0);
        match self.sources.get_mut(id) {
            Some(source) => {
                source.position = position;
                source.volume = normalized_volume;
                source.priority = priority;
                source.category = category.into();
            }
            None => {
                self.sources.insert(
                    id.into(),
                    SourceState {
                        position,
                        volume: normalized_volume,
                        priority,
                        category: category.into(),
                        active: false,
                        started_order: 0,
                    },
                );
            }
        }
        Ok(())
    }

    pub fn set_source_position(&mut self, id: &str, position: Vec3) -> Result<(), String> {
        let source = self
            .sources
            .get_mut(id)
            .ok_or_else(|| format!("source not found: {id}"))?;
        source.position = position;
        Ok(())
    }

    pub fn set_source_active(&mut self, id: &str, active: bool) -> Result<(), String> {
        let source = self
            .sources
            .get_mut(id)
            .ok_or_else(|| format!("source not found: {id}"))?;
        if active && !source.active {
            self.next_started_order = self.next_started_order.saturating_add(1);
            source.started_order = self.next_started_order;
        }
        source.active = active;
        Ok(())
    }

    pub fn remove_source(&mut self, id: &str) -> bool {
        self.sources.remove(id).is_some()
    }

    pub fn distance_to_source(&self, id: &str) -> Result<f32, String> {
        let source = self
            .sources
            .get(id)
            .ok_or_else(|| format!("source not found: {id}"))?;
        Ok(self.listener.distance(source.position))
    }

    pub fn attenuation_for_source(
        &self,
        id: &str,
        model: DistanceModel,
        ref_distance: f32,
        max_distance: f32,
        rolloff: f32,
    ) -> Result<f32, String> {
        attenuation(
            self.distance_to_source(id)?,
            model,
            ref_distance,
            max_distance,
            rolloff,
        )
    }

    pub fn select_voice_to_evict(
        &self,
        category: &str,
        category_limit: usize,
        total_limit: usize,
    ) -> Option<&str> {
        let candidates = self
            .sources
            .iter()
            .map(|(id, source)| VoiceCandidate {
                id,
                category: &source.category,
                priority: source.priority,
                audibility: self.audibility(source),
                started_order: source.started_order,
                active: source.active,
            })
            .collect();
        select_voice_to_evict(candidates, category, category_limit, total_limit)
    }

    fn audibility(&self, source: &SourceState) -> f32 {
        let distance = self.listener.distance(source.position);
        let distance_gain = attenuation(distance, DistanceModel::Inverse, 1.0, 100.0, 1.0)
            .unwrap_or(0.0);
        source.volume * distance_gain
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vector(x: f32, y: f32, z: f32) -> Vec3 {
        Vec3::new(x, y, z).expect("finite vector")
    }

    #[test]
    fn chooses_low_priority_then_quiet_voice() {
        let mut scene = Scene::default();
        scene
            .upsert_source("near", vector(0.0, 0.0, -1.0), 1.0, 10, "music")
            .expect("valid source");
        scene
            .upsert_source("far", vector(0.0, 0.0, -20.0), 1.0, 10, "music")
            .expect("valid source");
        scene.set_source_active("near", true).expect("known source");
        scene.set_source_active("far", true).expect("known source");
        assert_eq!(scene.select_voice_to_evict("music", 1, 32), Some("far"));
    }

    #[test]
    fn category_limit_does_not_evict_other_categories() {
        let mut scene = Scene::default();
        scene
            .upsert_source("danger", vector(0.0, 0.0, -1.0), 1.0, 100, "danger")
            .expect("valid source");
        scene
            .upsert_source("music-a", vector(0.0, 0.0, -1.0), 1.0, 20, "music")
            .expect("valid source");
        scene
            .upsert_source("music-b", vector(0.0, 0.0, -2.0), 1.0, 20, "music")
            .expect("valid source");
        for id in ["danger", "music-a", "music-b"] {
            scene.set_source_active(id, true).expect("known source");
        }
        assert_ne!(scene.select_voice_to_evict("music", 1, 32), Some("danger"));
    }
}
