/** Browser regression: opaque window curtains, reversible side and patterned surfaces.
 * Uses genuine pointer events, studio selection, ZIP and FPS walk renderer.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require('../frontline/source/tools/dev/node_modules/playwright-core');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:970},acceptDownloads:true});
const page=await context.newPage(),errors=[];
page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
const origin=process.env.FPS_TEST_ORIGIN||'http://127.0.0.1:8765';
try {
 for(const mode of ['new-level','edit-floor5']){
  await page.goto(origin+'/furniture-editor/new.html?test=1'+(mode==='edit-floor5'?'&mode=edit-floor5':''));
  await page.waitForFunction(()=>!!window.__levelStudio);
  if(mode==='new-level')await page.locator('#kidRoom').click();
  const get=()=>page.evaluate(()=>structuredClone(__levelStudio.project));
  const floorId=mode==='new-level'?(await page.evaluate(()=>__levelStudio.project.ground.floors[0].id)):'I25';
  await page.evaluate(id=>__levelStudio.select(id),floorId);
  await page.locator('#selection details summary').click();
  for(const finish of ['dark-tile','dark-gloss-laminate','dark-large-stone']){
   await page.locator('#selectedSurface').selectOption(finish);
   assert.equal((await get()).floorFinishes[floorId],finish);
   assert.equal(await page.evaluate(id=>__levelStudio.scene.floors.find(f=>f.id===id)?.surface,floorId),finish);
  }
  const wallId=await page.evaluate(()=>__levelStudio.scene.entries.find(w=>w.kind==='wall'&&!w.deleted)?.id);
  assert(wallId,'A solid wall must be available for tile finishing');
  await page.evaluate(id=>__levelStudio.select(id),wallId);
  await page.locator('#wallPattern').selectOption('white-tile-gray-grout');
  assert.equal((await get()).surfaceMaterials[wallId],'white-tile-gray-grout');
  // Use an existing glass surface in Floor 5 and a newly created window in new-level.
  if(mode==='new-level'){
   await page.locator('[data-tool="window"]').click();
   const wall=await page.evaluate(id=>__levelStudio.scene.entries.find(e=>e.id===id),wallId);
   const mid=[(wall.a[0]+wall.b[0])/2,(wall.a[1]+wall.b[1])/2];
   const point=await page.evaluate(v=>__levelStudio.screenWorldPoint(...v),mid);
   await page.mouse.click(point.x,point.y);
  }
  const pane=await page.evaluate(()=>__levelStudio.scene.entries.find(w=>['window','glazed'].includes(w.kind)&&!w.deleted&&Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])>.45));
  assert(pane,'Expected a window or glass wall for the curtain');
  await page.locator('#tool').selectOption('curtain');
  const mid=[(pane.a[0]+pane.b[0])/2,(pane.a[1]+pane.b[1])/2];
  const point=await page.evaluate(v=>__levelStudio.screenWorldPoint(...v),mid);
  await page.mouse.click(point.x,point.y);
  let project=await get(),curtain=project.architecture.treatments.at(-1);
  assert.equal(curtain?.type,'curtain');
  assert.equal(curtain.style,'white-opaque');
  assert.equal(curtain.wallId,pane.id);
  await page.evaluate(id=>__levelStudio.select(id),curtain.id);
  await page.locator('#curtainFlip').click();
  assert.equal((await get()).architecture.treatments.at(-1).side,-curtain.side);
  await page.locator('#curtainStyle').selectOption('sheer');
  assert.equal((await get()).architecture.treatments.at(-1).style,'sheer');
  await page.locator('#curtainStyle').selectOption('white-opaque');
  const before=await get();
  const downloaded=page.waitForEvent('download');await page.locator('#save').click();
  const buf=readFileSync(await (await downloaded).path());
  await page.locator('#open').setInputFiles({name:'floor5-materials.zip',mimeType:'application/zip',buffer:buf});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Projektet öppnat'));
  assert.deepEqual(await get(),before);
  await page.locator('#threeView').click();
  await page.locator('#walkView').click();
  await page.waitForFunction(()=>!!document.querySelector('#walkFrame').contentWindow.__walk?.renderer?.scene,{timeout:90000});
  const frame=page.frames().find(f=>f.url().includes('/fps/walk.html'));
  assert(frame);
  const render=await frame.evaluate(()=>({
   patterns:Array.from(__walk.renderer.floor5PatternMaterials?.keys()||[]),
   decorations:__walk.world.project.architecture.treatments.length
  }));
  assert(render.patterns.includes('dark-large-stone'),'FPS should use authored dark stone');
  assert(render.decorations>=1);
  assert.deepEqual(errors,[]);
  console.log('Floor 5 curtain and finishes PASS',mode);
 }
}finally{await browser.close();}
