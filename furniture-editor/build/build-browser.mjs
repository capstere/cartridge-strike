/** Authentic user-interaction smoke test of independent architectural sketch editor.
 * Chromium WebGL is exercised in CI; full FPS is not started or modified.
 */
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('../../frontline/source/tools/dev/node_modules/playwright-core');
const origin=process.env.FURNITURE_TEST_ORIGIN||'http://127.0.0.1:8765',out=resolve('test-results/build-studio');
await mkdir(out,{recursive:true});
const report={status:'RUNNING',checks:[],errors:[],external:[],httpFailures:[],screenshots:[]};
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--disable-gpu-sandbox']});
const context=await browser.newContext({viewport:{width:1512,height:920},deviceScaleFactor:1,acceptDownloads:true});
const page=await context.newPage();page.setDefaultTimeout(30000);
const check=(name,cond)=>{report.checks.push({name,pass:!!cond});console.log(name,cond?'PASS':'FAIL');if(!cond)throw Error(name);};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push('console:'+m.text());});
page.on('response',r=>{if(r.status()>=400)report.httpFailures.push({code:r.status(),url:r.url()});});
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(url);return route.abort();});
async function shot(name){await page.screenshot({path:resolve(out,name+'.png'),fullPage:true});report.screenshots.push(name+'.png');}
async function clickWorld(x,z){const at=await page.evaluate(v=>__furnitureEditor.screenWorldPoint(v.x,v.z),{x,z});
 assert(Number.isFinite(at.x)&&Number.isFinite(at.y));await page.mouse.click(at.x,at.y);}
