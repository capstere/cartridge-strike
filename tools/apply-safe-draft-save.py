from pathlib import Path
r=Path(__file__).resolve().parents[1]
def change(path,old,new):
 p=r/path;s=p.read_text();assert s.count(old)==1,(path,old[:80],s.count(old));p.write_text(s.replace(old,new))
change('furniture-editor/core.mjs',"placements.length+added.length+removed.length>350","placements.length+added.length+removed.length>MAX_FURNITURE_RECORDS")
p=r/'furniture-editor/core.mjs';p.write_text("import {MAX_FURNITURE_RECORDS} from './project-limits.mjs?v=5.7.2';\n"+p.read_text())
p=r/'furniture-editor/build/level-project.mjs';s=p.read_text();s="import {MAX_FURNITURE_RECORDS,furnitureRecordCount} from '../project-limits.mjs?v=5.7.2';\n"+s
s=s.replace("LEVEL_EDITOR_VERSION='5.7.0'","LEVEL_EDITOR_VERSION='5.7.2'")
old=" const f=input.furniture;if(!f||!['placements','added','removed'].every(k=>Array.isArray(f[k]))||\n  f.placements.length+f.added.length+f.removed.length>350)fail('möbler');"
new=" const f=input.furniture,count=furnitureRecordCount(f);\n if(count===null)fail('möbler: placements, added och removed måste vara listor');\n if(count>MAX_FURNITURE_RECORDS)fail(`möbelposter ${count}/${MAX_FURNITURE_RECORDS}. Spara en säkerhetskopia; inga objekt behöver raderas för att rädda arbetet`);"
assert old in s;s=s.replace(old,new);p.write_text(s)
change('furniture-editor/library/zip.mjs',"'project.json','AGENT_BRIEF.md'","'project.json','RECOVERY.json','AGENT_BRIEF.md'")
change('furniture-editor/library/zip.mjs',"Projektet överstiger 24 MB.","Projektet överstiger 96 MiB.")
p=r/'furniture-editor/build/level-project.schema.json';s=p.read_text();s=s.replace('"maxItems": 350','"maxItems": 2000');p.write_text(s)
p=r/'furniture-editor/new.mjs';s=p.read_text();s="import {draftText,createDraftStore,readDraftZip} from './build/draft-save.mjs?v=5.7.2';\nimport {prepareProjectSave} from './build/safe-save.mjs?v=5.7.2';\n"+s
old="try{project=parseProject(localStorage.getItem(STORAGE)||'');if(project.mode!==mode)throw Error('mode');project=inheritFloor5Gameplay(correctOldOrangeChair(project));}catch{project=inheritFloor5Gameplay(exportProject({mode,name:mode==='edit-floor5'?'Floor 5 – min version':'Min bana',projectId:'lvl-'+crypto.randomUUID().slice(0,12)}));if(mode==='edit-floor5'){try{const old=localStorage.getItem('cartridge-furniture-studio-0.17.0-v1');if(old)project=inheritFloor5Gameplay(parseProject(old));}catch{}}}"
new="""const draftStorage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
let draftStore=createDraftStore(draftStorage,STORAGE);
project=draftStore.load(raw=>{const doc=parseProject(raw);if(doc.mode!==mode)throw Error('Utkastet tillhör ett annat redigeringsläge.');return inheritFloor5Gameplay(correctOldOrangeChair(doc));});
if(!project){project=inheritFloor5Gameplay(exportProject({mode,name:mode==='edit-floor5'?'Floor 5 – min version':'Min bana',projectId:'lvl-'+crypto.randomUUID().slice(0,12)}));if(!draftStore.rejected&&mode==='edit-floor5'){try{const old=localStorage.getItem('cartridge-furniture-studio-0.17.0-v1');if(old)project=inheritFloor5Gameplay(parseProject(old));}catch{}}}"""
assert old in s;s=s.replace(old,new)
old="function persist(){try{localStorage.setItem(p().mode==='edit-floor5'?'cartridge-floor5-level-v2':'cartridge-new-level-v2',JSON.stringify(p()));$('autosave').textContent='Ändringar sparade lokalt.';}catch{$('autosave').textContent='Lokal lagring är full. Spara ZIP nu.';}}"
new="""function persist(){const result=draftStore.save(p());$('autosave').textContent=result.message;$('autosave').classList.toggle('error',!result.ok);}
window.addEventListener('beforeunload',event=>{if(draftStore.failed){event.preventDefault();event.returnValue='';}});"""
assert old in s;s=s.replace(old,new)
start=s.index("$('saveJson').onclick=");end=s.index("$('open').onchange=",start)
s=s[:start]+"""$('saveJson').onclick=()=>{try{download(draftText(p()),p().projectId+'.json','application/json');status('JSON-utkast hämtat utan spelkrav. Egna GLB ingår bara i ZIP/säkerhetskopia.');}catch(e){status('JSON kunde inte skapas: '+e.message);}};
async function saveDesign(backupOnly=false){
 const signature=JSON.stringify(p()),snapshot=JSON.parse(signature);$('save').disabled=true;$('saveBackup').disabled=true;
 try{
  const result=await prepareProjectSave(snapshot,getLocalFile,{backupOnly});
  download(result.bytes,(snapshot.projectId||'floor5')+(result.kind==='recovery'?'-SAKERHETSKOPIA':'')+'.zip','application/zip');
  if(result.kind==='project'){
   if(JSON.stringify(p())===signature){p().assets=result.document.assets;p().validation=result.document.validation;persist();}
   try{localStorage.setItem(guideKey('saved'),'1');updateFirstBuild();}catch{}
   status('ZIP hämtad. Byggfel hindrar inte sparning. Använd TESTA OM BANAN ÄR SPELKLAR före match.');
  }else status('SÄKERHETSKOPIA hämtad: alla projektdata bevarade. '+(result.missing.length?result.missing.length+' modell-/bildfiler saknas; behåll originalpaketen. ':'')+'Inte godkänd för spel. '+result.reason);
 }catch(e){
  // Last-resort source export does not depend on ZIP, models, renderer or parser.
  try{download(draftText(snapshot),(snapshot.projectId||'floor5')+'-RADDNING.json','application/json');status('JSON-räddning hämtad. ZIP misslyckades: '+e.message+'. Behåll modellfiler och fliken.');}
  catch(rawError){status('Kunde inte skapa hämtningen: '+rawError.message+' Behåll fliken öppen.');}
 }finally{$('save').disabled=false;$('saveBackup').disabled=false;}
}
$('save').onclick=()=>saveDesign(false);$('saveBackup').onclick=()=>saveDesign(true);
"""+s[end:]
old="if(file.name.toLowerCase().endsWith('.zip'))({project:incoming,files}=await parseProjectZip(await file.arrayBuffer()));else incoming=parseProject(await file.text());"
new="""if(file.name.toLowerCase().endsWith('.zip')){const bytes=await file.arrayBuffer(),recovered=await readDraftZip(bytes);if(recovered){incoming=parseProject(recovered.project);files=recovered.files;}else ({project:incoming,files}=await parseProjectZip(bytes));}else incoming=parseProject(await file.text());"""
assert old in s;s=s.replace(old,new)
old="  if(view==='walk')leaveWalk();project=inheritFloor5Gameplay(correctOldOrangeChair(incoming));history=[];"
new="""  const next=inheritFloor5Gameplay(correctOldOrangeChair(incoming));
  const incomingKey=next.mode==='edit-floor5'?'cartridge-floor5-level-v2':'cartridge-new-level-v2';
  let nextStore=draftStore;if(incomingKey!==(p().mode==='edit-floor5'?'cartridge-floor5-level-v2':'cartridge-new-level-v2')){nextStore=createDraftStore(draftStorage,incomingKey);nextStore.load(JSON.parse);}
  nextStore.acceptImport(next);draftStore=nextStore;$('recoveryDialog')?.close();
  if(view==='walk')leaveWalk();project=next;history=[];"""
