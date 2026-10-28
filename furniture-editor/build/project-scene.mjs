/** Resolve editable geometry once for the studio, collision export and FPS adapter. */
import '../../src/floor5-data.js';
import '../../src/world.js';
import {createFurnishings} from '../../src/fps/furnishings.mjs';
import {catalog,inside,distanceSegment,EDITABLE_KINDS,exportPatch,isChanged} from '../core.mjs';
import {readBaseline,parseArchitecture,exportArchitecture} from './architecture.mjs';

let baseline;
export function floor5Baseline(){
 if(baseline)return baseline;
 const source=globalThis.SpelWorld,data=source.data;
 const description=source.build({doors:Object.fromEntries(data.doors.filter(d=>d.accessCardConfirmed).map(d=>[d.id,true]))});
 const furnishings=createFurnishings(data,description,{inside,distanceSegment});
 baseline={data,entries:readBaseline(data),items:catalog(data,furnishings),description,furnishings};
 return baseline;
}
const rectangle=f=>({...f,polygon:[[f.x0,f.z0],[f.x1,f.z0],[f.x1,f.z1],[f.x0,f.z1]]});
export function resolveProjectScene(project){
 if(project.mode==='new-level')return {entries:project.architecture.added,items:project.furniture.added,
  floors:project.ground.floors.map(rectangle),fixed:[],baselineEntries:[],baselineItems:[]};
 const base=floor5Baseline(),patch=project.furniture;
 const overrides=new Map(patch.placements.map(o=>[o.id,o])),removed=new Set(patch.removed);
 const items=base.items.filter(o=>!removed.has(o.id)).map(o=>({...o,...overrides.get(o.id),original:{...o}}));
 items.push(...structuredClone(patch.added));
 const entries=parseArchitecture(project.architecture,base.entries).entries.filter(e=>!e.deleted);
 const zones=[...base.data.rooms.map(r=>({...r,role:'room'})),...base.data.corridors.map(r=>({...r,role:'corridor'}))]
  .filter(r=>r.status!=='uncertain').map(r=>({...r,source:true,surface:['I01','I02','I03','I04','I29'].includes(r.id)?'vinyl':'carpet',
   x0:Math.min(...r.polygon.map(p=>p[0])),x1:Math.max(...r.polygon.map(p=>p[0])),z0:Math.min(...r.polygon.map(p=>p[1])),z1:Math.max(...r.polygon.map(p=>p[1]))}));
 const extra=project.architecture.floors.filter(f=>!project.ground.floors.some(g=>g.id===f.id)).map(f=>({...f,role:'room',surface:'carpet'}));
 const fixed=project.legacyPatch?.emptyFixed?[]:base.data.obstacles.filter(o=>!EDITABLE_KINDS[o.kind]&&o.kind!=='uncertain-area');
 return {entries,items,floors:[...zones,...project.ground.floors.map(rectangle),...extra.map(rectangle)],fixed,
  baselineEntries:base.entries,baselineItems:base.items};
}
export function writeProjectScene(project,scene){
 if(project.mode==='new-level')return project;
 const previous=project.architecture;
 const present=new Set(scene.entries.map(e=>e.id));
 const all=[...scene.entries,...scene.baselineEntries.filter(e=>!present.has(e.id)).map(e=>({...e,deleted:true}))];
 project.architecture={...previous,...exportArchitecture(all,scene.baselineEntries,previous.floors),posters:previous.posters||[],treatments:previous.treatments||[]};
 const patch=exportPatch(scene.items,scene.baselineItems);
 // Level-project overrides preserve the complete authored pose, including mounts.
 const originals=new Map(scene.baselineItems.map(o=>[o.id,o]));
 patch.placements=scene.items.filter(o=>{const b=originals.get(o.id);return b&&(isChanged(o,b)||['height','collision','mountId','elevation'].some(k=>o[k]!==b[k]));})
  .map(({original,source,...o})=>o);
 patch.added=scene.items.filter(o=>!originals.has(o.id)).map(({original,source,...o})=>o);
 project.furniture={placements:patch.placements,added:patch.added,removed:patch.removed};
 project.legacyPatch={...project.legacyPatch,...patch,emptyFixed:project.legacyPatch?.emptyFixed===true,architecture:project.architecture};
 return project;
}
