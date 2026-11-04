/** Low-profile, continuous footwear. No stacked boxes, shafts or floating laces.
 * Coordinates are the original operator bind space; skeleton and motions unchanged.
 */
import * as T from '../../vendor/three/three.module.js';
const outline=[[-.043,-.105],[-.057,-.078],[-.059,-.015],[-.063,.045],[-.058,.105],[-.036,.135],[0,.143],[.036,.135],[.058,.105],[.063,.045],[.059,-.015],[.057,-.078],[.043,-.105],[0,-.112]];
function loft(rings){
 const vertices=[],uv=[],indices=[],n=outline.length;
 for(let r=0;r<rings.length;r++)for(let i=0;i<n;i++){
  const [sx,sz,y,zshift]=rings[r],[x,z]=outline[i];vertices.push(x*sx,y,z*sz+zshift);uv.push(i/n,r/(rings.length-1));
 }
 for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++){
  const a=r*n+i,b=r*n+(i+1)%n,c=a+n,d=b+n;indices.push(a,c,b,b,c,d);
 }
 for(const [r,flip]of [[0,true],[rings.length-1,false]]){
  const start=vertices.length/3,ys=rings[r][2];vertices.push(0,ys,rings[r][3]);uv.push(.5,.5);
  for(let i=0;i<n;i++){const a=r*n+i,b=r*n+(i+1)%n;indices.push(...(flip?[start,b,a]:[start,a,b]));}
 }
 for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();return g;
}
export function makeFootwear(){
 // Rounded toe-box narrows into a modest ankle collar under the trouser cuff.
 return {
 sole:loft([[.96,.99,.008,.026],[1,1,.017,.026],[1,1,.032,.026],[.96,.98,.037,.026]]),
 upper:loft([[.96,.98,.033,.026],[.94,.96,.057,.026],[.89,.85,.079,.018],[.72,.52,.105,-.009],[.69,.40,.143,-.023],[.69,.40,.184,-.023]])
 };
}
export function isLegacyFootwear(mesh){return mesh.userData?.legacyFootwear===true||mesh.material?.name==='boots-leather';}
