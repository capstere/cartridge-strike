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
