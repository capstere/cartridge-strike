/** Extra creative options, backward-compatible with saved v2 design projects. */
export const OUTFITS=Object.freeze({
 original:'Originaluniform',tshirt:'T-shirt',hoodie:'Hoodie',jacket:'Jacka med dragkedja',
 polo:'Pikétröja',labcoat:'Labbrock',vest:'Skyddsväst'
});
export const HAIRSTYLES=Object.freeze({
 original:'Originalfrisyr',short:'Kort',curly:'Lockigt',bob:'Page',long:'Långt',
 ponytail:'Hästsvans',mohawk:'Mohawk',buzz:'Snaggat'
});
export const FACE_CHOICES=Object.freeze({
 eyes:['Naturliga','Stora','Smala','Runda','Markerade'],
 eyebrows:['Naturliga','Tjocka','Tunna','Bågformade','Raka'],
 nose:['Naturlig','Smal','Bred','Uppåtvänd','Rak'],
 mouth:['Naturlig','Smalt leende','Fylligare läppar','Allvarlig','Brett leende'],
 jaw:['Naturlig','Rund','Kantig','Smal','Bred'],
 facialHair:['Ingen','Stubb','Kort skägg','Helskägg','Mustasch'],
 freckles:['Nej','Lätt','Tydliga']
});
export const REQUEST_ANIMATIONS=Object.freeze({
 wave:'Vinka',dance:'Dansa',celebrate:'Fira vinst',crouchJump:'Hoppa hukande',
 hitReact:'Reagera på träff',climb:'Klättra',slide:'Glida',sit:'Sitta',
 melee:'Närstrid',emote:'Personligt emote'
});
export const FONT_STYLES=Object.freeze({sans:'Sans-serif',serif:'Serif',mono:'Monospace'});
export function makeCreative(){
 return {
  outfit:'original',hair:'original',
  face:{eyes:'Naturliga',eyebrows:'Naturliga',nose:'Naturlig',mouth:'Naturlig',jaw:'Naturlig',facialHair:'Ingen',freckles:'Nej',eyeColor:'#547a8d'},
  print:{text:'',color:'#ffffff',font:'sans',size:60,position:'front',
   imageData:null,imageName:null,imageMode:'print',imageScale:100},
  requestedAnimations:[],faceView:'front'
 };
}
export function ensureCreative(project){
 if(!project.creative)project.creative=makeCreative();
 return project.creative;
}
const hex=v=>typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v);
export function validateCreative(c){
 if(!c||typeof c!=='object'||!Object.hasOwn(OUTFITS,c.outfit)||!Object.hasOwn(HAIRSTYLES,c.hair))throw Error('Okänd kläd- eller frisyrstil.');
 if(!c.face||!hex(c.face.eyeColor)||Object.entries(FACE_CHOICES).some(([k,values])=>!values.includes(c.face[k])))throw Error('Ogiltiga ansiktsinställningar.');
 const p=c.print||{};
 if(typeof p.text!=='string'||p.text.length>100||!hex(p.color)||!Object.hasOwn(FONT_STYLES,p.font)||
  !Number.isInteger(p.size)||p.size<20||p.size>120||!['front','back'].includes(p.position)||
  !['print','pattern'].includes(p.imageMode)||!Number.isInteger(p.imageScale)||p.imageScale<30||p.imageScale>200)throw Error('Ogiltigt tryck eller text.');
 if(p.imageData!==null&&p.imageData!==undefined&&
  (typeof p.imageData!=='string'||p.imageData.length>950000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(p.imageData)))
  throw Error('PNG-mönstret får inte vara större än 950 kB som datatext.');
 if(p.imageName!==null&&p.imageName!==undefined&&(typeof p.imageName!=='string'||p.imageName.length>100))throw Error('Ogiltigt PNG-filnamn.');
 if(!Array.isArray(c.requestedAnimations)||c.requestedAnimations.length>10||new Set(c.requestedAnimations).size!==c.requestedAnimations.length||
   c.requestedAnimations.some(x=>!Object.hasOwn(REQUEST_ANIMATIONS,x)))throw Error('Ogiltiga önskade animationer.');
 if(!['front','left','right'].includes(c.faceView))throw Error('Ogiltig närbildsvy.');
 return c;
}
export function creativeBrief(c){
 if(!c)return [];
 const labels=Object.fromEntries(Object.entries(c.face).map(([key,value])=>[key,value]));
 const p=c.print;
 return [
  '',
  '## Clothing, facial design and custom textile artwork',
  'Selected clothing: '+OUTFITS[c.outfit]+' ('+c.outfit+'). This is a conceptual garment mockup and MUST be converted into deforming, correctly skinned clothes.',
  'Hair design: '+HAIRSTYLES[c.hair]+'. Sculpt hair and ensure it follows Head bone and does not clip with headgear.',
  ...Object.entries(labels).map(([key,value])=>'Face / '+key+': '+value),
  'Use FACE_FRONT.png, FACE_LEFT.png, FACE_RIGHT.png if provided as high-resolution traced detail references; the original face UV/topology is not changed by concept sliders.',
  'Shirt text: '+(p.text||'[none]')+'; font='+p.font+', colour='+p.color+', size='+p.size+' px in 512px preview, position='+p.position+'.',
  'Textile uploaded: '+(p.imageData?'yes – see SHIRT_ARTWORK.png ('+(p.imageName||'custom art')+')':'none')+
   '; type='+p.imageMode+'; scale='+p.imageScale+'%.',
  'For pattern: seamlessly tile/repeat across garment UVs. For print: place artwork on '+p.position+' without stretching; keep transparent areas and legibility.',
  'Canvas print preview in the studio is a flat chest mockup. The final designer must apply the exact artwork to a properly UV-unwrapped, animated fabric mesh.',
  '',
  '## Additional animations requested (NOT included in original rig)',
  ...(c.requestedAnimations.length?c.requestedAnimations.map(id=>'- '+REQUEST_ANIMATIONS[id]+': create an original animation clip on the SAME original skeleton and document integration to game logic.'):['None requested.']),
  'Do not present requested additional animations as already available; original GLB animations are supplied separately.'
 ];
}
