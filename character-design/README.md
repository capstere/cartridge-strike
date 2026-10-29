# Character Design Studio 5.1

Open [the studio](https://capstere.github.io/cartridge-strike/character-design/). The game and its existing characters are unchanged.

## Use the studio

1. Choose an existing character or create a new design using either original rig.
2. Set colours and body proportions in **Utseende**. Try **Ansikte & hår**: eyes, brows, nose, mouth, jaw, beard and freckles all affect the rendered preview. Use **Ansikte / närbild** for a close view.
3. Choose an upper garment in **Kläder & tryck**. Combine it with shoes, gloves and a vest; adjust fit and material. Add text and/or your PNG. The PNG's original bytes, proportions and transparency are retained. Use **Flytta tryck i 3D**, or the position, rotation and scale controls. Select front/back to place the graphic on either side. Pattern mode tiles the image on the torso.
4. In **3D-delar**, add shapes or upload a self-contained GLB. Dropping a GLB onto the viewport also imports an accessory. Select a part, choose its body attachment, then use **Flytta del i 3D** or the precise centimetre/degree controls. Duplicate, mirror and hide individual parts. GLB accessories are normalized to their editable dimensions; the original file remains in the project.
5. Preview every animation present in the original rig. Play/pause, change speed or scrub. Requested new animations are explicitly a brief for future work.
6. Draw on the four reference views or the 1024px face reference. Face drawings have separate front/left/right views, zoom up to 400%, pan and stroke undo. These are annotations, not a texture-paint or sculpting system.
7. Use **Spara i ateljén** for multiple named designs. Autosave saves the working project to IndexedDB after editing and when hiding the page. **Spara projekt (.json)** is a portable backup including PNG and reference/accessory bytes. Reopen it with **Öppna sparat projekt**. Keep a JSON backup when changing device or clearing browser data.
8. Choose **Hämta AI-paket (.zip)** and give the complete ZIP to the AI implementing the character.

Mouse: drag to orbit, wheel/buttons to zoom, **Flytta vyn** or Shift-drag to pan. Touch: one finger to orbit, pinch to zoom and two fingers to pan. Front/back/side and face/shoe focus buttons simplify detailed work. Design undo/redo is separate from the drawing undo buttons; text fields retain their native text undo. Model changes pause playback.

## What the ZIP contains

| File | Purpose |
|---|---|
| `PROJECT.json` | Canonical editable design, parts, dimensions, notes, print transform, annotations and embedded assets |
| `PREVIEW.glb` | Complete visible design prototype, original skeleton and all original animation clips; custom geometry/materials and rigid attachments |
| `BASE_RIG.glb` | Byte-for-byte unmodified original character GLB |
| `STATIC_PROTOTYPE.glb` | Optional authored accessory/primitive parts and imports; static snapshot without host animation |
| `DESIGN_SHEET.png` | Four full-body orthographic views with annotations, independent of the viewport's detail zoom |
| `FACE_FRONT/LEFT/RIGHT.png` | Face closeups with view-specific annotations |
| `SHIRT_ARTWORK.png` | Original PNG without resampling |
| `REFERENCE_01.glb`, etc. | Original uploaded references and accessory files |
| `MANIFEST.json` | Original reference names mapped to packaged names, byte lengths and SHA-256 hashes |
| `AI_INSTRUCTIONS.md` | What to retain, change, create and verify in the game |
| `ANIMATION_CONTRACT.json` | Bone/clip list, coordinate convention, weapon attachment and integration requirements |

The design sheet uses the selected pose. Choose idle before drawing/exporting for an upright reference. Reference annotations are not automatically transformed when the design or pose changes.

## Honest scope

This is a stylized character **design tool**, not automatic production modelling or Blender. The upper garments reuse the original weighted suit topology, with short-sleeve skin colouring, adjustable silhouette, collars/hood details and projected torso art. They deform with the original animation; they are not independently tailored cloth meshes. Different garment choices share topology. Shoes are styled variants of the runtime boot geometry. The original body is clothed: **Bara händer** changes glove colour to skin, rather than creating new hand topology.

Face choices apply local geometry changes to cloned skinned meshes. Eye colour currently tints the original eye material. Hair and beard patches are fitted to the actual head surface. Longer hairstyles add hair curtains, face-framing locks and tapered tails. They remain rigid head attachments; freckles and collars are simplified details. They are not photorealistic hair, facial expression rigs or clothing simulation. There is one active shirt graphic combining PNG and text, on one chosen side; independent multilayer decals and simultaneous front/back prints are not implemented. Imported GLBs can be references or attached accessories, not arbitrary replacement humanoid rigs. Imported skinning is preserved, but imported animation clips are not played by the host skeleton.

`PREVIEW.glb` retains an existing rig and animations. This **does not** certify new clothes/hair/accessories as game-ready. The finishing AI must inspect clipping in every pose, refine geometry and UVs, validate weights and hands/weapon alignment, and deliberately handle the game's generated boots, vest, patches and headset. The original game files are never modified by editing/exporting here. Nothing is uploaded by the studio.

## Reliability and performance

- Existing v2/v3 project JSON is accepted; new fields have defaults. Legacy references without embedded bytes must be supplied again; AI export fails clearly if a referenced file is missing.
- Transactional IndexedDB replaces tiny localStorage limits. Named projects include assets and annotations. Legacy localStorage autosave is read only for migration. A storage failure is reported; it must not claim a successful save.
- Maximum eight references, 12 MB per generic file, 18 MB total; usable GLBs are self-contained and limited by the inspector (8 MB, geometry/object budgets and no external URLs or decoder dependency). PNG: 5 MB, up to 4096 per dimension and 8 megapixels. ZIP limit: 96 MB, reflecting project-embedded and separately packaged originals.
- One WebGL renderer, on-demand preview updates. Playback renders the preview; reference sheets are refreshed on edit, pause and export, avoiding repeated high-resolution sheet rendering while animating.
- If WebGL cannot initialize, the viewport shows a visible recovery notice; saved projects remain available. Browser/device WebGL support is required. Mobile layout/touch is tested through Chromium emulation; this is not a physical iPhone/Safari certification.
- Undo history shares immutable asset data and is capped at 25 design states. Drawing tools maintain their own stroke history. Imported source buffers are not changed; studio deformations use cloned geometry.

## Verification

With a static server on port 8765:

```sh
node --test character-design/*.test.mjs
node character-design/browser-smoke.mjs
node character-design/studio4-browser.mjs
node character-design/accessory-quality-browser.mjs
node character-design/sculpt-browser.mjs
node tools/verify-owner-runtime.mjs
```

Browser runtime: `npm ci --prefix frontline/source/tools/dev --ignore-scripts`, then install Chromium with its pinned Playwright CLI. Optional `CHROMIUM_EXECUTABLE_PATH` selects a local Chromium binary; optional `CHARACTER_TEST_ORIGIN` runs against published Pages. No external CDN assets are needed at runtime. CI runs real WebGL, both desktop and touch mobile sizes, visible face changes, garment styles, original PNG preservation, undo/redo, real GLB accessory roundtrip, all original clips, persistent reopen, ZIP CRC/SHA-256 and parsing the exported skinned GLB. Test screenshots remain local; CI uploads no test artifacts.

Three.js GLTFExporter is vendored at the same 0.180.0 version as the renderer, under Three.js's existing MIT licence. Original Quaternius characters/animations are CC0; see `licenses/quaternius-characters-CC0.txt`.

## 4.1 accessory quality

Built-in accessories now use compound geometry: eyeglass rims/lenses/temples, curved cap brim and seams, open helmet shell, backpack pockets/straps/zips, hollow shoulder guard, wrist band and shield badge. New parts are fitted to actual head/eye bounds or the correct shoulder/wrist bones. **Anpassa till kroppen** resets their position, scale and attachment. Manual transforms remain editable. Mirrored shoulder/wrist parts fit the opposite limb.

Recognisable old presets receive the new geometry. Untouched original defaults are fitted automatically; manually adjusted transforms are retained. Free-form cubes/spheres and imported GLB assets are not guessed into anatomical shapes. Imported GLBs still require the user's transform controls.

Hair and beard patches are clipped from the source head, with interpolated hairlines, small offsets and preserved normals. Headgear suppresses the competing hairstyle. This remains stylized rather than photorealistic hair or collision simulation. Long hair still needs pose-by-pose intersection review before game integration.

The quality browser suite checks 18 real male/female accessory fits against eye, jaw, shoulder and wrist landmarks, checks compound geometry and attachment stability across five motion clips, and captures front/three-quarter/back UI screenshots. It complements the project/export workflow tests; appearance is also reviewed visually.

## 5.0 — direct face studio

Start in **Forma direkt**, press **Börja forma ansiktet**, then drag the actual skin. The camera moves to the real face. Choose a frontal or profile view to control direction and depth; right-button or Alt-drag temporarily rotates. On a touch device one finger sculpts and two fingers navigate without leaving an accidental stroke.

- **Dra i huden** moves a soft, radius-based region; eyes and eyebrows participate, with each eye moved coherently rather than stretched into triangles.
- **Bygg volym / Tryck in** add or remove local volume along the surface normal.
- **Mjukna** smooths authored offsets without eroding the original head.
- **Måla hud** paints soft vertex colour on the actual skin. It retains the underlying source texture; it is not a full-resolution tattoo/texture-layer editor.
- **Sudda ändring** locally restores sculpt/paint. The global reset button clears free sculpt and paint, and itself has Undo.
- Symmetry starts on. Area and strength control the soft falloff. Each pointer stroke is one design-history step; incomplete two-finger gestures are cancelled.

The original skinned face is subdivided twice (sixteen times the original triangle count, over twenty thousand logical face points on the male rig) with interpolated UVs, normals and normalized bone weights. UV seams share position offsets. Skinning matrices map posed pointer hits back into bind space. Authored normal decisions are retained through a deformation-relative correction. Neck attachment vertices are protected. Displacements are capped at 6 cm to bound corrupted/extreme data. This is fixed-topology sculpting, not remeshing or arbitrary topology creation.

`PROJECT.json` stores `creative.sculpt.version = 1`, revision and separate male/female data. Each mesh has a topology signature, logical point count, sparse `[point, dx, dy, dz]` bind-space offsets and `[point, linearR, linearG, linearB, opacity]` paint. Wrong topology is rejected explicitly. The male and female bodies keep separate sculpt data. `PREVIEW.glb` contains the actual edited skinned vertex positions and colour attributes; `BASE_RIG.glb` remains unchanged. Original motion clips are retained. The finishing AI should use the actual sculpted preview, not recreate a generic face from preset labels.

Existing clothes, accessories, drawings, reference imports, projects and export tools remain available. Previously saved portrait annotations retain their legacy reference-camera framing. New portraits use the closer anatomical framing. Correctly fitted facial accessories can follow the revised face; manually moved accessories retain the user's transform.

### Scope and quality limits

Direct sculpt currently targets the existing male/female head, eyes and eyebrows. Body proportions remain available through the body controls; body/clothes topology and arbitrary imported GLBs are not directly sculpted. The original texture resolution and source model still limit visual detail. The editor does not automatically rebuild eyelids, teeth, facial expression rigs, realistic hair or cloth, nor prevent every self-intersection after extreme edits. Inspect front/profile views and all motions before game integration. Physical iPhone/Safari behaviour remains outside the Chromium touch-emulation certification.

The sculpt browser suite uses actual mouse and CDP touch events, verifies numerical geometry changes, symmetry/undo semantics, volume/smoothing/paint, two-finger cancellation, portable JSON and transactional reopen. It exports a ZIP, independently loads the GLB, compares its edited skin to a pristine actual source rig, checks vertex paint and renders an exported animation. The same suite runs against the published Pages site after merge. Screenshots are local review outputs, not uploaded CI artifacts.

## 5.1 — scanned portrait, fiber cards and draping

In **Färger & kropp → Material, hår & tygfall** choose the scanned portrait, enable thin hair strands, select a fabric and add an **Axelkappa** or **Öppen långväst**. Play an existing animation to preview secondary cloth motion. **Låt tyget falla** resets and settles the cloth. Settings survive Undo, autosave, named projects and portable JSON. Original defaults preserve existing designs. Original and scan sculpt data are stored separately (`male`, `female`, `scan-male`, `scan-female`).

The bundled photogrammetry asset is **Infinite, 3D Head Scan by Lee Perry-Smith / Infinite-Realities**, CC BY 3.0, via the Three.js **r180** examples. Original files and license are in `assets/scan/`. Studio adaptations: uniform scaling, removal of the shoulder bust, neck transition, Head/Neck weights and source UVs with photographic colour and tangent normal maps. The original game GLBs are unchanged. This is **one adult male portrait with closed eyes**, usable on the original two body rigs, **not a new full-body photorealistic model or facial expression rig**. Switching to the scan selects a bare scalp and neutral tint; hair and tint remain editable. Scalp sculpt and paint are supported; verify the neck, eyelids and all animations before production.

Fiber hair is a reproducible, seeded set of **1200 tapered curved ribbons** (350 for buzz), with a real RGBA strand mask, alpha cutout, double-sided normals and `KHR_materials_anisotropy` glTF material. A fitted scalp underlayer prevents gaps. Original solid hair styles remain available. This is hair-card rendering, **not strand-level simulation or an artist-authored groom**. Hair is Head-attached and requires intersection review for long styles/headgear.

Fabric presets **cotton / denim / silk / leather** set physical roughness, sheen and baked tangent-space weave normal maps as well as cloth compliance/damping. A local procedural PMREM studio environment provides reflections without network dependencies. The two extra garments use a fixed-step **1/120 s XPBD solver**, seven constraint iterations, structural, shear and two-hop bend distance constraints, Verlet inertia, gravity, wind, body bone capsule collisions and ground projection. Each garment has **425 particles** and kinematic upper pins. The original clothing weights are transferred from nearby vertices; simulated world positions are mapped back through inverse skin matrices, so the exported cloth remains skinned to the original rig. Work is bounded to six substeps/frame and the renderer retains its mobile pixel cap.

Limitations: no self collision, triangle-level continuous collision, sewing, tearing, arbitrary pattern drafting, sleeve simulation or automatic cloth physics on imported garments. Capsules approximate the body and may allow intersections after extreme edits. Cloth physics runs while preview animation plays. The settle action updates the visible drape; export settles in canonical Idle for matching reference images and preview. `PREVIEW.glb` includes the draped bind shape, original skin weights and original 13 motion clips, **not baked secondary cloth animation**. `CLOTH_SIMULATION.json` includes the solver version, timestep, iterations, material/wind settings, rest positions, pins, distance constraints and reference particles to reproduce or bake the simulation in a target engine. The export instruction explicitly requires this finishing step. `CLOTH_SOLVER.mjs` supplies the actual portable simulation source; the JSON also identifies Idle as the reference pose and records collision bone links/radii.

When the scan is used, export also includes `SCAN_SOURCE_LeePerrySmith.glb`, the original photographic colour/normal images and `SCAN_SOURCE_LeePerrySmith_License.txt`. Preserve attribution in derivative character packages. `MANIFEST.json` hashes all these files. The studio does not upload designs or fetch third-party assets at runtime.

`node character-design/realism-browser.mjs` tests real UI persistence and ZIP export on desktop/mobile viewports. An independent WebGL workbench verifies source maps, hair cards and mask, actual cloth displacement, capsule separation and finite simulation through all original animation poses. Exported GLB is independently parsed to check skinning, physical materials, maps, mask and anisotropy. The suite runs locally and against Pages. Physical Safari/iPhone testing remains unverified.
