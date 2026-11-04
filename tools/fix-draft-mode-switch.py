from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[1]
p=r/'furniture-editor/new.mjs';s=p.read_text();needle='let draftStore=createDraftStore(draftStorage,STORAGE);'
assert s.count(needle)==1
s=s.replace(needle,needle+'''
const draftStores=new Map([[mode,draftStore]]);
function storeForMode(currentMode){
 if(!draftStores.has(currentMode)){
  const key=currentMode==='edit-floor5'?'cartridge-floor5-level-v2':'cartridge-new-level-v2';
  const store=createDraftStore(draftStorage,key);
  store.load(raw=>{const doc=parseProject(raw);if(doc.mode!==currentMode)throw Error('Utkastet tillhör ett annat redigeringsläge.');return doc;});
  draftStores.set(currentMode,store);
 }
 return draftStores.get(currentMode);
}''')
a="function persist(){const result=draftStore.save(p());"
b="function persist(){draftStore=storeForMode(p().mode);const result=draftStore.save(p());"
assert s.count(a)==1;s=s.replace(a,b)
a="  const incomingKey=next.mode==='edit-floor5'?'cartridge-floor5-level-v2':'cartridge-new-level-v2';\n  let nextStore=draftStore;if(incomingKey!==(p().mode==='edit-floor5'?'cartridge-floor5-level-v2':'cartridge-new-level-v2')){nextStore=createDraftStore(draftStorage,incomingKey);nextStore.load(JSON.parse);}"
b="  const nextStore=storeForMode(next.mode);"
assert s.count(a)==1;s=s.replace(a,b);p.write_text(s)
assert hashlib.sha256(p.read_bytes()).hexdigest()=='0d9bbe3f2718f971795dba5e4ed2700e1a83e97467d663ce40abd54716ff0b73'
p=r/'tools/draft-save-browser.mjs';s=p.read_text();needle=" await page.screenshot({path:out+'/recovered.png'});"
extra="""
 // Import / demo / undo must keep the other editing mode's storage untouched.
 const newRaw=await page.evaluate(()=>localStorage.getItem('cartridge-new-level-v2'));
 const floor=await page.evaluate(async()=>{const {exportProject}=await import('./build/level-project.mjs?v=5.7.2');return exportProject({mode:'edit-floor5',projectId:'lvl-mode-switch',name:'Saved Floor 5'});});
 await open(Buffer.from(JSON.stringify(floor)),'floor.json');await page.waitForFunction(()=>__levelStudio.project.projectId==='lvl-mode-switch');
 assert.equal(await page.evaluate(()=>localStorage.getItem('cartridge-new-level-v2')),newRaw);
 const floorRaw=await page.evaluate(()=>localStorage.getItem('cartridge-floor5-level-v2'));
 await page.locator('#demo').click();await page.waitForFunction(()=>__levelStudio.project.mode==='new-level');
 assert.equal(await page.evaluate(()=>localStorage.getItem('cartridge-floor5-level-v2')),floorRaw);
 await page.locator('#undo').click();assert.equal((await get()).projectId,'lvl-mode-switch');
 assert.equal(await page.evaluate(()=>localStorage.getItem('cartridge-floor5-level-v2')),floorRaw);
"""
assert s.count(needle)==1;s=s.replace(needle,needle+extra).replace('rejectedAutosaveProtected:true,errors','rejectedAutosaveProtected:true,modeSwitchIsolated:true,errors');p.write_text(s)
p=r/'build-info.json';d=json.loads(p.read_text())
for row in d['files']:
 data=(r/row['path']).read_bytes();row['bytes']=len(data);row['sha256']=hashlib.sha256(data).hexdigest()
d['bytes']=sum(x['bytes'] for x in d['files']);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
