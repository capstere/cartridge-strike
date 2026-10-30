import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=path=>readFileSync(join(root,path),'utf8');

test('one Studio hub links to working character and level editors without replacing the game',()=>{
 const html=source('studio/index.html');
 assert.match(html,/<html lang="sv">/);
 assert.match(html,/href="\.\.\/character-design\/"/);
 assert.match(html,/href="\.\.\/furniture-editor\/new\.html"/);
 assert.match(html,/href="\.\.\/furniture-editor\/new\.html\?mode=edit-floor5"/);
 assert.match(html,/href="\.\.\/fps\/"/);
 assert.match(html,/klassiska möbelstudion/i);
 assert.equal((html.match(/class="studio-card /g)||[]).length,2);
 assert.match(html,/ändrar <em>inte<\/em> automatiskt/i);
 for(const [,href] of html.matchAll(/href="([^"]+)"/g)){
  if(href.startsWith('data:')||href.startsWith('#'))continue;
  assert(!/^https?:/.test(href),'Hub must not load external dependencies');
  const path=resolve(root,'studio',decodeURIComponent(href.split(/[?#]/)[0]));
  assert(existsSync(href.split(/[?#]/)[0].endsWith('/')?join(path,'index.html'):path),
   'Broken Studio link: '+href);
 }
});

test('character workflow offers task-first navigation, accessible quiet mode and existing export',()=>{
 const html=source('character-design/index.html');
 const app=source('character-design/app.mjs');
 assert.match(html,/href="\.\.\/studio\/"/);
 for(const task of ['sculpt','fashion','face','parts','export'])
  assert(html.includes('data-jump="'+task+'"'),'Missing character task '+task);
 for(const id of ['focus-design','export-zip','save-slot','preview3d','jump-to-face'])
  assert(html.includes('id="'+id+'"'),'Missing character control '+id);
 assert.match(app,/function setupQuickStudio\(\)/);
 assert.match(app,/function setTab\(/);
 assert.match(app,/setupQuickStudio\(\);initDrawing/);
});

test('mobile level editor has a canvas-first task drawer and retains save/export',()=>{
 const html=source('furniture-editor/new.html');
 const code=source('furniture-editor/studio-ui.mjs');
 const css=source('furniture-editor/new.css');
 assert.match(html,/href="\.\.\/studio\/"/);
 for(const task of ['build','furnish','play'])
  assert(html.includes('data-mobile-tab="'+task+'"'),'Missing level task '+task);
 for(const id of ['plan','scene3d','save','quickSave','mobileSave','toolsPanel','savePanel','mobileBackdrop','closeTools','closeSave'])
  assert(html.includes('id="'+id+'"'),'Missing level control '+id);
 assert.match(code,/openSheet\(/);
 assert.match(code,/document\.querySelector\('\.tool-panel \[data-tab=/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/body\[data-studio-sheet="tools"\]/);
 assert.match(html,/studio-ui\.mjs/);
});


test('context furniture dock edits the actual model with real validation and undo actions',()=>{
 const html=source('furniture-editor/new.html'),code=source('furniture-editor/selection-dock.mjs'),editor=source('furniture-editor/new.mjs');
 for(const id of ['editDock','editDockName','editDockMessage','editDockReopen',
  'dockX','dockZ','dockWidth','dockDepth','dockHeight','dockCollision',
  'dockRotate','dockDuplicate','dockUndo','dockDelete'])
  assert(html.includes('id="'+id+'"'),'Missing contextual control '+id);
 assert.match(code,/dispatchEvent\(new Event\('change'/);
 assert.match(code,/onHeight\(value\)/);
 assert.match(editor,/installSelectionDock/);
 assert.match(editor,/selectionDock\.sync\(o/);
 assert.match(editor,/child\.elevation=/);
 assert.match(html,/src="new\.mjs\?v=4\.3\.0"/);
});

test('free building defaults to optional smart placement, with explicit diagnostics',()=>{
 const html=source('furniture-editor/new.html'),code=source('furniture-editor/new.mjs');
 const dock=source('furniture-editor/selection-dock.mjs');
 assert.match(html,/id="autoPlace"[^>]*checked/);
 assert.match(code,/findNearbyFreePlacement/);
 assert.match(code,/function easyFurniturePose/);
 assert.match(code,/Visa tekniska detaljer/);
 assert.match(dock,/const diagnostics=\$\('showPhysics'\).checked/);
});


test('four child-sized buttons expose a genuine one-click room and standard doorway workflow',()=>{
 const html=source('furniture-editor/new.html');
 const editor=source('furniture-editor/new.mjs');
 const ui=source('furniture-editor/studio-ui.mjs');
 const styles=source('furniture-editor/new.css');
 for(const id of ['kidRoom','kidFurnish','kidWalk','kidSave'])
  assert(html.includes('id="'+id+'"'),'Child-facing build button missing: '+id);
 for(const cat of ['all','stolar','bord','kok','dekor'])
  assert(html.includes('data-kid-category="'+cat+'"'));
 assert.match(editor,/function makeStarterRoom\(\)/);
 assert.match(editor,/planPaintOverWall\(arch\(\),bottom\.id/);
 assert.match(editor,/makeFloor\(\{x:x0,z:z0\},\{x:x1,z:z1\},'room'\)/);
 assert.match(editor,/commit\(before\)/);
 assert.match(editor,/zoom=clamp\(Math\.max\(/);
 assert.match(ui,/category\.dispatchEvent\(new Event\('change'/);
 assert.match(styles,/\.kid-steps button/);
 assert.match(styles,/@media\(max-width:700px\)/);
});

test('a ten-year-old can choose a side for an adjoining room, without losing precise room drawing',()=>{
 const html=source('furniture-editor/new.html');
 const js=source('furniture-editor/new.mjs');
 const planner=source('furniture-editor/adjacent-room.mjs');
 const css=source('furniture-editor/new.css');
 for(const id of ['roomChoices','roomChoiceHint','roomChoiceClose','roomDrawCustom'])
  assert(html.includes('id="'+id+'"'),'Room picker missing: '+id);
 for(const side of ['above','right','below','left'])
  assert(html.includes('data-room-side="'+side+'"'),'Room side missing: '+side);
 assert.match(js,/function makeAdjacentRoom\(side\)/);
 assert.match(js,/planPaintOverWall\(arch\(\),shared\.id,plan\.doorStart,plan\.doorEnd,'door'/);
 assert.match(js,/function startCustomRoom\(\)/);
 assert.match(planner,/export function planAdjacentRoom\(/);
 assert.match(css,/\.room-choice-grid button/);
});

test('Sims wall arrows are offered only for safe edges, and both 2D/3D use the same room resize plan',()=>{
 const html=source('furniture-editor/new.html');
 const editor=source('furniture-editor/new.mjs');
 const planner=source('furniture-editor/build/direct-manipulation.mjs');
 for(const label of ['gröna pilarna','orange hörnen'])assert(html.includes(label));
 assert.match(editor,/function allowedEdgeHandles\(f\)/);
 assert.match(editor,/planResizeFloorEdge\(info\.initialFloor/);
 assert.match(editor,/handle\.startsWith\('edge-'\)/);
 assert.match(editor,/ctx\.arc\(x,z,14\*dpr/);
 assert.match(editor,/mesh\.userData\.editHandle=handle/);
 assert.match(editor,/parsePosters\(p\(\)\.architecture\.posters\|\|\[\],result\.entries\)/);
 assert.match(planner,/export function planResizeFloorEdge\(/);
});