assert old in s;s=s.replace(old,new)
s+="""
// A rejected autosave is never silently replaced by the fallback scene.
if(draftStore.rejected){
 const dialog=document.createElement('dialog');dialog.id='recoveryDialog';
 const heading=document.createElement('h2');heading.textContent='Ditt tidigare utkast är skyddat';
 const info=document.createElement('p');info.textContent='Utkastet kunde inte öppnas: '+draftStore.problem+'. Inget har skrivits över. Hämta originalet eller öppna en reparerad JSON/ZIP.';
 const backup=document.createElement('button');backup.textContent='HÄMTA ORIGINALUTKAST';backup.onclick=()=>download(draftStore.rejected,'Floor5_SKYDDAT_UTKAST.json','application/json');
 const chooser=document.createElement('input');chooser.type='file';chooser.accept='.json,.txt,.zip';chooser.hidden=true;chooser.onchange=e=>$('open').onchange(e);
 const open=document.createElement('button');open.textContent='ÖPPNA REPARERAD JSON/ZIP';open.onclick=()=>chooser.click();
 dialog.append(heading,info,backup,open,chooser);dialog.addEventListener('cancel',e=>e.preventDefault());document.body.append(dialog);dialog.showModal();
}
"""
p.write_text(s)
p=r/'furniture-editor/new.html';s=p.read_text().replace('<button id="saveJson">SPARA JSON</button>', '<button id="saveBackup" type="button">SÄKERHETSKOPIA · ÄVEN VID FEL</button><button id="saveJson">SPARA JSON-UTKAST</button>').replace('accept=".json,.zip"','accept=".json,.json.txt,.txt,.zip"').replace('Du kan spara även medan banan har varningar.','Bygg- och spelfel stoppar inte sparning. Vid formatfel eller saknade filer hämtas en märkt säkerhetskopia i stället.');p.write_text(s)
# Invalidate cached ancestors so the editor, ZIP parser and FPS use one schema.
import re,posixpath
changed={str(p.relative_to(r)) for p in r.rglob('*') if p.is_file() and '.git' not in p.parts and p.suffix in ['.mjs','.js','.html'] and (p.name in ['new.mjs','new.html','core.mjs','level-project.mjs','zip.mjs','project-limits.mjs','draft-save.mjs','safe-save.mjs'])}
# Every local module referencing a changed source gets a fresh version. Include its importers recursively.
while True:
 more=set()
 for p in list((r/'furniture-editor').rglob('*'))+list((r/'src/fps').glob('*'))+list((r/'fps').glob('*')):
  if p.suffix not in ['.mjs','.js','.html'] or not p.is_file(): continue
  rel=str(p.relative_to(r));src=p.read_text();base=posixpath.dirname(rel)
  def repl(m):
   url=m.group(2);path=url.split('?')[0]
   if not path.startswith('.'):return m.group(0)
   target=posixpath.normpath(posixpath.join(base,path))
   if target not in changed:return m.group(0)
   return m.group(1)+path+'?v=5.7.2'+m.group(3)
  out=re.sub(r'''(["'])(\.{1,2}/[^"'\n]+\.(?:mjs|js)(?:\?[^"'\n]*)?)(["'])''',repl,src)
  if out!=src:p.write_text(out);more.add(rel)
 if more<=changed:break
 changed|=more
