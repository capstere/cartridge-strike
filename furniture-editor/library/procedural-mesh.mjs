/** Minimal primitive meshes: one unit box reused by editor, two shared circles.
 * All objects centered X/Z and resting on the floor; elevation applied by parent.
 */
import * as T from '../../vendor/three/three.module.js';
import {proceduralOf} from './procedural.mjs';
const circle=new T.CylinderGeometry(.5,.5,1,24);
const metallic=new T.MeshStandardMaterial({color:0xaab6bd,metalness:.57,roughness:.43});
const white=new T.MeshStandardMaterial({color:0xf5f7f6,metalness:.05,roughness:.76});
const dark=new T.MeshStandardMaterial({color:0x30373c,metalness:.22,roughness:.54});
const navy=new T.MeshStandardMaterial({color:0x285b9e,metalness:.04,roughness:.89});
const screenGlass=new T.MeshStandardMaterial({color:0x161f23,metalness:.13,roughness:.45});
function addRound(group,x,y,z,diameter,h,material){
 const mesh=new T.Mesh(circle,material);
 mesh.scale.set(diameter,h,diameter);mesh.position.set(x,y,z);mesh.userData.editId=group.userData.editId;
 group.add(mesh);return mesh;
}
export function populateProcedural(item,group,put){
 const entry=proceduralOf(item);if(!entry)return false;
 const w=item.w,d=item.d,h=item.height;
 const box=(x,y,z,ww,hh,dd,mat)=>put(x,y,z,ww,hh,dd,mat);
 const legs=(top,legH=.045)=>{
  for(const x of [-w*.44,w*.44])for(const z of[-d*.4,d*.4])
   box(x,top/2,z,legH,top-.04,legH,metallic);
 };
 switch(entry.shape){
  case 'desk':case 'table':
   box(0,h-.035,0,w,.07,d,white);legs(h-.06);break;
  case 'round':
   addRound(group,0,h-.035,0,w,.07,white);
   addRound(group,0,(h-.08)/2,0,.08,h-.08,metallic);
   addRound(group,0,.025,0,Math.min(.56,w*.58),.05,metallic);break;
  case 'screen':
   // Screen is freestanding on desk; smart placement snaps to rear desktop edge.
   box(0,h*.53,0,w,h*.89,d,navy);
   for(const x of [-w*.40,w*.40])box(x,.035,0,.09,.07,.12,dark);
   break;
  case 'counter':
   box(0,h-.035,0,w,.07,d,white);
   box(0,(h-.07)/2,0,w*.95,h-.10,d*.94,white);
   for(const x of [-w*.18,w*.18])box(x,h*.47,-d*.48,.012,.30,.016,metallic);
   break;
  case 'microwave':
   box(0,h/2,0,w,h,d,dark);
   box(0,h*.55,-d*.504,w*.74,h*.65,.014,screenGlass);
   box(w*.43,h*.57,-d*.518,.026,.19,.018,metallic);
   box(w*.40,h*.24,-d*.518,.035,.035,.02,metallic);break;
  case 'monitor':
   box(0,h*.64,0,w,h*.68,.035,dark);
   box(0,h*.65,-.022,w*.94,h*.6,.008,screenGlass);
   box(0,h*.23,.025,.036,h*.3,.05,metallic);
   box(0,.03,.05,w*.35,.055,d*.8,dark);break;
  case 'keyboard':
   box(0,h/2,0,w,h,d,dark);
   for(let z=-2;z<=2;z++)for(let x=-6;x<=6;x++)
    box(x*w/14,h*.97,z*d/6,w/17,.004,d/8,metallic);
   break;
  case 'printer':
   box(0,h*.47,0,w,h*.8,d,white);
   box(0,h*.92,-d*.09,w*.78,.035,d*.65,dark);
   box(0,h*.22,-d*.515,w*.72,.045,.02,dark);break;
  case 'machine':case 'coffee':
   box(0,h*.48,0,w,h*.91,d,white);
   box(0,h*.75,-d*.505,w*.59,h*.25,.016,dark);
   box(0,h*.22,-d*.51,w*.58,.018,.015,metallic);break;
  case 'cabinet':
   box(0,h/2,0,w,h,d,white);
   box(0,h*.50,-d*.51,w*.018,h*.93,.018,metallic);
   for(const x of [-.08,.08])box(x,h*.51,-d*.54,.022,.14,.025,metallic);break;
  default:box(0,h/2,0,w,h,d,white);
 }
 return true;
}
