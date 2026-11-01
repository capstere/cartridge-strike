/** Optional schema-2 appearance overrides. Geometry and original materials stay unchanged. */
import {FINISH_COLORS,architecturalFinish} from '../appearance.mjs';
export const validPaint=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
export function surfaceColor(project,item){return project.surfaceColors?.[item.id]||
 (item.kind?FINISH_COLORS[architecturalFinish(item.kind,item.finish)]:item.surface==='vinyl'?'#b7d6d0':'#d8cbbb');}
export function validateSurfaceColors(project,ids){
 if(project.surfaceColors===undefined)return;
 const colors=project.surfaceColors;
 if(!colors||typeof colors!=='object'||Array.isArray(colors)||Object.keys(colors).length>1000)throw Error('Ogiltiga ytfärger.');
 for(const [id,color] of Object.entries(colors))if(!ids.has(id)||!validPaint(color))throw Error('Ogiltig ytfärg eller okänd byggdel: '+id);
}
/** The same source records feed studio preview and the FPS renderer. */
export function paintDescription(description,data){
 for(const wall of data.walls)if(wall.studioColor)for(const box of description.boxes){
  if((box.id===wall.id||box.id.startsWith(wall.id+'-'))&&!['glass','frosted'].includes(box.material)&&!box.id.endsWith('-skirt'))box.studioColor=wall.studioColor;
 }
 for(const zone of [...data.rooms,...data.corridors])if(zone.studioColor){const surface=description.surfaces.find(s=>s.id==='finish-'+zone.id);if(surface)surface.studioColor=zone.studioColor;}
 for(const door of data.doors)if(door.studioColor)for(const box of description.boxes)if(box.id===door.id+'-leaf'||box.id===door.id+'-sealed-leaf')box.studioColor=door.studioColor;
 return description;
}
/** Carry a wall's paint to surviving pieces when a door splits its span. */
export function reconcileSurfaceColors(project,previous,entries,oldEntries,floors){
 if(!project.surfaceColors)return;
 const oldIds=new Set(oldEntries.map(e=>e.id));
 const contains=(outer,inner)=>inner.a&&inner.b&&[inner.a,inner.b].every(([x,z])=>{
  const dx=outer.b[0]-outer.a[0],dz=outer.b[1]-outer.a[1],len2=dx*dx+dz*dz,t=((x-outer.a[0])*dx+(z-outer.a[1])*dz)/len2;
  return len2>0&&t>=-1e-5&&t<=1+1e-5&&Math.abs((x-outer.a[0])*dz-(z-outer.a[1])*dx)<1e-5*Math.sqrt(len2);
 });
 for(const e of entries)if(!oldIds.has(e.id)&&!project.surfaceColors[e.id]){
  const parent=oldEntries.find(old=>old.kind===e.kind&&previous.surfaceColors?.[old.id]&&old.a&&contains(old,e));
  if(parent)project.surfaceColors[e.id]=previous.surfaceColors[parent.id];
 }
 const ids=new Set([...entries,...floors].map(e=>e.id));for(const id of Object.keys(project.surfaceColors))if(!ids.has(id))delete project.surfaceColors[id];
}
