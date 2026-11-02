/** Small reproducible CanvasTexture patterns shared by Designstudio and FPS.
 * UV coordinates represent model units in both renderers. No external downloads,
 * no source-model changes and no extra collision geometry.
 */
import * as T from '../../vendor/three/three.module.js';
import {PATTERN_SPECS,hasPattern} from './pattern-presets.mjs?v=5.6.1';
const patterns=new Map();
const S=256;
function canvasPattern(type){
 const c=document.createElement('canvas');c.width=c.height=S;
 const g=c.getContext('2d');
 const box=(x,y,w,h,base,shine)=>{g.fillStyle=base;g.fillRect(x,y,w,h);
  if(shine){g.fillStyle=shine;g.fillRect(x+4,y+4,Math.max(0,w-8),2);}};
 if(type==='dark-tile'){
  g.fillStyle='#121619';g.fillRect(0,0,S,S);
  const colors=['#2a3035','#252b30','#30363a','#272d32'];
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){
   box(x*64+3,y*64+3,58,58,colors[(x+2*y)%colors.length],'#383e42');
  }
 }else if(type==='dark-gloss-laminate'){
  g.fillStyle='#1e2428';g.fillRect(0,0,S,S);
  const colors=['#363c41','#3c4347','#41474b','#343b40'];
  for(let row=0;row<8;row++){
   const y=row*32,offset=[0,75,147,36][row%4];
   for(let x=-320+offset;x<400;x+=204){
    box(x+2,y+2,200,28,colors[row%colors.length],'#51575c');
    g.fillStyle='#464d50';g.fillRect(x+22,y+9,145,1);
    g.fillStyle='#30383b';g.fillRect(x+45,y+20,130,1);
   }
  }
 }else if(type==='dark-large-stone'){
  g.fillStyle='#b8bdbd';g.fillRect(0,0,S,S);
  const colors=['#43494b','#393f42','#484d50','#3c4346'];
  for(let row=-1;row<=2;row++)for(let col=-2;col<=2;col++){
   const x=col*S+(row%2?S/2:0),y=row*(S/2);
   box(x+4,y+4,S-8,S/2-8,colors[(Math.abs(row)+Math.abs(col))%colors.length],'#53595b');
  }
 }else if(type==='white-tile-gray-grout'){
  g.fillStyle='#969e9e';g.fillRect(0,0,S,S);
  const tiles=['#f4f5f3','#edeFED'.toLowerCase(),'#fafaf7','#f0f1ee'];
  for(let row=0;row<4;row++)for(let col=0;col<2;col++){
   box(col*128+3,row*64+3,122,58,tiles[(row+col)%4],'#ffffff');
  }
 }
 return c;
}
function texture(type){
 if(!patterns.has(type)){const t=new T.CanvasTexture(canvasPattern(type));
  t.userData.studioShared=true;t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;
  t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;
  t.anisotropy=4;t.name='floor5-'+type;t.needsUpdate=true;patterns.set(type,t);}
 return patterns.get(type);
}
export function patternMaterial(type){
 if(!hasPattern(type))return null;
 const spec=PATTERN_SPECS[type];
 const material=new T.MeshStandardMaterial({
  map:texture(type),color:0xffffff,side:T.DoubleSide,roughness:spec.roughness,metalness:spec.metalness
 });
 material.userData.studioOwned=true;return material;
}
