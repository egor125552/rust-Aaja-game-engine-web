# ADR 0003: No silent Rust/WASM fallback

Status: accepted.

The release entry point fails clearly when the generated Rust/WASM package is missing. A JavaScript replacement that reports successful startup would hide packaging regressions and make tests exercise a different product. Focused pure TypeScript tests remain possible, while CI must load and execute the real generated module.
