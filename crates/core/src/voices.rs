#[derive(Debug, Clone, Copy)]
pub struct VoiceCandidate<'a> {
    pub id: &'a str,
    pub category: &'a str,
    pub priority: i32,
    pub audibility: f32,
    pub started_order: u64,
    pub active: bool,
}

pub fn select_voice_to_evict<'a>(
    candidates: Vec<VoiceCandidate<'a>>,
    category: &str,
    category_limit: usize,
    total_limit: usize,
) -> Option<&'a str> {
    let active_total = candidates.iter().filter(|voice| voice.active).count();
    let active_category = candidates
        .iter()
        .filter(|voice| voice.active && voice.category == category)
        .count();

    let category_over_limit = active_category > category_limit.max(1);
    let total_over_limit = active_total > total_limit.max(1);
    if !category_over_limit && !total_over_limit {
        return None;
    }

    candidates
        .into_iter()
        .filter(|voice| voice.active && (!category_over_limit || voice.category == category))
        .min_by(|left, right| {
            left.priority
                .cmp(&right.priority)
                .then_with(|| left.audibility.total_cmp(&right.audibility))
                .then_with(|| left.started_order.cmp(&right.started_order))
                .then_with(|| left.id.cmp(right.id))
        })
        .map(|voice| voice.id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn category_overflow_does_not_evict_another_category() {
        let candidates = vec![
            VoiceCandidate {
                id: "danger",
                category: "danger",
                priority: 100,
                audibility: 1.0,
                started_order: 1,
                active: true,
            },
            VoiceCandidate {
                id: "music-near",
                category: "music",
                priority: 20,
                audibility: 0.8,
                started_order: 2,
                active: true,
            },
            VoiceCandidate {
                id: "music-far",
                category: "music",
                priority: 20,
                audibility: 0.2,
                started_order: 3,
                active: true,
            },
        ];
        assert_eq!(
            select_voice_to_evict(candidates, "music", 1, 32),
            Some("music-far")
        );
    }

    #[test]
    fn total_overflow_prefers_low_priority() {
        let candidates = vec![
            VoiceCandidate {
                id: "danger",
                category: "danger",
                priority: 100,
                audibility: 0.1,
                started_order: 1,
                active: true,
            },
            VoiceCandidate {
                id: "music",
                category: "music",
                priority: 20,
                audibility: 1.0,
                started_order: 2,
                active: true,
            },
        ];
        assert_eq!(
            select_voice_to_evict(candidates, "danger", 8, 1),
            Some("music")
        );
    }
}