try{
 await page.goto(origin+'/furniture-editor/',{waitUntil:'networkidle',timeout:45000});
 await page.waitForFunction(()=>window.__furnitureEditor?.build?.getEntries()?.length>380,{timeout:45000});
 const info=await page.evaluate(()=>__furnitureEditor.getState());
 check('standalone editor started with no FPS gameplay',info.chairs>=50&&!info.gameModuleLoaded);
 check('original game version and source unchanged',info.gameVersion==='0.17.0'&&info.sourceCommit==='7b99da56c9cc7f7e5bdbc626a174c8db9a9e33bc');
 check('actual WebGL rendering is present',await page.evaluate(()=>!!document.querySelector('#viewport').getContext('webgl2')));
 check('build mode button starts hidden architecture tools',await page.locator('#buildSidebar').isHidden()&&await page.locator('#modeBuild').isVisible());
 await page.locator('#modeBuild').click();
 check('build mode is active; furniture controls hidden',await page.evaluate(()=>__furnitureEditor.build.active)&&await page.locator('#buildSidebar').isVisible()&&await page.locator('#furnitureSidebar').isHidden());
 check('exact source walls and doors loaded as editable preview',await page.evaluate(()=>{const e=__furnitureEditor.build.getEntries();return e.some(x=>x.id==='WALL-001')&&e.some(x=>x.id==='D08')&&e.length>390}));
 await page.locator('#buildSearch').fill('WALL-001');await page.locator('.build-list-item').first().click();
 check('existing wall selected and endpoint coordinates populated',(await page.locator('#buildSelectionId').textContent())==='WALL-001'&&!!(await page.locator('#buildA_X').inputValue()));
 await page.locator('#buildKind').selectOption('window');
 check('source wall converted to window in SKETCH only',await page.evaluate(()=>__furnitureEditor.build.getEntries().find(e=>e.id==='WALL-001').kind==='window'));
 await page.locator('#buildSill').fill('1.12');await page.locator('#buildSill').press('Tab');
 const changed=await page.evaluate(()=>__furnitureEditor.getPatch());
 check('window kind and sill survive combined export',changed.architecture.edits.some(e=>e.id==='WALL-001'&&e.kind==='window'&&Math.abs(e.sill-1.12)<.001));
 await page.locator('#buildUndo').click();
 check('build undo restores earlier sill',await page.evaluate(()=>Math.abs(__furnitureEditor.build.getEntries().find(e=>e.id==='WALL-001').sill-.9)<.001));
 await page.locator('#buildRedo').click();
 check('build redo restores edited sill',await page.evaluate(()=>Math.abs(__furnitureEditor.build.getEntries().find(e=>e.id==='WALL-001').sill-1.12)<.001));
 await page.locator('#buildSearch').fill('');
 await page.locator('#buildRoom').selectOption('I09');await page.locator('#focus').click();
 await page.locator('#buildTool').selectOption('glazed');
 await clickWorld(8.2,12.4);await clickWorld(10.4,12.4);
 check('actual two pointer clicks draw new full-height glazed wall',await page.evaluate(()=>__furnitureEditor.getPatch().architecture.added.some(e=>e.kind==='glazed')));
 await shot('01-draw-glass-wall');
 await page.locator('#buildTool').selectOption('door');
 await clickWorld(9.1,12.4);await clickWorld(10.0,12.4);
 check('door tool produces separate door object',await page.evaluate(()=>__furnitureEditor.getPatch().architecture.added.some(e=>e.kind==='door')));
 await page.locator('#buildTool').selectOption('floor');
 await clickWorld(7.1,10.1);await clickWorld(8.2,11.2);
 check('rectangle floor painter persists a new floor region',await page.evaluate(()=>__furnitureEditor.getPatch().architecture.floors.length===1));
 check('save project button stays available in both modes',await page.locator('#downloadTop').isVisible());
 await page.locator('#threeView').click();
 await page.waitForTimeout(180);
 check('3D view uses same independent render state',await page.evaluate(()=>__furnitureEditor.getState().view==='3d'&&__furnitureEditor.build.active));
 await shot('02-build-3d');
 const [save]=await Promise.all([page.waitForEvent('download'),page.locator('#downloadTop').click()]);
 const saved=JSON.parse(await readFile(await save.path(),'utf8'));
 check('JSON project includes both furniture and architectural sketch',saved.format==='cartridge-strike-furniture-studio'&&saved.architecture?.schemaVersion===1&&saved.architecture.edits.length>0&&saved.architecture.added.length>=2&&saved.architecture.floors.length===1);
 check('export contains no proprietary workplace plan or hidden internal file',!JSON.stringify(saved).includes('Cepheid'));
 await page.reload({waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__furnitureEditor?.build?.getEntries()?.length>390);
 check('browser autosave restores walls, door and floor',await page.evaluate(()=>__furnitureEditor.getPatch().architecture.added.length>=2&&__furnitureEditor.getPatch().architecture.floors.length===1));
 const dlg=page.waitForEvent('dialog').then(d=>d.accept());await page.locator('#reset').click();await dlg;
 check('reset removes sketch without modifying original data',await page.evaluate(()=>{const p=__furnitureEditor.getPatch();return !p.architecture.edits.length&&!p.architecture.added.length&&!p.architecture.floors.length;}));
 await page.locator('#importFile').setInputFiles({name:'MyWholeDesign.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
 await page.waitForFunction(()=>__furnitureEditor.getPatch()?.architecture?.floors?.length===1);
 check('project can reopen previously saved windows, doors, floors and furniture',await page.evaluate(()=>__furnitureEditor.getPatch().architecture.edits.length>0&&__furnitureEditor.getPatch().architecture.added.length>=2));
 await page.locator('#modeBuild').click();
 await shot('03-imported-sketch');
 await page.locator('#modeFurniture').click();
 check('furniture mode still works after loading a building project',await page.locator('#furnitureSidebar').isVisible()&&await page.evaluate(()=>__furnitureEditor.getState().chairs>=50));
 check('no FPS boot, JS/shader errors, external resources or HTTP failures',!report.errors.length&&!report.httpFailures.length&&!report.external.length&&await page.evaluate(()=>!window.__fps));
 report.status='PASS';
}catch(e){report.status='FAIL';report.errors.push(e.stack||String(e));console.error(e);}
finally{await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');await context.close();await browser.close();}
if(report.status!=='PASS')process.exitCode=1;
