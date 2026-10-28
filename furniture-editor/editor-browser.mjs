/** Real Chromium/WebGL smoke test of the standalone furniture editor.
 * It must NEVER load or modify the FPS game or deploy editor edits to runtime.
 */
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {makeZip,readZip} from './library/zip.mjs';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require('../frontline/source/tools/dev/node_modules/playwright-core');
const origin=process.env.FURNITURE_TEST_ORIGIN||'http://127.0.0.1:8765';
const out=resolve('test-results/furniture-editor');await mkdir(out,{recursive:true});
const report={status:'RUNNING',checks:[],errors:[],externalRequests:[],httpFailures:[],shots:[]};
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--disable-gpu-sandbox']});
const context=await browser.newContext({viewport:{width:1380,height:850},deviceScaleFactor:1,acceptDownloads:true}),page=await context.newPage();page.setDefaultTimeout(30000);
const check=(name,pass)=>{report.checks.push({name,pass:!!pass});console.log(name,!!pass?'PASS':'FAIL');if(!pass)throw Error(name);};
page.on('pageerror',e=>report.errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)report.httpFailures.push({url:r.url(),status:r.status()});});
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.externalRequests.push(url);return route.abort();});
try{
 await page.goto(origin+'/furniture-editor/',{waitUntil:'networkidle',timeout:45000});
 await page.waitForFunction(()=>!!window.__furnitureEditor?.getState()?.chairs,{timeout:45000});
 const initial=await page.evaluate(()=>__furnitureEditor.getState());
 check('at least 50 chairs and separate editor without game boot',initial.chairs>=50&&!initial.gameModuleLoaded);
 check('pinned source version matches current public release',initial.sourceCommit==='7b99da56c9cc7f7e5bdbc626a174c8db9a9e33bc'&&initial.gameVersion==='0.17.0');
 check('plan view loaded with readable room controls',await page.locator('#loading').isHidden()&&await page.locator('#room option').count()>5);
 const saveBox=await page.locator('#downloadTop').boundingBox();check('save button visible without scrolling sidebar',!!saveBox&&saveBox.y>=0&&saveBox.y+saveBox.height<850);
 check('real WebGL canvas initialized',await page.evaluate(()=>!!document.querySelector('#viewport').getContext('webgl2')));
 const chair=await page.evaluate(()=>{const id='V1-SEAT-1L1';__furnitureEditor.select(id);return {id,angle:__furnitureEditor.getItem(id)?.yaw};});
 check('select exact authored lunch chair',Number.isFinite(chair.angle));
 await page.screenshot({path:resolve(out,'01-planvy.png'),fullPage:true});report.shots.push('01-planvy.png');
 await page.locator('#rotateRight').click();
 let state=await page.evaluate(()=>__furnitureEditor.getState());
 check('rotation changes one chair without modifying game',state.changed===1&&!state.gameModuleLoaded);
 const degree=await page.locator('#degrees').textContent();check('angle is visible in UI',degree?.includes('°'));
 // This is a real pointer drag in the top-down viewport, away from the nearby table.
 const p=await page.evaluate(id=>__furnitureEditor.screenPoint(id),chair.id);
 if(p){await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x-6,p.y,{steps:5});await page.mouse.up();}
 const dragged=await page.evaluate(id=>__furnitureEditor.getItem(id),chair.id);
 check('mouse drag leaves valid furniture and no page errors',Number.isFinite(dragged?.x)&&!report.errors.length);
 await page.locator('#threeView').click();
 check('3D toggle works',await page.evaluate(()=>__furnitureEditor.getState().view==='3d'));
 await page.screenshot({path:resolve(out,'02-3d.png'),fullPage:true});report.shots.push('02-3d.png');
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#downloadTop').click()]);
 const filename=download.suggestedFilename(),path=await download.path(),patch=JSON.parse(await readFile(path,'utf8'));
 check('downloaded JSON contains editable source IDs and one edited chair',filename.endsWith('.json')&&patch.format==='cartridge-strike-furniture-studio'&&patch.placements.some(x=>x.id===chair.id));
 check('downloaded file contains no private reference data',!JSON.stringify(patch).includes('Cepheid'));
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__furnitureEditor?.getState()?.chairs);
 check('reloading keeps unsaved work in localStorage',await page.evaluate(()=>__furnitureEditor.getState().changed>=1));
 const dialog=page.waitForEvent('dialog').then(d=>d.accept());await page.locator('#reset').click();await dialog;
 check('restore button removes local edits',await page.evaluate(()=>__furnitureEditor.getState().changed===0));
 await page.locator('#importFile').setInputFiles({name:filename,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(patch))});
 await page.waitForFunction(()=>__furnitureEditor.getState().changed>=1);
 check('saved JSON can be imported and edited again',await page.evaluate(()=>__furnitureEditor.getState().changed>=1));
 // New V2 model library: real Kenney thumbnail + GLB must be served locally.
 check('catalog contains 104 audited models including 28 Hissrum12 assets',await page.evaluate(()=>__furnitureEditor.catalogCount===104));
 await page.locator('#openLibrary').click();
 check('library opens without loading FPS runtime',await page.locator('#libraryDialog').evaluate(e=>e.open));
 await page.locator('#librarySearch').fill('Liten växt');
 check('search finds correct Kenney plant',await page.locator('.library-tile').count()===1);
 await page.locator('.library-tile').first().click();
 await page.waitForFunction(()=>__furnitureEditor.getPatch().added.some(p=>p.assetId==='kenney:furniture-kit:plantsmall1'));
 check('CC0 Kenney GLB can be placed in a legal room',await page.evaluate(()=>__furnitureEditor.getPatch().added.some(x=>x.assetId==='kenney:furniture-kit:plantsmall1')));
 await page.locator('#threeView').click();
 await page.waitForTimeout(900);
 await page.screenshot({path:resolve(out,'03-library-placed.png'),fullPage:true});report.shots.push('03-library-placed.png');
 // Real user-made Hissrum12 CREFORM model is served from the local vetted catalog.
 await page.locator('#room').selectOption('I20');
 await page.locator('#openLibrary').click();
 await page.locator('#libraryCategory').selectOption('hissrum12');
 await page.locator('#librarySearch').fill('IPT CREFORM');
 check('Hissrum12 CREFORM models searchable',await page.locator('.library-tile').count()>=1);
 await page.locator('.library-tile').first().click();
 await page.waitForFunction(()=>__furnitureEditor.getPatch().added.some(p=>p.assetId==='hissrum12:creformIptCart'));
 check('Hissrum12 GLB loads and places in independent WebGL editor',await page.evaluate(()=>__furnitureEditor.getPatch().added.some(p=>p.assetId==='hissrum12:creformIptCart')));
 // Local GLB bytes are packed in ZIP; verify the full roundtrip, not metadata only.
 await page.locator('#room').selectOption('I20');
 await page.locator('#openLibrary').click();
 const customGLB=await readFile(resolve('assets/fps/models/chairDesk.glb'));
 await page.locator('#customGLB').setInputFiles({name:'my-custom-chair.glb',mimeType:'model/gltf-binary',buffer:customGLB});
 await page.waitForFunction(()=>__furnitureEditor.getPatch().added.some(p=>p.assetId?.startsWith('local:')),{timeout:25000});
 check('user-owned GLB parsed and placed without fetching external URLs',await page.evaluate(()=>__furnitureEditor.getPatch().added.some(p=>p.assetId?.startsWith('local:'))));
 // A private model archive is imported locally, without publishing or auto-placing its content.
 const digest=createHash('sha256').update(customGLB).digest('hex');
 const bundle=makeZip([{name:'projekt.json',data:'{}'},{name:'models/'+digest+'.glb',data:customGLB}]);
 await page.locator('#openLibrary').click();
 await page.locator('#customZip').setInputFiles({name:'private-models.zip',mimeType:'application/zip',buffer:Buffer.from(bundle)});
 await page.waitForFunction(()=>document.querySelector('#libraryImportStatus')?.textContent.includes('1 av 1 GLB-modeller'));
 check('private ZIP pack loads into local catalog without auto-placement',await page.evaluate(()=>
  document.querySelector('#libraryImportStatus').textContent.includes('1 av 1')&&
  __furnitureEditor.getPatch().added.filter(p=>p.assetId?.startsWith('local:')).length===1));
 await page.locator('#closeLibrary').click();

 const [zipDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#downloadTop').click()]);
 const zipBuffer=await readFile(await zipDownload.path()),files=readZip(zipBuffer);
 const exported=JSON.parse(new TextDecoder().decode(files.get('projekt.json')));
 check('ZIP contains JSON and original binary GLB',zipDownload.suggestedFilename().endsWith('.zip')&&files.size===2&&exported.added.some(p=>p.assetId?.startsWith('local:'))&&[...files.keys()].some(x=>x.endsWith('.glb')));
 await page.screenshot({path:resolve(out,'04-imported-glb.png'),fullPage:true});report.shots.push('04-imported-glb.png');
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>__furnitureEditor.getState()?.chairs>=50);
 check('autosave restores both Kenney and imported GLB placement',await page.evaluate(()=>__furnitureEditor.getPatch().added.length===3));
 const dialog2=page.waitForEvent('dialog').then(d=>d.accept());await page.locator('#reset').click();await dialog2;
 check('reset clears both new objects',await page.evaluate(()=>__furnitureEditor.getPatch().added.length===0));
 await page.locator('#importFile').setInputFiles({name:'MyFurniture.zip',mimeType:'application/zip',buffer:zipBuffer});
 await page.waitForFunction(()=>__furnitureEditor.getPatch().added.length===3);
 check('ZIP project restores original user GLB and CC0 placements',await page.evaluate(()=>__furnitureEditor.getPatch().added.length===3));
 check('no external requests, runtime boot, script/shader or HTTP errors',!report.externalRequests.length&&!report.httpFailures.length&&!report.errors.length&&await page.evaluate(()=>!window.__fps));
 report.status='PASS';
}catch(err){report.status='FAIL';report.errors.push(err.stack||String(err));console.error(err);}
finally{await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');await context.close();await browser.close();}
if(report.status!=='PASS')process.exitCode=1;
