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

## Shared building workflow (2026-10-28, baseline 47728ea)

- Both `new.html` and `new.html?mode=edit-floor5` use the same plan/3D tools. The original editor remains available for compatibility.
- `project-scene.mjs` resolves the authored scene for UI, collision handoff and FPS. Floor 5 retains source polygons, routes and a pinned baseline; source edits and removals are applied before physics is built. Default FPS without a level parameter still uses the original world path.
- Room strokes create their floor and four walls; one click places a standard door/opening or a window/glass span on an existing wall, replacing that span. No separate collision drawing is required. Furniture models are shared with the FPS preview, and collider dimensions use local width/depth, rotation and elevation exactly once.
- Floor 5 projects inherit the existing 5+5 anchors if no gameplay overrides exist. Engine validation checks the resolved scene. Original unmodified doors retain their width exemption.
- Schema remains 2; these are additive behaviors within that contract. Editor version is 3.2.0, compatible game version remains 0.18.0; the historical furniture BASE_COMMIT is unchanged.
- The export is deterministic geometry plus a derived collision map and an agent brief. It makes implementation reproducible; no promise of error-free autonomous changes replaces engine/browser verification.

Shared-wall compilation also removes every underlying solid span when a window/glass part is fitted across overlapping room walls. A real shot-clearance regression confirms that no invisible opaque wall survives behind a broken window. Capsule traversal is simulated from both sides in the isolated level world; the original 102-case Floor 5 regression remains separate.

Publication verification found a browser environment with WebGL disabled. The new studio now creates its 3D renderer lazily: plan editing and JSON/ZIP remain usable without a GPU. A real Chromium test disables WebGL contexts, builds a room with the mouse, checks the clear 3D warning, and downloads the authored JSON. FPS/3D still require WebGL 2.
