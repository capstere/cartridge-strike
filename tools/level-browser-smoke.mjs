/** Full browser path: editor mouse input, ZIP, private FPS, published demo, Floor 5. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('../frontline/source/tools/dev/node_modules/playwright-core');
const origin=process.env.FPS_TEST_ORIGIN||'http://127.0.0.1:8765',errors=[];
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true});
const page=await context.newPage();page.setDefaultTimeout(240000);
const track=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};track(page);
try{
 await page.goto(origin+'/furniture-editor/new.html');await page.waitForFunction(()=>!!window.__levelStudio);
 assert.equal(await page.evaluate(()=>__levelStudio.project.ground.floors.length),0);
 await page.locator('#tool').selectOption('room');
 for(const [x,z] of [[2,2],[8,8]]){const s=await page.evaluate(([x,z])=>__levelStudio.screenWorldPoint(x,z),[x,z]);await page.mouse.click(s.x,s.y);}
 assert.equal(await page.evaluate(()=>__levelStudio.project.ground.floors.length),1);
 assert.equal(await page.evaluate(()=>__levelStudio.project.architecture.added.length),4);
 await page.locator('[data-tool="door"]').click();
 let at=await page.evaluate(()=>__levelStudio.screenWorldPoint(5,2));await page.mouse.click(at.x,at.y);
 assert.equal(await page.evaluate(()=>__levelStudio.project.architecture.added.filter(e=>e.kind==='door').length),1);
 await page.locator('[data-tool="window"]').click();at=await page.evaluate(()=>__levelStudio.screenWorldPoint(8,5));await page.mouse.click(at.x,at.y);
 assert.equal(await page.evaluate(()=>__levelStudio.project.architecture.added.filter(e=>e.kind==='window').length),1);
 await page.locator('[data-tab="furnish"]').click();await page.locator('#placeFurniture').click();
 at=await page.evaluate(()=>__levelStudio.screenWorldPoint(5,5));await page.mouse.click(at.x,at.y);
 assert.equal(await page.evaluate(()=>__levelStudio.project.furniture.added.length),1);
 await page.keyboard.press('Escape');await page.locator('#undo').click();assert.equal(await page.evaluate(()=>__levelStudio.project.furniture.added.length),0);
 await page.locator('#redo').click();assert.equal(await page.evaluate(()=>__levelStudio.project.furniture.added.length),1);
 await page.locator('#duplicate').click();at=await page.evaluate(()=>__levelStudio.screenWorldPoint(6.8,6.8));await page.mouse.click(at.x,at.y);await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>__levelStudio.project.furniture.added.length),2);
 await page.locator('[data-tab="build"]').click();await page.locator('#tool').selectOption('poster');at=await page.evaluate(()=>__levelStudio.screenWorldPoint(3,2));await page.mouse.click(at.x,at.y);
 await page.locator('#posterText').fill('Syntetisk bana');await page.locator('#posterText').dispatchEvent('change');
 assert.equal(await page.evaluate(()=>__levelStudio.project.architecture.posters[0].text),'Syntetisk bana');
 await page.locator('#tool').selectOption('curtain');at=await page.evaluate(()=>__levelStudio.screenWorldPoint(2,5));await page.mouse.click(at.x,at.y);
 await page.locator('#tool').selectOption('blind');at=await page.evaluate(()=>__levelStudio.screenWorldPoint(8,5));await page.mouse.click(at.x,at.y);
 assert.equal(await page.evaluate(()=>__levelStudio.project.architecture.treatments.length),2);


 await page.locator('#threeView').click();assert(await page.locator('#scene3d').isVisible());
 await page.locator('#planView').click();await page.locator('#demo').click();
 await page.locator('#check').click();assert.match(await page.locator('#results').innerText(),/SPELBAR I MOTORN/);
 const download=page.waitForEvent('download');await page.locator('#save').click();const file=await download;
 assert(file.suggestedFilename().endsWith('.zip'));const bytes=readFileSync(await file.path());
 await page.locator('#open').setInputFiles({name:'project.zip',mimeType:'application/zip',buffer:bytes});
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Projektet öppnat'));
 assert.equal(await page.evaluate(()=>__levelStudio.project.gameplay.spawns.length),10);
 const popup=page.waitForEvent('popup');await page.locator('#preview').click();const privatePage=await popup;track(privatePage);
 await privatePage.goto(origin+'/fps/?level=preview&test=1');
 await privatePage.waitForFunction(()=>window.__fps||!document.querySelector('#fatal').hidden);
 assert(await privatePage.locator('#fatal').isHidden(),await privatePage.locator('#fatal').innerText());
 assert.equal(await privatePage.evaluate(()=>__fps.world.data.rooms.length),2);
 await privatePage.evaluate(()=>{__fps.start('analysts',{mode:'endless',botFire:false,wanderers:false});for(let i=0;i<30;i++)__fps.step(null,1/60);});
 assert.equal(await privatePage.evaluate(()=>__fps.game.actors.length),10);
 console.log('Private preview: loaded synthetic world and simulated 10 actors PASS');
 // Reject malicious/corrupt import before closing the editor's WebGL renderer.
 await page.locator('#open').setInputFiles({name:'bad.zip',mimeType:'application/zip',buffer:Buffer.from('bad zip')});
 assert.match(await page.locator('#status').innerText(),/Kunde inte öppna/);
 page.once('dialog',dialog=>dialog.accept());await page.locator('#newBlank').click();
 assert.equal(await page.evaluate(()=>__levelStudio.project.ground.floors.length),0);
 assert.equal(await page.evaluate(()=>__levelStudio.project.architecture.added.length),0);
 await page.locator('#undo').click();
 assert.equal(await page.evaluate(()=>__levelStudio.project.gameplay.spawns.length),10);
 console.log('Blank-world reset and undo PASS');
 // SwiftShader has a strict concurrent WebGL budget in headless CI. Verify each
 // full scene sequentially, without weakening any original journey assertions.
 await privatePage.close();await page.close();
 console.log('Editor and private preview closed; opening the published level in a fresh WebGL context');
 const published=await context.newPage();track(published);
 const publishedRequests=[];published.on('requestfailed',req=>publishedRequests.push(req.url()+': '+req.failure()?.errorText));
 await published.goto(origin+'/fps/?level=synthetic-demo&test=1',{waitUntil:'domcontentloaded'});
 console.log('Published demo DOM loaded');
 try{await published.waitForFunction(()=>window.__fps||!document.querySelector('#fatal').hidden,null,{timeout:90000});}
 catch(err){const diagnostic=await published.evaluate(()=>({loading:document.querySelector('#loading')?.textContent,fatal:document.querySelector('#fatal pre')?.textContent,ready:!!window.__fps})).catch(()=>null);
  throw Error('Published demo did not boot: '+JSON.stringify({diagnostic,publishedRequests,errors,original:String(err)}));}
 assert(await published.locator('#fatal').isHidden(),await published.locator('#fatal').innerText());
 assert.equal(await published.evaluate(()=>__fps.world.data.__custom),true);
 assert.equal(await published.evaluate(()=>__fps.world.data.corridors.length),1);
 console.log('Published synthetic demo booted in Chromium/WebGL PASS');
 await published.close();
 const unsafe=await context.newPage();await unsafe.goto(origin+'/fps/?level=..%2F..%2Fsecret&test=1',{waitUntil:'domcontentloaded'});await unsafe.waitForFunction(()=>!document.querySelector('#fatal').hidden);assert.match(await unsafe.locator('#fatal').innerText(),/Ogiltigt nivå-ID/);await unsafe.close();
 const old=await context.newPage();track(old);await old.goto(origin+'/fps/?test=1',{waitUntil:'domcontentloaded'});await old.waitForFunction(()=>window.__fps||!document.querySelector('#fatal').hidden);
 assert(await old.locator('#fatal').isHidden(),await old.locator('#fatal').innerText());assert.equal(await old.evaluate(()=>__fps.world.data.__custom),undefined);
 await old.close();
 const edit=await context.newPage();track(edit);await edit.goto(origin+'/furniture-editor/new.html?mode=edit-floor5',{waitUntil:'domcontentloaded'});
 await edit.waitForFunction(()=>!!window.__levelStudio);
 assert.equal(await edit.evaluate(()=>__levelStudio.project.mode),'edit-floor5');
 assert.equal(await edit.evaluate(()=>__levelStudio.project.gameplay.spawns.length),10);
 await edit.locator('#check').click();assert.match(await edit.locator('#results').innerText(),/SPELBAR I MOTORN/);
 const target=await edit.evaluate(()=>{const o=__levelStudio.scene.items[0];return {...__levelStudio.screenWorldPoint(o.x,o.z),id:o.id};});
 await edit.locator('[data-tool="select"]').click();await edit.mouse.click(target.x,target.y);await edit.locator('#remove').click();
 assert(await edit.evaluate(id=>__levelStudio.project.furniture.removed.includes(id),target.id));
 const editDownload=edit.waitForEvent('download');await edit.locator('#save').click();const editZip=await editDownload;
 const editBytes=readFileSync(await editZip.path());await edit.locator('#open').setInputFiles({name:'floor5.zip',mimeType:'application/zip',buffer:editBytes});
 await edit.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Projektet öppnat'));
 const editPopup=edit.waitForEvent('popup');await edit.locator('#preview').click();const editGame=await editPopup;track(editGame);await edit.close();
 await editGame.goto(origin+'/fps/?level=preview&test=1',{waitUntil:'domcontentloaded'});await editGame.waitForFunction(()=>window.__fps||!document.querySelector('#fatal').hidden);
 assert(await editGame.locator('#fatal').isHidden(),await editGame.locator('#fatal').innerText());
 assert.equal(await editGame.evaluate(()=>__fps.world.project.mode),'edit-floor5');
 assert(await editGame.evaluate(id=>!__fps.world.data.obstacles.some(o=>o.id===id),target.id));
 await editGame.close();
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',mouseRoom:true,zipBytes:bytes.length,spawns:10,privateFPS:true,publishedFPS:true,floor5:true,unsafeLevelRejected:true,consoleErrors:0}));
}finally{await browser.close();}