print('Invalidated sources',len(changed))

# Update only the old count-budget assertion; retain the malformed-data test.
p=r/'furniture-editor/editor.test.mjs';s=p.read_text().replace('placements:Array(400).fill({})','placements:Array(2001).fill({})')
s=s.replace("const html=readFileSync(resolve(root,'furniture-editor/index.html'),'utf8');","assert.throws(()=>parsePatch({...doc,placements:Array(400).fill({})},base),/Ogiltigt/);\n const html=readFileSync(resolve(root,'furniture-editor/index.html'),'utf8');");p.write_text(s)
for rel in ['furniture-editor/new.html','furniture-editor/index.html','fps/walk.html']:
 p=r/rel;p.write_text(p.read_text().replace('.mjs?v=5.7.1','.mjs?v=5.7.2'))
# Manifest hashes cover every changed runtime plus the three new runtime modules.
import json,hashlib
p=r/'build-info.json';info=json.loads(p.read_text());known={x['path'] for x in info['files']}
for rel in ['furniture-editor/project-limits.mjs','furniture-editor/build/draft-save.mjs','furniture-editor/build/safe-save.mjs']:
 if rel not in known:info['files'].append({'path':rel})
for row in info['files']:
 data=(r/row['path']).read_bytes();row['bytes']=len(data);row['sha256']=hashlib.sha256(data).hexdigest()
info['files'].sort(key=lambda row:row['path']);info['bytes']=sum(row['bytes'] for row in info['files']);p.write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
