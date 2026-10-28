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
 const published=await context.newPage();track(published);
 await published.goto(origin+'/fps/?level=synthetic-demo&test=1');await published.waitForFunction(()=>window.__fps||!document.querySelector('#fatal').hidden);
 assert(await published.locator('#fatal').isHidden(),await published.locator('#fatal').innerText());
 const unsafe=await context.newPage();await unsafe.goto(origin+'/fps/?level=..%2F..%2Fsecret&test=1');await unsafe.waitForFunction(()=>!document.querySelector('#fatal').hidden);assert.match(await unsafe.locator('#fatal').innerText(),/Ogiltigt nivå-ID/);
 const old=await context.newPage();track(old);await old.goto(origin+'/fps/?test=1');await old.waitForFunction(()=>window.__fps||!document.querySelector('#fatal').hidden);
 assert(await old.locator('#fatal').isHidden(),await old.locator('#fatal').innerText());assert.equal(await old.evaluate(()=>__fps.world.data.__custom),undefined);
 await page.locator('#open').setInputFiles({name:'bad.zip',mimeType:'application/zip',buffer:Buffer.from('bad zip')});
 assert.match(await page.locator('#status').innerText(),/Kunde inte öppna/);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',mouseRoom:true,zipBytes:bytes.length,spawns:10,privateFPS:true,publishedFPS:true,floor5:true,unsafeLevelRejected:true,consoleErrors:0}));
}finally{await browser.close();}
