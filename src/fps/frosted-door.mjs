/** Shared visual leaf only. Hinges, collision and opening logic remain in doors.mjs. */
import * as T from '../../vendor/three/three.module.js';
export function frostedDoorParts(width){
 const h=2.23,bottom=.035,rail=.055;
 return [
  {part:'glass',x:width/2,y:bottom+h/2,z:0,w:width-rail*2,h:h-rail*2,d:.018},
  ...[rail/2,width-rail/2].map(x=>({part:'frame',x,y:bottom+h/2,z:0,w:rail,h,d:.06})),
  ...[bottom+rail/2,bottom+h-rail/2].map(y=>({part:'frame',x:width/2,y,z:0,w:width-rail*2,h:rail,d:.06})),
  ...[-1,1].map(sign=>({part:'handle',x:width*.78,y:1.05,z:sign*.07,w:.17,h:.03,d:.03}))
 ];
}
export function frostedGlassMaterial(){return new T.MeshPhysicalMaterial({color:0xe1ecea,roughness:.68,metalness:0,transmission:.72,thickness:.018,ior:1.45,side:T.DoubleSide});}
