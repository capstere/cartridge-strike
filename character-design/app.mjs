/**
 * Non-destructive character concept sheet.
 * Reuses the game's exact CC0 rigged GLB loader and runtime costume builder.
 * Does not modify models, animation clips, the game or game state.
 */
import * as T from '../vendor/three/three.module.js';
import {loadCharacterLibrary,createAuthoredAvatar,disposeAvatar} from '../src/fps/character-library.mjs';

const WIDTH=480,HEIGHT=680;
const ids=['character-name','face','clothes','shoes','gear','notes'];
const byId=id=>document.getElementById(id);
const read=id=>byId(id).value.trim();
const bases=new Map(),inks=new Map();
const status=byId('status');
let renderer=null,scene=null,camera=null,avatar=null,flip=false,ready=false;

for(const name of ['front','back','left','right']){
  const base=document.querySelector('[data-base="'+name+'"]');
  const ink=document.querySelector('[data-ink="'+name+'"]');
  base.width=ink.width=WIDTH;base.height=ink.height=HEIGHT;
  bases.set(name,base);inks.set(name,ink);
}

function inform(message,error=false){
  status.textContent=message;
  status.classList.toggle('error',error);
}
function slug(value){
  return (value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,45))||'character';
}
// Same deterministic selection algorithm as src/fps/character-library.mjs.
function characterId(gender){
  for(let i=0;i<100;i++){
    const id='design-'+i;
    const seed=[...id].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,7);
    if((seed%3===0)===(gender==='female'))return id;
  }
  throw Error('Could not find a matching gender seed');
}
function clearInk(){
  for(const canvas of inks.values())canvas.getContext('2d').clearRect(0,0,WIDTH,HEIGHT);
}
function setPose(){
  if(!avatar)return;
  const clipName=read('pose'),clip=avatar.clips.get(clipName);
  if(!clip){inform('Pose saknas i originalmodellen: '+clipName,true);return;}
  avatar.mixer.stopAllAction();
  avatar.mixer.clipAction(clip).reset().play();
  avatar.mixer.setTime(.28);
  avatar.root.updateMatrixWorld(true);
  avatar.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
}
function updateAvatar(){
  if(!ready)return;
  try{
    if(avatar){avatar.holder.removeFromParent();disposeAvatar(avatar);}
    const gender=read('gender'),team=read('team');
    avatar=createAuthoredAvatar(team==='hostage'?'analysts':team,characterId(gender),team==='hostage');
    scene.add(avatar.holder);
    setPose();
    renderViews();
    clearInk();
    inform('Originalmodell inläst. Rita och beskriv dina ändringar.');
  }catch(error){inform('Kunde inte visa figuren: '+error.message,true);console.error(error);}
}
function renderViews(){
  if(!ready||!avatar)return;
  const side=flip?-1:1;
  const positions={
    front:[0,.93,3.6*side],
    back:[0,.93,-3.6*side],
    left:[-3.6*side,.93,0],
    right:[3.6*side,.93,0]
  };
  avatar.holder.updateMatrixWorld(true);
  for(const [name,base] of bases){
    const pos=positions[name];
    camera.position.set(pos[0],pos[1],pos[2]);
    camera.lookAt(0,.88,0);
    camera.updateProjectionMatrix();
    renderer.render(scene,camera);
    const ctx=base.getContext('2d');
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    ctx.drawImage(renderer.domElement,0,0,WIDTH,HEIGHT);
  }
}
function startDrawing(){
  for(const [name,canvas] of inks){
    const ctx=canvas.getContext('2d');
    let pointer=null;
    const point=e=>{
      const r=canvas.getBoundingClientRect();
      return {x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*HEIGHT/r.height};
    };
    canvas.addEventListener('pointerdown',e=>{
      if(!ready||pointer!==null)return;
      e.preventDefault();pointer=e.pointerId;
      canvas.setPointerCapture(pointer);
      const p=point(e);
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.01,p.y+.01);
      ctx.strokeStyle=read('pen-color');ctx.lineWidth=Number(read('pen-size'));
      ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
    });
    canvas.addEventListener('pointermove',e=>{
      if(pointer!==e.pointerId)return;
      e.preventDefault();
      const p=point(e);
      ctx.strokeStyle=read('pen-color');ctx.lineWidth=Number(read('pen-size'));
      ctx.lineTo(p.x,p.y);ctx.stroke();
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture']){
      canvas.addEventListener(event,e=>{
        if(e.pointerId===pointer){pointer=null;ctx.closePath();}
      });
    }
  }
}
function brief(){
  const gender=read('gender'),team=read('team');
  const basename='quaternius-operator-'+gender+'.glb';
  return {
    format:'Cartridge Strike Character Design Brief v1',
    character_name:read('character-name')||'Min FPS-karaktär',
    reference:{repository:'capstere/cartridge-strike',original_glb:basename,
      original_url:new URL('../assets/fps/models/'+basename,location.href).href,
      preview:'Game version with runtime-added wardrobe and accessories',
      gender,team,pose:read('pose'),front_back_reversed:flip},
    changes:{face_and_hair:read('face'),clothes_and_colors:read('clothes'),
      shoes_and_gloves:read('shoes'),accessories_and_silhouette:read('gear'),additional_notes:read('notes')},
    technical_requirements:[
      'Edit the attached ORIGINAL GLB as the starting model; do not replace it with an unrelated character.',
      'Keep the complete skeleton, bone names, hierarchy, bind poses and skin weights compatible with existing animation clips.',
      'Retain at least Idle_Loop, Walk_Loop, Crouch_Idle_Loop, Pistol_Idle_Loop, Pistol_Reload and Death01. Keep all other existing clips where practical.',
      'Keep the body oriented and scaled like the source GLB. The game normalizes final character height to about 1.69 m.',
      'Hands and weapon grips must remain correctly rigged; weapons are attached separately by the game.',
      'Appearance changes to face, hair, shoes, clothing or equipment must deform and animate correctly during walking, crouching, reloading and death.',
      'Do not bake in weapons, game logic or character collisions.',
      'Return an optimized glTF 2.0 GLB with skinned meshes, textures and working animations. Include four orthographic previews and a short change log.',
      'The original game adds clothing colors, boots, vest, patches and headset in src/fps/character-library.mjs. This must be reconciled during actual game integration.'
    ]
  };
}
function promptText(){
  const b=brief(),c=b.changes;
  return [
    'CHARACTER DESIGN REQUEST – CARTRIDGE STRIKE',
    'Namn: '+b.character_name,
    'Utgångsmodell: '+b.reference.original_glb+' (bifogas som fil).',
    'Referens: Min bifogade Character Design Sheet PNG med fyra vyer och mina markeringar.',
    'Spelstil: en personlig, stiliserad FPS-karaktär med tydlig siluett och välfungerande animationer.',
    '',
    'MINA ÄNDRINGAR:',
    'Ansikte och hår: '+(c.face_and_hair||'[behåll tills vidare]'),
    'Kläder och färger: '+(c.clothes_and_colors||'[behåll tills vidare]'),
    'Skor och handskar: '+(c.shoes_and_gloves||'[behåll tills vidare]'),
    'Tillbehör och siluett: '+(c.accessories_and_silhouette||'[behåll tills vidare]'),
    'Övrigt: '+(c.additional_notes||'[inga ytterligare instruktioner]'),
    '',
    'TEKNISKA KRAV – MÅSTE RESPEKTERAS:',
    ...b.technical_requirements.map((line,i)=>(i+1)+'. '+line),
    '',
    'Föreslå först ett designförslag enligt referensen. Leverera sedan en riggad, optimerad GLB och front/side/back-vyer. Ändra inte spelkod utan separat instruktion.'
  ].join('\n');
}
function downloadFile(blob,name){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function textInLines(ctx,value,x,y,maxWidth,maxLines){
  const paragraphs=value.split('\n'),lineHeight=20;
  let lines=0;
  for(const paragraph of paragraphs){
    let current='';
    for(const word of paragraph.split(/\s+/)){
      if(lines>=maxLines)return;
      const candidate=current?current+' '+word:word;
      if(ctx.measureText(candidate).width>maxWidth&&current){
        ctx.fillText(current,x,y+lines*lineHeight);lines++;current=word;
      }else current=candidate;
    }
    if(lines>=maxLines)return;
    ctx.fillText(current,x,y+lines*lineHeight);lines++;
  }
}
function savePNG(){
  if(!ready){inform('Modellen är inte färdigladdad.',true);return;}
  const pad=22,top=105,bottom=170,labels=['FRAMIFRÅN','BAKIFRÅN','VÄNSTER','HÖGER'];
  const out=document.createElement('canvas');
  out.width=WIDTH*4+pad*5;out.height=top+HEIGHT+bottom;
  const ctx=out.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,out.width,out.height);
  ctx.fillStyle='#173943';ctx.fillRect(0,0,out.width,top);
  ctx.fillStyle='#e0f2ed';ctx.font='bold 33px Arial';
  ctx.fillText('CHARACTER DESIGN SHEET',pad,52);
  ctx.font='20px Arial';ctx.fillText(brief().character_name,pad,82);
  ctx.fillStyle='#182d32';ctx.font='bold 20px Arial';
  Array.from(bases.entries()).forEach(([key,base],i)=>{
    const x=pad+i*(WIDTH+pad);
    ctx.fillText(labels[i],x,top-16);
    ctx.drawImage(base,x,top);
    ctx.drawImage(inks.get(key),x,top);
    ctx.strokeStyle='#bac8ca';ctx.lineWidth=1;ctx.strokeRect(x,top,WIDTH,HEIGHT);
  });
  ctx.fillStyle='#183b43';ctx.font='bold 18px Arial';
  ctx.fillText('DESIGNANTECKNINGAR',pad,top+HEIGHT+38);
  ctx.fillStyle='#53696c';ctx.font='16px Arial';
  const b=brief();
  const compact=['Ansikte / hår: '+(b.changes.face_and_hair||'–'),
    'Kläder: '+(b.changes.clothes_and_colors||'–'),
    'Skor: '+(b.changes.shoes_and_gloves||'–'),
    'Utrustning: '+(b.changes.accessories_and_silhouette||'–'),
    'Övrigt: '+(b.changes.additional_notes||'–')].join('   |   ');
  textInLines(ctx,compact,pad,top+HEIGHT+67,out.width-2*pad,4);
  ctx.font='14px Arial';ctx.fillText('Cartridge Strike · Originalrigg: Quaternius (CC0) · Referensbild, ingen ändrad 3D-modell',pad,out.height-18);
  out.toBlob(blob=>{
    if(!blob){inform('Kunde inte skapa PNG.',true);return;}
    downloadFile(blob,slug(b.character_name)+'-design-sheet.png');
    inform('Referensbild skapad och skickad till hämtning.');
  },'image/png');
}
function saveJSON(){
  if(!ready){inform('Modellen är inte färdigladdad.',true);return;}
  const b=brief();
  downloadFile(new Blob([JSON.stringify(b,null,2)+'\n'],{type:'application/json'}),slug(b.character_name)+'-ai-brief.json');
  inform('AI-brief skapad och skickad till hämtning.');
}
async function copyPrompt(){
  const value=promptText();
  try{await navigator.clipboard.writeText(value);inform('AI-instruktionen kopierad.');}
  catch(e){document.querySelector('details').open=true;inform('Kopiering blockerades. Markera texten under "Visa AI-instruktionen" och kopiera.',true);}
}
function updatePrompt(){byId('prompt-preview').textContent=promptText();}
async function initialize(){
  try{
    renderer=new T.WebGLRenderer({alpha:false,antialias:true,preserveDrawingBuffer:true});
    renderer.setPixelRatio(1);renderer.setSize(WIDTH,HEIGHT,false);
    renderer.outputColorSpace=T.SRGBColorSpace;
    scene=new T.Scene();scene.background=new T.Color(0xf5f7f6);
    scene.add(new T.HemisphereLight(0xffffff,0x8e999a,2.1));
    const key=new T.DirectionalLight(0xffffff,2.1);
    key.position.set(-2,5,4);scene.add(key);
    const fill=new T.DirectionalLight(0xe7f3ff,1.1);
    fill.position.set(2,3,-4);scene.add(fill);
    const extent=2.27;camera=new T.OrthographicCamera(-extent*WIDTH/HEIGHT/2,extent*WIDTH/HEIGHT/2,extent/2,-extent/2,.1,80);
    await loadCharacterLibrary();
    ready=true;
    updateAvatar();
    updatePrompt();
  }catch(e){
    console.error(e);inform('Modellen kunde inte laddas: '+e.message+'. Kontrollera WebGL och nätanslutningen.',true);
  }
}
startDrawing();
byId('gender').addEventListener('change',updateAvatar);
byId('team').addEventListener('change',updateAvatar);
byId('pose').addEventListener('change',()=>{if(!ready)return;setPose();renderViews();clearInk();updatePrompt();});
byId('flip').addEventListener('click',()=>{flip=!flip;renderViews();clearInk();updatePrompt();});
byId('clear').addEventListener('click',clearInk);
byId('save-png').addEventListener('click',savePNG);
byId('save-json').addEventListener('click',saveJSON);
byId('copy-prompt').addEventListener('click',copyPrompt);
byId('print-sheet').addEventListener('click',()=>window.print());
for(const id of ids)byId(id).addEventListener('input',updatePrompt);
for(const id of ['gender','team'])byId(id).addEventListener('change',updatePrompt);
window.addEventListener('pagehide',()=>{if(avatar)disposeAvatar(avatar);renderer?.dispose();});
initialize();
