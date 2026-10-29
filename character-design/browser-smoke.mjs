/** Real Chromium + WebGL smoke. No screenshots/artifacts uploaded to Actions. */
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('../frontline/source/tools/dev/node_modules/playwright-core');
const origin=process.env.CHARACTER_TEST_ORIGIN||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--disable-gpu-sandbox']});
const errors=[];
const context=await browser.newContext({viewport:{width:1370,height:920},acceptDownloads:true});
const page=await context.newPage();page.setDefaultTimeout(35000);
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('dialog',d=>d.accept());
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(origin))errors.push('HTTP '+r.status()+' '+r.url());});
page.route('**/*',route=>{
 const url=route.request().url();
 if(url.startsWith(origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();
 errors.push('External request '+url);return route.abort();
});
const log=name=>console.log('PASS '+name);
try{
 await page.goto(origin+'/character-design/',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>document.getElementById('status').textContent.includes('redo!'),{timeout:45000});
 log('original skeleton loaded via in-game character-library');
 const sheet=await page.evaluate(()=>{
  const c=document.querySelector('[data-base="front"]');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let pixels=new Set();for(let y=120;y<580;y+=50)for(let x=120;x<360;x+=48){
   const i=4*(y*c.width+x);pixels.add(d[i]+','+d[i+1]+','+d[i+2]);
  }
  return pixels.size;
 });
 assert.ok(sheet>3,'front character preview is blank or uniform: '+sheet);
 log('four-angle 3D views contain rendered character pixels');
 await page.locator('[data-color="jacket"]').fill('#ed5566');
 await page.locator('[data-tab="parts"]').click();
 await page.locator('#part-type').selectOption('helmet');
 await page.locator('#add-part').click();
 assert.equal(await page.locator('.part-item').count(),1);
 await page.locator('#pos-x').fill('9');
 await page.locator('#part-note').fill('Make a soft helmet with fabric lining.');
 await page.locator('#pose').selectOption('Crouch_Idle_Loop');
 await page.locator('#play').click();
 await page.waitForTimeout(500);
 await page.locator('#play').click();
 log('palette, bone-attached 3D part, dimensions and real animation preview');
 const jsonDownload=page.waitForEvent('download');
 await page.locator('#save-json').click();
 const json=JSON.parse((await readFile(await (await jsonDownload).path())).toString());
 assert.equal(json.parts.length,1);assert.equal(json.parts[0].note,'Make a soft helmet with fabric lining.');
 assert.equal(json.base.original_glb,'quaternius-operator-male.glb');
 log('editable JSON project downloaded');
 const zipDownload=page.waitForEvent('download');
 await page.locator('#export-zip').click();
 const zipBytes=await readFile(await (await zipDownload).path());
 assert.equal(zipBytes.readUInt32LE(0),0x04034b50);
 for(const name of ['BASE_RIG.glb','ANIMATION_CONTRACT.json','STATIC_PROTOTYPE.glb','DESIGN_SHEET.png','AI_INSTRUCTIONS.md','PROJECT.json'])
  assert.ok(zipBytes.includes(Buffer.from(name)),name+' missing from ZIP');
 assert.ok(zipBytes.byteLength>100_000);
 log('self-contained AI ZIP contains original animated rig, geometry, orthographic sheet and handoff');
 await page.locator('[data-mode="object"]').click();
 await page.waitForFunction(()=>document.querySelector('#mode-label').textContent.includes('3D-objekt'));
 assert.equal(await page.locator('.part-item').count(),1);
 const glbDownload=page.waitForEvent('download');
 await page.locator('#save-glb').click();
 const glb=await readFile(await (await glbDownload).path());
 assert.equal(glb.readUInt32LE(0),0x46546c67);
 assert.equal(glb.readUInt32LE(4),2);
 log('standalone 3D-object mode exports an actual glTF 2.0 GLB');
 await page.locator('#open-project').click();
 await page.locator('#project-file').setInputFiles({name:'character.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(json))});
 await page.waitForFunction(()=>document.querySelector('#mode-label').textContent.includes('karaktär'));
 assert.equal(await page.locator('.part-item').count(),1);
 log('saved character JSON reopens correctly');
 assert.deepEqual(errors,[],'Browser exceptions or failed network requests');
 log('no browser errors or external requests');
}finally{await context.close();await browser.close();}
