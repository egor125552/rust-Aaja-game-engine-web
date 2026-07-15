# ADR 0002: Versioned JSON room presets

Status: accepted.

Presets use schema version `1`, strict finite ranges, stable names, and normalization. Unknown future versions fail explicitly instead of being guessed. Public API accepts built-in names or validated custom objects.
