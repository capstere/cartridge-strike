/** Easy UI for revising the FPS skeleton, authoring character props and independent 3D objects. */
import {DesignWorkbench} from './workbench.mjs';
import {newProject,validateProject,PALETTES,PRESETS,SHAPES,addPart,clonePart,aiBrief,animationContract,filename} from './project-schema.mjs';
import {makePrototypeGLB} from './prototype-glb.mjs';
import {packZip} from './zip-export.mjs';
import {inspectGLB} from '../furniture-editor/library/glb-utils.mjs';

const W=480,H=680,STORE='cartridge-strike-character-studio-v2';
const byId=id=>document.getElementById(id);
const $=byId;
const ANGLES=['front','back','left','right'];
const bases=new Map(),inks=new Map();
for(const name of ANGLES){
 const base=document.querySelector('[data-base="'+name+'"]'),ink=document.querySelector('[data-ink="'+name+'"]');
 base.width=ink.width=W;base.height=ink.height=H;
 bases.set(name,base);inks.set(name,ink);
}
const workbench=new DesignWorkbench($('preview3d'),bases);
const attachments=new Map(),history=[];
let project=restoreAutosave()||newProject(),selectedPart=null,artwork={},ready=false,dirty=false,activeTab='look';

function status(message,error=false){
 const node=$('status');node.textContent=message;node.classList.toggle('error',error);
}
function normalText(s){return String(s||'').replace(/[\u0000-\u001f]/g,' ').slice(0,100);}
function restoreAutosave(){
 try{
  const saved=localStorage.getItem(STORE);
  if(!saved||saved.length>3_000_000)return null;
  const obj=JSON.parse(saved);validateProject(obj);
  return obj;
 }catch{return null;}
}
function captureArtwork(){
 const result={};for(const [n,c] of inks)result[n]=c.toDataURL('image/png');
 return result;
}
function saveLocal(){
 if(!ready)return;
 try{artwork=captureArtwork();localStorage.setItem(STORE,JSON.stringify({...project,artwork}));}
 catch{status('Projektet visas som vanligt men webbläsaren kan inte autospara. Hämta projektfilen innan du stänger.',true);}
}
function download(data,name,type='application/octet-stream'){
 const b=data instanceof Blob?data:new Blob([data],{type});
 const url=URL.createObjectURL(b),link=document.createElement('a');link.href=url;link.download=name;
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function projectSnapshot(){return {...project,artwork:captureArtwork()};}
function refreshPrompt(){
 try{$('ai-prompt').textContent=aiBrief(project,workbench.getClips(),workbench.getBones());}
 catch(e){status('Fel i projektet: '+e.message,true);}
}
function clearDrawing(){
 for(const c of inks.values())c.getContext('2d').clearRect(0,0,W,H);
 history.length=0;artwork={};saveLocal();
}
function restoreArtwork(saved){
 for(const [name,canvas] of inks){
  const c=canvas.getContext('2d');c.clearRect(0,0,W,H);
  const data=saved?.[name];
  if(typeof data==='string'&&data.startsWith('data:image/png;base64,')&&data.length<1_500_000){
   const img=new Image();img.onload=()=>{c.drawImage(img,0,0,W,H);};img.src=data;
  }
 }
}
function partsSummary(){
 const box=$('part-list');box.replaceChildren();
 if(!project.parts.length){
  const p=document.createElement('p');p.className='empty';p.textContent='Inga delar ännu. Välj en form och klicka på Lägg till.';box.append(p);
 }
 for(const part of project.parts){
  const b=document.createElement('button');b.type='button';b.className='part-item'+(selectedPart===part.id?' selected':'');
  const label=document.createElement('strong');label.textContent=part.name;
  const subtitle=document.createElement('span');subtitle.textContent=SHAPES[part.shape]||part.shape;
  b.append(label,subtitle);b.setAttribute('aria-pressed',String(selectedPart===part.id));
  b.addEventListener('click',()=>{selectedPart=part.id;partsSummary();setTab('parts');});
  box.append(b);
 }
 const part=project.parts.find(p=>p.id===selectedPart);
 $('part-editor').hidden=!part;
 if(!part)return;
 $('part-name').value=part.name;
 $('part-shape').value=part.shape;
 $('part-anchor').value=part.anchor;
 $('part-anchor-wrap').hidden=project.kind==='object';
 $('part-color').value=part.color;
 $('part-note').value=part.note;
 const controls={
  'pos-x':[part.position[0]*100,' cm'],'pos-y':[part.position[1]*100,' cm'],'pos-z':[part.position[2]*100,' cm'],
  'size-x':[part.dimensions[0]*100,' cm'],'size-y':[part.dimensions[1]*100,' cm'],'size-z':[part.dimensions[2]*100,' cm'],
  'rot-y':[part.rotation[1],'°']
 };
 for(const [id,[value,suffix]]of Object.entries(controls)){
  $(id).value=Math.round(value);
  $(id+'-value').textContent=Math.round(value)+suffix;
 }
}
function referenceSummary(){
 const root=$('reference-list');root.replaceChildren();
 for(const ref of project.references){
  const item=document.createElement('div');item.className='reference-item';
  const title=document.createElement('span');title.textContent=ref.name+(attachments.has(ref.name)?' (bifogas i ZIP)':' (lägg till filen igen)');
  const remove=document.createElement('button');remove.type='button';remove.textContent='Ta bort';remove.setAttribute('aria-label','Ta bort '+ref.name);
  remove.addEventListener('click',()=>{attachments.delete(ref.name);project.references=project.references.filter(x=>x!==ref);referenceSummary();persist();});
  item.append(title,remove);root.append(item);
 }
}
function setTab(name){
 activeTab=name;
 for(const button of document.querySelectorAll('[data-tab]')){
  const on=button.dataset.tab===name;
  button.classList.toggle('active',on);button.setAttribute('aria-selected',String(on));
  $('tab-'+button.dataset.tab).hidden=!on;
 }
}
function updateModeVisual(){
 const mode=project.kind==='object'?'object':project.intent==='create'?'create':'revise';
 for(const b of document.querySelectorAll('[data-mode]')){
  const on=b.dataset.mode===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
 }
 $('gender-wrap').hidden=project.kind==='object';
 $('template-wrap').hidden=project.kind==='object';
 $('team-wrap').hidden=project.kind==='object';
 $('animation-controls').hidden=project.kind==='object';
 $('tab-look').hidden=project.kind==='object'||activeTab!=='look';
 const lookBtn=document.querySelector('[data-tab="look"]');
 lookBtn.hidden=project.kind==='object';
 if(project.kind==='object'&&activeTab==='look')setTab('parts');
 if(project.kind==='object'&&activeTab==='parts')setTab('parts');
 if(project.kind==='character'&&activeTab==='parts')setTab('parts');
 if(project.kind==='character'&&activeTab==='look')setTab('look');
 $('character-presets').disabled=project.kind==='object';
 if(project.kind==='object'&&PRESETS[$('part-type').value])$('part-type').value='box';
 $('mode-label').textContent=project.kind==='object'?'Eget 3D-objekt':project.intent==='create'?'Ny karaktär':'Befintlig karaktär';
 $('rig-hint').textContent=project.kind==='object'?'Bygg ett eget objekt av enkla former. Exportera delarna som riktig statisk 3D-prototyp.':'Grundfiguren använder spelets verkliga skeleton, animationer och handfästen. Dina tillagda 3D-delar kan följa ett ben.';
 $('export-help').textContent=project.kind==='object'?'Prototyp-GLB är ett redigerbart statiskt 3D-utkast. AI:n färdigställer material, geometri och eventuella animationer.':'ZIP innehåller spelets orörda originalrigg med animationer. Formerna i prototyp-GLB är statiska och AI:n måste knyta dem till riggen och kontrollera spelets rörelser.';
 $('save-glb').disabled=!project.parts.some(p=>p.visible);
}
function refreshUI(){
 $('project-name').value=project.name;
 $('gender').value=project.base.gender;
 $('team').value=project.base.team;
 $('template').value=project.base.template;
 $('pose').value=project.pose;
 for(const input of document.querySelectorAll('[data-color]'))input.value=project.palette[input.dataset.color];
 $('height').value=project.body.height;$('height-value').textContent=project.body.height+' %';
 $('width').value=project.body.width;$('width-value').textContent=project.body.width+' %';
 for(const input of document.querySelectorAll('[data-note]'))input.value=project.notes[input.dataset.note];
 $('play').textContent='▶ Spela rörelsen';$('play').setAttribute('aria-pressed','false');
 selectedPart=project.parts.at(-1)?.id||null;
 updateModeVisual();partsSummary();referenceSummary();refreshPrompt();
}
function persist(){
 dirty=true;refreshPrompt();saveLocal();
}
function visualChange({rebuild=false,recreate=false,save=true}={}){
 if(!ready)return;
 try{
  workbench.update(project,{rebuild,recreate});
  updateModeVisual();refreshPrompt();
  if(save)saveLocal();
 }catch(e){console.error(e);status('Kunde inte uppdatera 3D-vyn: '+e.message,true);}
}
function resetMode(mode){
 if(!['revise','create','object'].includes(mode))return;
 if(dirty&&!window.confirm('Skapa nytt? Hämta projektfilen först om du vill behålla dina senaste ändringar.'))return;
 const isObject=mode==='object',isNew=mode==='create';
 project=newProject({kind:isObject?'object':'character',newCharacter:isNew,template:isNew?'blank':'analysts'});
 if(isObject)addPart(project,'box');
 attachments.clear();dirty=false;selectedPart=null;workbench.playing=false;
 clearDrawing();setTab(isObject?'parts':'look');
 refreshUI();visualChange({recreate:true,rebuild:true});
 status('Nytt '+(isObject?'3D-objekt':isNew?'karaktärsprojekt':'karaktärsprojekt från originalet')+' skapat.');
}
function selected(){return project.parts.find(p=>p.id===selectedPart)||null;}
function partEdited(refresh=true){
 partsSummary();visualChange({rebuild:true});persist();
 if(refresh)partsSummary();
}
function initDrawing(){
 for(const [name,canvas] of inks){
  const ctx=canvas.getContext('2d');let pointer=null;
  const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};};
  canvas.addEventListener('pointerdown',e=>{
   if(!ready||pointer!==null)return;
   e.preventDefault();pointer=e.pointerId;canvas.setPointerCapture(pointer);
   history.push({name,image:canvas.toDataURL('image/png')});if(history.length>14)history.shift();
   const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);
   ctx.strokeStyle=$('pen-color').value;ctx.lineWidth=Number($('pen-size').value);ctx.lineCap='round';ctx.lineJoin='round';
   ctx.lineTo(p.x+.01,p.y+.01);ctx.stroke();
  });
  canvas.addEventListener('pointermove',e=>{
   if(e.pointerId!==pointer)return;
   e.preventDefault();const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{
   if(e.pointerId===pointer){pointer=null;ctx.closePath();persist();}
  });
 }
}
function undo(){
 const last=history.pop();if(!last){status('Inga fler ritstreck att ångra.');return;}
 const canvas=inks.get(last.name),ctx=canvas.getContext('2d');
 const img=new Image();img.onload=()=>{ctx.clearRect(0,0,W,H);ctx.drawImage(img,0,0,W,H);persist();};
 img.src=last.image;
}
function wrappedLines(ctx,text,x,y,maxWidth,maxLines=6){
 let lines=0;const height=19;
 for(const paragraph of String(text).split('\n')){
  let line='';
  for(const word of paragraph.split(/\s+/)){
   const candidate=line?line+' '+word:word;
   if(ctx.measureText(candidate).width>maxWidth&&line){
    ctx.fillText(line,x,y+lines++*height);line=word;
    if(lines>=maxLines)return;
   }else line=candidate;
  }
  if(line){ctx.fillText(line,x,y+lines++*height);if(lines>=maxLines)return;}
 }
}
function buildSheetCanvas(){
 const gap=22,top=108,bottom=182,w=W*4+gap*5,canvas=document.createElement('canvas');
 canvas.width=w;canvas.height=top+H+bottom;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,canvas.height);
 ctx.fillStyle='#193d49';ctx.fillRect(0,0,w,top);
 ctx.fillStyle='#e7f6f3';ctx.font='bold 34px Arial';ctx.fillText('CHARACTER / OBJECT DESIGN SHEET',gap,51);
 ctx.font='22px Arial';ctx.fillText(project.name,gap,82);
 const labels=['FRAMIFRÅN','BAKIFRÅN','VÄNSTER','HÖGER'];
 for(let i=0;i<ANGLES.length;i++){
  const x=gap+i*(W+gap),name=ANGLES[i];
  ctx.fillStyle='#27434a';ctx.font='bold 18px Arial';ctx.fillText(labels[i],x,top-11);
  ctx.drawImage(bases.get(name),x,top,W,H);
  ctx.drawImage(inks.get(name),x,top,W,H);
  ctx.strokeStyle='#d5e1dd';ctx.strokeRect(x,top,W,H);
 }
 ctx.fillStyle='#24414b';ctx.font='bold 18px Arial';ctx.fillText('DESIGNBRIEF',gap,top+H+38);
 ctx.fillStyle='#536b71';ctx.font='16px Arial';
 const summary=Object.entries(project.notes).map(([k,v])=>k+': '+(v||'–')).join('   /   ');
 wrappedLines(ctx,summary,gap,top+H+65,w-2*gap,4);
 ctx.font='14px Arial';
 ctx.fillText('Cartridge Strike · 3D-prototyp + originalrigg i AI-paketet · Quaternius CC0',gap,canvas.height-19);
 return canvas;
}
function sheetBlob(){
 return new Promise((resolve,reject)=>{
  buildSheetCanvas().toBlob(blob=>blob?resolve(blob):reject(Error('Kunde inte spara bilden.')),'image/png');
 });
}
function getPrototype(){
 const instances=workbench.getPartInstances();
 if(!instances.length)throw Error('Lägg till minst en synlig 3D-del för att hämta en GLB-prototyp.');
 return makePrototypeGLB(instances);
}
async function writeZip(){
 if(!ready)throw Error('3D-modellerna laddas fortfarande.');
 validateProject(project);
 // Ensure screenshots and static mesh are from the same design state.
 workbench.renderSheet();
 const sheet=await sheetBlob();
 const files=[
  {name:'PROJECT.json',data:JSON.stringify(projectSnapshot(),null,2)},
  {name:'AI_INSTRUCTIONS.md',data:aiBrief(project,workbench.getClips(),workbench.getBones())},
  {name:'ANIMATION_CONTRACT.json',data:JSON.stringify(animationContract(project,workbench.getClips(),workbench.getBones()),null,2)},
  {name:'DESIGN_SHEET.png',data:new Uint8Array(await sheet.arrayBuffer())},
  {name:'README.txt',data:'CARTRIDGE STRIKE CREATIVE DESIGN HANDOFF\n\nThis package is a 3D design brief, not an installed FPS character.\nPROJECT.json is editable source data. AI_INSTRUCTIONS.md explains final deliverables.\nFor characters BASE_RIG.glb is the unmodified original animated game skeleton.\nSTATIC_PROTOTYPE.glb is a STATIC mesh of your authored shapes; connect the shapes to the original bones in the final skinned model.\nFiles are for local AI collaboration only; nothing was uploaded by this studio.\n'}
 ];
 if(project.kind==='character'){
  const url=new URL('../assets/fps/models/'+project.base.original_glb,import.meta.url);
  const res=await fetch(url);if(!res.ok)throw Error('Kunde inte hämta originalriggen från spelprojektet.');
  const bytes=new Uint8Array(await res.arrayBuffer());
  if(bytes.length>6*1024*1024||bytes.length<1000)throw Error('Originalriggen har oväntad storlek.');
  files.push({name:'BASE_RIG.glb',data:bytes});
 }
 if(workbench.getPartInstances().length)files.push({name:'STATIC_PROTOTYPE.glb',data:getPrototype()});
 for(let i=0;i<project.references.length;i++){
  const ref=project.references[i],bytes=attachments.get(ref.name);
  if(!bytes)continue;
  files.push({name:'REFERENCE_'+String(i+1).padStart(2,'0')+'.'+ref.type,data:bytes});
 }
 return packZip(files);
}
async function exportZip(){
 const button=$('export-zip');button.disabled=true;button.textContent='Förbereder ZIP…';
 try{
  const zip=await writeZip();download(zip,filename(project.name)+'-ai-design.zip','application/zip');
  status('AI-paket klart! Skicka ZIP-filen till din 3D-AI. Originalrigg, design, ritningar och tekniska krav ligger med.');
 }catch(e){console.error(e);status('Exporten misslyckades: '+e.message,true);}
 finally{button.disabled=false;button.textContent='Hämta AI-paket (.zip)';}
}
async function addReferences(e){
 for(const file of e.target.files||[]){
  try{
   const type=(file.name.split('.').pop()||'').toLowerCase();
   if(!['glb','blend','png','jpg','jpeg','webp'].includes(type))throw Error('Filtypen stöds inte.');
   if(file.size>12*1024*1024||file.size===0)throw Error('Varje fil får vara högst 12 MB.');
   if(project.references.length>=8)throw Error('Max 8 referensfiler.');
   const total=[...attachments.values()].reduce((n,x)=>n+x.byteLength,0);
   if(total+file.size>18*1024*1024)throw Error('Referensfilerna får totalt vara högst 18 MB.');
   const bytes=new Uint8Array(await file.arrayBuffer());
   if(type==='glb')inspectGLB(bytes);
   const name=normalText(file.name);
   if(project.references.some(x=>x.name===name))throw Error('En referens med samma filnamn finns redan.');
   project.references.push({name,type,bytes:bytes.byteLength});attachments.set(name,bytes);
  }catch(error){status(file.name+': '+error.message,true);}
 }
 e.target.value='';referenceSummary();persist();
}
async function importProject(file){
 if(!file)return;
 try{
  if(file.size>3*1024*1024)throw Error('Projektfilen är för stor.');
  const obj=JSON.parse(await file.text());validateProject(obj);
  if(dirty&&!window.confirm('Ersätta ditt nuvarande projekt med den sparade versionen?'))return;
  attachments.clear();project=obj;dirty=false;selectedPart=null;
  setTab(obj.kind==='object'?'parts':'look');
  refreshUI();visualChange({recreate:true,rebuild:true,save:false});
  restoreArtwork(obj.artwork);saveLocal();
  status('Projektet öppnades. Lägg till eventuella referensfiler igen innan du exporterar ZIP.');
 }catch(e){status('Kunde inte öppna projektet: '+e.message,true);}
}
function installEvents(){
 for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>resetMode(b.dataset.mode));
 $('open-project').addEventListener('click',()=>$('project-file').click());
 $('project-file').addEventListener('change',e=>{importProject(e.target.files?.[0]);e.target.value='';});
 for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>setTab(b.dataset.tab));
 $('project-name').addEventListener('input',e=>{project.name=e.target.value.slice(0,100);persist();});
 $('gender').addEventListener('change',e=>{
  project.base.gender=e.target.value;project.base.original_glb='quaternius-operator-'+e.target.value+'.glb';
  visualChange({recreate:true,rebuild:true});persist();
 });
 $('team').addEventListener('change',e=>{project.base.team=e.target.value;visualChange({recreate:true,rebuild:true});persist();});
 $('template').addEventListener('change',e=>{
  project.base.template=e.target.value;project.palette={...PALETTES[e.target.value]};
  for(const input of document.querySelectorAll('[data-color]'))input.value=project.palette[input.dataset.color];
  visualChange();persist();
 });
 for(const input of document.querySelectorAll('[data-color]'))input.addEventListener('input',()=>{
  project.palette[input.dataset.color]=input.value;visualChange({save:false});persist();
 });
 for(const [id,key] of [['height','height'],['width','width']])$(id).addEventListener('input',e=>{
  project.body[key]=Number(e.target.value);$(id+'-value').textContent=e.target.value+' %';
  visualChange({save:false});persist();
 });
 $('pose').addEventListener('change',e=>{
  project.pose=e.target.value;workbench.pose(project.pose,false);workbench.renderSheet();
  $('play').textContent='▶ Spela rörelsen';$('play').setAttribute('aria-pressed','false');persist();
 });
 $('play').addEventListener('click',()=>{
  if(!ready)return;
  const on=workbench.playToggle();
  $('play').textContent=on?'⏸ Pausa rörelsen':'▶ Spela rörelsen';
  $('play').setAttribute('aria-pressed',String(on));
  if(on)requestAnimationFrame(animateLoop);
 });
 $('left-turn').addEventListener('click',()=>{workbench.yaw-=Math.PI/8;workbench.renderPreview();});
 $('right-turn').addEventListener('click',()=>{workbench.yaw+=Math.PI/8;workbench.renderPreview();});
 $('zoom-in').addEventListener('click',()=>{workbench.zoom=Math.min(2.5,workbench.zoom*1.2);workbench.renderPreview();});
 $('zoom-out').addEventListener('click',()=>{workbench.zoom=Math.max(.5,workbench.zoom/1.2);workbench.renderPreview();});
 const canvas=$('preview3d');let pointer=null,last=[0,0];
 canvas.addEventListener('pointerdown',e=>{
  if(!ready||pointer!==null)return;pointer=e.pointerId;last=[e.clientX,e.clientY];canvas.setPointerCapture(pointer);
 });
 canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==pointer)return;
  workbench.yaw-=(e.clientX-last[0])*.008;
  workbench.pitch=Math.max(-.8,Math.min(.8,workbench.pitch+(e.clientY-last[1])*.006));
  last=[e.clientX,e.clientY];workbench.renderPreview();
 });
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{if(pointer===e.pointerId)pointer=null;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();workbench.zoom=Math.min(2.5,Math.max(.5,workbench.zoom*(e.deltaY>0?.9:1.1)));workbench.renderPreview();},{passive:false});
 $('part-type').addEventListener('change',()=>{});
 $('add-part').addEventListener('click',()=>{
  try{
   const item=addPart(project,$('part-type').value);selectedPart=item.id;partsSummary();visualChange({rebuild:true});persist();
  }catch(e){status(e.message,true);}
 });
 $('clone-part').addEventListener('click',()=>{
  try{const p=clonePart(project,selectedPart);selectedPart=p.id;partEdited();}
  catch(e){status(e.message,true);}
 });
 $('remove-part').addEventListener('click',()=>{
  project.parts=project.parts.filter(p=>p.id!==selectedPart);selectedPart=null;partEdited();
 });
 $('part-name').addEventListener('input',e=>{
  const p=selected();if(!p)return;p.name=e.target.value.slice(0,80);partEdited(false);
 });
 $('part-shape').addEventListener('change',e=>{const p=selected();if(!p)return;p.shape=e.target.value;partEdited();});
 $('part-anchor').addEventListener('change',e=>{const p=selected();if(!p)return;p.anchor=e.target.value;partEdited();});
 $('part-color').addEventListener('input',e=>{const p=selected();if(!p)return;p.color=e.target.value;visualChange({rebuild:true,save:false});persist();});
 $('part-note').addEventListener('input',e=>{const p=selected();if(!p)return;p.note=e.target.value.slice(0,1000);persist();});
 for(const id of ['pos-x','pos-y','pos-z','size-x','size-y','size-z','rot-y'])$(id).addEventListener('input',e=>{
  const p=selected();if(!p)return;
  const index='xyz'.indexOf(id.slice(-1)),value=Number(e.target.value);
  if(id.startsWith('pos-'))p.position[index]=value/100;
  else if(id.startsWith('size-'))p.dimensions[index]=value/100;
  else p.rotation[1]=value;
  $(id+'-value').textContent=value+(id==='rot-y'?'°':' cm');
  visualChange({rebuild:true,save:false});persist();
 });
 for(const input of document.querySelectorAll('[data-note]'))input.addEventListener('input',e=>{project.notes[e.target.dataset.note]=e.target.value.slice(0,3000);persist();});
 $('reference-files').addEventListener('change',addReferences);
 $('undo-stroke').addEventListener('click',undo);
 $('clear-ink').addEventListener('click',()=>{clearDrawing();status('Ritmarkeringarna är borttagna.');});
 $('save-json').addEventListener('click',()=>{
  try{validateProject(project);download(JSON.stringify(projectSnapshot(),null,2),filename(project.name)+'.json','application/json');status('Projektet sparat. Du kan öppna JSON-filen i studion senare.');}
  catch(e){status(e.message,true);}
 });
 $('save-png').addEventListener('click',async()=>{
  try{download(await sheetBlob(),filename(project.name)+'-design-sheet.png','image/png');status('Design Sheet exporterad.');}
  catch(e){status(e.message,true);}
 });
 $('save-glb').addEventListener('click',()=>{
  try{download(getPrototype(),filename(project.name)+'-3d-prototyp.glb','model/gltf-binary');status('Statisk 3D-prototyp exporterad. Animationerna finns i separat originalrigg.');}
  catch(e){status(e.message,true);}
 });
 $('export-zip').addEventListener('click',exportZip);
 $('copy-ai').addEventListener('click',async()=>{
  const value=aiBrief(project,workbench.getClips(),workbench.getBones());
  try{await navigator.clipboard.writeText(value);status('AI-instruktionen kopierad.');}
  catch{document.querySelector('.export details').open=true;status('Kopiering blockerades. Markera texten under AI-instruktionen i stället.',true);}
 });
 $('print-sheet').addEventListener('click',()=>window.print());
}
function animateLoop(time){
 if(!ready||!workbench.playing)return;
 workbench.tick(time);
 requestAnimationFrame(animateLoop);
}
async function start(){
 installEvents();initDrawing();
 try{
  await workbench.initialize();ready=true;
  refreshUI();
  workbench.update(project,{recreate:true,rebuild:true});
  restoreArtwork(project.artwork);
  status('Studion är redo! Ändra en färg, lägg till en 3D-del eller skapa en helt ny karaktär.');
 }catch(error){
  console.error(error);status('Kunde inte starta WebGL eller ladda spelets originalmodeller: '+error.message,true);
  $('export-zip').disabled=true;$('save-glb').disabled=true;
 }
}
window.addEventListener('pagehide',()=>workbench.dispose());
start();
