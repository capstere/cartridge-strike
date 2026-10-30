/** Smoke for the human workflow, not only the schema. Uses real Chromium/WebGL. */
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('../frontline/source/tools/dev/node_modules/playwright-core');
const origin=process.env.FPS_TEST_ORIGIN||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
 '--ignore-gpu-blocklist','--no-sandbox'
]});
const errors=[];
const track=page=>page.on('pageerror',e=>errors.push(e.message));

try{
 const desktop=await browser.newContext({viewport:{width:1360,height:880}});
 const hub=await desktop.newPage();track(hub);
 assert.equal((await hub.goto(origin+'/studio/')).status(),200);
 assert.equal(await hub.locator('.studio-card').count(),2);
 assert.equal(await hub.locator('.card-link').count(),2);
 assert.equal(await hub.locator('.secondary-links a').count(),2);
 assert((await hub.locator('a[href="../character-design/"]').count())>=1);
 assert((await hub.locator('a[href="../furniture-editor/new.html"]').count())>=1);
 await hub.close();

 const level=await desktop.newPage();track(level);
 await level.goto(origin+'/furniture-editor/new.html?test=1',{waitUntil:'domcontentloaded'});
 await level.waitForFunction(()=>!!window.__levelStudio,{timeout:90000});
 assert(await level.locator('#savePanel').isVisible(),'Desktop save panel initially visible');
 await level.locator('#stageFocus').click();
 assert.equal(await level.locator('#stageFocus').getAttribute('aria-pressed'),'true');
 assert(await level.locator('#savePanel').isHidden(),'Wide desktop scene removes clutter');
 assert(await level.locator('#quickSave').isVisible(),'ZIP save stays reachable');
 await level.locator('#stageFocus').click();
 assert(await level.locator('#savePanel').isVisible(),'Desktop inspector can return');

 // User journey: select a real room object, change 3 different visible attributes,
 // undo a change, autosave and reopen without touching project JSON by hand.
 await level.locator('#demo').click();
 await level.waitForFunction(()=>__levelStudio.project.furniture.added.some(o=>o.id==='NY-BORD-0001'));
 await level.evaluate(()=>__levelStudio.select('NY-BORD-0001'));
 await level.locator('#editDock').waitFor({state:'visible'});
 assert.match(await level.locator('#editDockName').textContent(),/bord|table/i);
 await level.locator('#dockWidth').fill('1.65');
 await level.locator('#dockWidth').dispatchEvent('change');
 assert.equal(await level.evaluate(()=>__levelStudio.project.furniture.added.find(o=>o.id==='NY-BORD-0001').w),1.65);
 await level.locator('#dockHeight').fill('1.15');
 await level.locator('#dockHeight').dispatchEvent('change');
 assert.equal(await level.evaluate(()=>__levelStudio.project.furniture.added.find(o=>o.id==='NY-BORD-0001').height),1.15);
 await level.locator('#dockCollision').selectOption('none');
 assert.equal(await level.evaluate(()=>__levelStudio.project.furniture.added.find(o=>o.id==='NY-BORD-0001').collision),'none');
 const oldYaw=await level.evaluate(()=>__levelStudio.project.furniture.added.find(o=>o.id==='NY-BORD-0001').yaw);
 await level.locator('#dockRotate').click();
 assert.notEqual(await level.evaluate(()=>__levelStudio.project.furniture.added.find(o=>o.id==='NY-BORD-0001').yaw),oldYaw);
 await level.locator('#dockUndo').click();
 assert.equal(await level.evaluate(()=>__levelStudio.project.furniture.added.find(o=>o.id==='NY-BORD-0001').yaw),oldYaw);
 await level.locator('#editDockClose').click();
 assert(await level.locator('#editDock').isHidden());
 await level.locator('#editDockReopen').click();
 assert(await level.locator('#editDock').isVisible(),'Object editing reopens on demand');
 await level.locator('[data-tab="furnish"]').click();
 await level.locator('#catalogCards [data-asset="studio:orange-kitchen-chair"]').click();
 await level.locator('#editDock').waitFor({state:'hidden',timeout:5000});
 await level.reload({waitUntil:'domcontentloaded'});
 await level.waitForFunction(()=>!!window.__levelStudio?.project?.furniture?.added?.length);
 const saved=await level.evaluate(()=>__levelStudio.project.furniture.added.find(o=>o.id==='NY-BORD-0001'));
 assert(saved && saved.w===1.65 && saved.height===1.15 && saved.collision==='none',
   'Inspector changes survive autosave and reload');
 await level.close();await desktop.close();

 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const phone=await mobile.newPage();track(phone);
 await phone.goto(origin+'/furniture-editor/new.html?test=1',{waitUntil:'domcontentloaded'});
 await phone.waitForFunction(()=>!!window.__levelStudio,{timeout:90000});
 const workBox=await phone.locator('.workspace').boundingBox();
 assert(workBox&&workBox.y<220,'Mobile scene should appear before all edit controls');
 assert(await phone.locator('#toolsPanel').isHidden(),'Mobile tools start hidden');
 await phone.locator('[data-mobile-tab="furnish"]').click();
 assert.equal(await phone.locator('body').getAttribute('data-studio-sheet'),'tools');
 assert(await phone.locator('#toolsPanel').isVisible(),'Furniture drawer opens');
 assert((await phone.locator('.tool-panel [data-tab="furnish"]').getAttribute('class')).includes('active'));
 await phone.locator('#catalogSearch').fill('vortex');
 await phone.locator('#catalogCards .catalog-card').first().click();
 assert.equal(await phone.locator('body').getAttribute('data-studio-sheet'),'none','Model selection closes the tool drawer');
 await phone.locator('#toolsPanel').waitFor({state:'hidden',timeout:5000});
 await phone.locator('#mobileSave').click();
 assert.equal(await phone.locator('body').getAttribute('data-studio-sheet'),'checks','Save button activates project panel');
 await phone.locator('#savePanel').waitFor({state:'visible',timeout:5000});
 assert(await phone.locator('#save').isVisible());
 await phone.locator('#closeSave').click();
 await phone.locator('#savePanel').waitFor({state:'hidden',timeout:5000});
 await phone.locator('#mobileSave').click();
 await phone.locator('#demo').click();
 await phone.waitForFunction(()=>__levelStudio.project.furniture.added.some(o=>o.id==='NY-STOL-0001'));
 await phone.locator('#closeSave').click();
 await phone.locator('#savePanel').waitFor({state:'hidden',timeout:5000});
 await phone.evaluate(()=>__levelStudio.select('NY-STOL-0001'));
 await phone.locator('#editDock').waitFor({state:'visible',timeout:5000});
 const dockRect=await phone.locator('#editDock').boundingBox();
 assert(dockRect && dockRect.x>=0 && dockRect.x+dockRect.width<=395,'Context inspector fits on phone');
 await phone.locator('#dockWidth').fill('0.7');
 await phone.locator('#dockWidth').dispatchEvent('change');
 assert.equal(await phone.evaluate(()=>__levelStudio.project.furniture.added.find(o=>o.id==='NY-STOL-0001').w),0.7);
 await phone.locator('#editDockClose').click();
 await phone.locator('#editDockReopen').click();
 await phone.locator('#editDock').waitFor({state:'visible',timeout:5000});
 await phone.close();

 const character=await mobile.newPage();track(character);
 await character.goto(origin+'/character-design/',{waitUntil:'load',timeout:90000});
 await character.locator('#focus-design').click();
 assert.equal(await character.locator('#focus-design').getAttribute('aria-pressed'),'true');
 assert(await character.locator('.setup').isHidden(),'Focus mode hides setup');
 await character.locator('.quick-jobs [data-jump="fashion"]').click();
 assert(await character.locator('#tab-fashion').isVisible(),'Task chip opens working clothes controls');
 assert.equal(await character.locator('[data-tab="fashion"]').getAttribute('aria-selected'),'true');
 await character.locator('.quick-jobs [data-jump="export"]').click();
 assert(await character.locator('#export-zip').isVisible(),'AI package remains accessible in quiet mode');
 await character.locator('#focus-design').click();
 assert(await character.locator('.setup').isVisible(),'Full controls can be restored');
 await mobile.close();

 assert.deepEqual(errors,[],'No page-level exceptions in Studio navigation');
 console.log(JSON.stringify({status:'PASS',hub:true,wideScene:true,mobileDrawers:true,
   contextualFurniture:true,autosaveAndUndo:true,characterTaskShortcuts:true,consoleErrors:errors.length}));
}finally{await browser.close();}
