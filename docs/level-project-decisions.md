# Level project decisions (2026-10-28)

- Checked `main` at `f5c63a22483feeeb29583853dab0c0911af5c09a`; the original `GAME_VERSION` is 0.17.0. New runtime release is 0.18.0. `BASE_COMMIT` in the furniture patch is `7b99da5` and remains a strict legacy baseline; new projects record the checked main HEAD. The proposal's `5d3a30e` is neither main nor the furniture baseline.
- Project `schemaVersion` is **2**. “2.1” identifies the proposal revision, not a serialized schema version. Architecture's nested `schemaVersion` remains 1. `compatibleWith` lists game versions, not Git commits.
- All distances are model units with `metricScaleVerified: false`. Minimum new passage width is 1.10 (error); corridor width below 2.0 is a warning. Existing unedited Floor 5 doors are exempt.
- Door swing is automatic in `doors.mjs`, including two leaves on wide apertures and approach-aware opening. `hinge` and `opensToward` are not required. V09 checks runtime-supported access instead.
- The existing engine renders window parapets, but Floor 5 uses special case dimensions. New levels must use `sill` for visible and physical geometry. Glass is solid before breakage; opening has no leaf or wall collision. The project must not claim free traversal through glazed or window segments.
- Canonical new ZIP paths are `project.json`, `assets/models/<sha256>.glb`, `assets/posters/<safe-id>.webp`, optional `preview/plan.png`, `preview/view3d.png`, and `AGENT_BRIEF.md`. Legacy `projekt.json` plus `models/` is accepted only as an input.
- A version 1 patch is retained verbatim under `legacyPatch` when migrated. This preserves emptyFixed, architecture, posters, treatments, dimensions, mounts and old metadata; normalization must not destroy the original.
- The public example must be synthetic. Private plan data and unverified local models are never added to a public level manifest.

Baseline: `node tools/owner-door-traversal.mjs` passed 102 directional cases; `node tools/verify-owner-runtime.mjs` passed 195 SHA-256 entries. The broad Node suite requires a local `three` resolution shim for vendored addon imports; without it six files fail at module resolution before assertions run.
