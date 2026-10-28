import {parseProject} from './level-project.mjs';
import {levelProjectToWorldData} from '../../src/fps/level-adapter.mjs';
import {createWorld} from '../../src/fps/world.mjs';
import {corners,inside,intersects,segmentIntersectsRectangle} from '../core.mjs';
import {wallPieces} from './architecture.mjs';

/** Validation never labels a structural-only result playable. */
export function validateLevel(input,{engine=false}={}){
 const results=[];const add=(check,status,detail,id,fix)=>results.push({check,status,detail,...(id?{id}:{}),...(fix?{fix}:{})});
 let p;try{p=parseProject(input);}catch(e){add('V14','fail',e.message,null,'Rätta filformatet och öppna projektet igen.');return report(false,results);}
 const g=p.ground,play=p.gameplay,entries=p.architecture.added;
 const points=[...play.spawns,...[play.objectives.bomb,play.objectives.rescue,...play.objectives.hostages].filter(Boolean)];
 for(const team of ['analysts','counterAnalysts']){
  const actual=play.spawns.filter(s=>s.team===team).length;
  if(actual<play.counts[team])add('V03','fail',`${team}: ${actual} av ${play.counts[team]} startpunkter.`,team,'Placera alla fem lagmedlemmar i SPEL.');
 }
 if(!results.some(r=>r.check==='V03'))add('V03','pass','Båda lagen har angivet antal startpunkter.');
 if(!g.floors.length)add('V04','fail','Banan saknar golv.','ground','Rita minst ett rum eller en korridor.');
 for(const x of points)if(!g.floors.some(f=>x.x>=f.x0&&x.x<=f.x1&&x.z>=f.z0&&x.z<=f.z1))add('V04','fail',`${x.id} ligger utanför golvet.`,x.id,'Dra punkten innanför en golvyta.');
 if(!results.some(r=>r.check==='V04'))add('V04','pass','Punkter ligger inom grundytans golv.');
 add('V05','pass','ID och datatyper kontrollerade av projektparsern.');
 for(const e of entries.filter(e=>['door','card-door','opening'].includes(e.kind))){
  const width=Math.hypot(e.a[0]-e.b[0],e.a[1]-e.b[1]);
  if(width<1.10-1e-6)add('V06','fail',`${e.kind} är ${width.toFixed(2)} modellenheter bred.`,e.id,'Öka till minst 1,10 modellenheter.');
 }
 if(!results.some(r=>r.check==='V06'))add('V06','pass','Nya dörrar och passager når 1,10 modellenheter nominellt.');
 add('V09','pass','Dörrar använder motorns automatiska gångjärn och svängriktning.');
 if(!engine)add('V10','info','Glasets kollisions- och skottlogik väntar på motorvalidering.');
 for(const f of g.floors.filter(f=>f.role==='corridor'))if(Math.min(f.x1-f.x0,f.z1-f.z0)<2-1e-6)
  add('V15','warn',`Korridor ${f.name} är smalare än 2,0 modellenheter.`,f.id,'Bredda korridoren för enklare spel.');
 if(!engine&&!results.some(r=>r.check==='V15'))add('V15','info','Nominell korridorbredd kontrollerad; fri bredd väntar på 0,1-rutnät i motorn.');
 add('V14','pass','Storlek och antal ligger inom schema- och importgränser.');
 if(!engine)return report(false,results);
 if(results.some(r=>r.status==='fail'))return report(true,results);
 if(!play.objectives.bomb||!play.objectives.rescue||play.objectives.hostages.length<2){
  add('V01','fail','Bomb, rescue och två gisslan krävs för klassiskt spel.',null,'Placera målen i SPEL.');return report(true,results);
 }
 let world;try{world=createWorld({levelProject:p,fresh:true});}catch(e){add('V01','fail','Motorn kunde inte bygga banan: '+e.message,null,'Kontrollera geometri och spawns.');return report(true,results);}
 const walls=wallPieces(entries),furniture=p.furniture.added;
 for(const o of furniture){
  const footprint=corners(o);
  if(!g.floors.some(f=>footprint.every(([x,z])=>x>=f.x0&&x<=f.x1&&z>=f.z0&&z<=f.z1)))
   add('V08','fail','Möbeln ryms inte helt på en golvyta.',o.id,'Flytta möbeln inåt.');
  for(const w of walls)if(segmentIntersectsRectangle(w.a,w.b,o,Math.max(.012,w.thickness/2-.007)))
   add('V08','fail','Möbeln överlappar en vägg eller glasyta.',o.id,'Flytta möbeln från väggen.');
  for(const d of world.data.doors.filter(d=>!d.blocked))if(segmentIntersectsRectangle(d.a,d.b,o,.35))
   add('V07','fail','Möbeln blockerar dörrens fria zon.',o.id,'Flytta möbeln minst 0,35 från dörren.');
  for(const other of furniture)if(other.id<o.id&&o.mountId!==other.id&&other.mountId!==o.id&&intersects(footprint,corners(other)))
   add('V08','fail',`Möbeln överlappar ${other.id}.`,o.id,'Separera möblerna eller använd ett giltigt smart fäste.');
  if(o.mountId&&!furniture.some(s=>s.id===o.mountId&&o.elevation>=.3))add('V08','fail','Smart fäste saknas eller har ogiltig höjd.',o.id,'Placera på ett befintligt bord eller en bänk.');
 }
 if(!results.some(r=>r.check==='V07'&&r.status==='fail'))add('V07','pass','Inga möbler blockerar dörrarnas frizoner.');
 if(!results.some(r=>r.check==='V08'&&r.status==='fail'))add('V08','pass','Möblernas fotavtryck, väggar och fästen kontrollerade.');
 for(const w of world.data.walls.filter(w=>['glazed','window'].includes(w.surfaceType))){
  const panes=[...world.glass.panes.values()].filter(x=>x.wallId===w.id);
  if(!panes.length||world.staticCanOccupy((w.a[0]+w.b[0])/2,(w.a[1]+w.b[1])/2,.2))
   add('V10','fail','Glasytan saknar fysisk glasruta eller blockerar inte rörelse.',w.id,'Kontrollera väggens längd och överlapp.');
 }
 if(!results.some(r=>r.check==='V10'&&r.status==='fail'))add('V10','pass','Motorns glasrutor blockerar rörelse och kan krossas av skott.');
 const targets=[play.objectives.bomb,play.objectives.rescue,...play.objectives.hostages];
 for(const f of g.floors.filter(f=>f.role==='corridor')){
  const alongX=f.x1-f.x0>=f.z1-f.z0,low=alongX?f.z0:f.x0,high=alongX?f.z1:f.x1,
   start=alongX?f.x0:f.z0,end=alongX?f.x1:f.z1;
  let minimum=Infinity;
  for(let along=start+.5;along<=end-.5;along+=.5){let run=0,best=0;
   for(let across=low+.05;across<=high-.05;across+=.1){const x=alongX?along:across,z=alongX?across:along;
    if(world.staticCanOccupy(x,z,.2)){run++;best=Math.max(best,run);}else run=0;}
   minimum=Math.min(minimum,best*.1+.4);
  }
  if(minimum<2-1e-6)add('V15','warn',`Fri korridorbredd cirka ${minimum.toFixed(2)} modellenheter på 0,1-rutnät.`,f.id,'Bredda korridoren eller flytta blockerande objekt.');
 }
 if(!results.some(r=>r.check==='V15'))add('V15','pass','Fri korridorbredd kontrollerad med motorns kapsel på 0,1-rutnät.');
 for(const x of points)if(!world.staticCanOccupy(x.x,x.z,.20))add('V02','fail',`${x.id} ligger i en kollisionsyta.`,x.id,'Flytta punkten minst en spelarradie från vägg eller möbel.');
 if(!results.some(r=>r.check==='V02'))add('V02','pass','Alla spawns och mål är fria för motorns kapsel.');
 for(const spawn of play.spawns)for(const target of targets)if(!world.findPath(spawn,target).length)
  add('V01','fail',`${spawn.id} kan inte nå ${target.id}.`,spawn.id,'Öppna en sammanhängande passage och kontrollera möbler.');
 if(!results.some(r=>r.check==='V01'))add('V01','pass',`${play.spawns.length} startpunkter når alla ${targets.length} mål i navigationsmotorn.`);
 for(const d of world.data.doors.filter(d=>!d.blocked&&!d.lockedUntilImplemented)){
  const dx=d.b[0]-d.a[0],dz=d.b[1]-d.a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
  const a={x:d.center[0]+nx*.85,z:d.center[1]+nz*.85},b={x:d.center[0]-nx*.85,z:d.center[1]-nz*.85};
  if(!world.staticCanOccupy(a.x,a.z,.20)||!world.staticCanOccupy(b.x,b.z,.20)||
   !world.findPath(a,b).length||!world.findPath(b,a).length)
   add('V06','fail','Motorns kapsel/navigering når inte igenom dörren i båda riktningar.',d.id,'Rensa dörrzonen och pröva bredare öppning.');
 }
 if(!results.some(r=>r.check==='V06'&&r.status==='fail'))add('V06','pass','Båda riktningar genom aktiva dörrar testade med motorns kapsel och navigering.');
 for(const f of g.floors)if(!world.navigation.nodes.some(n=>n.x>f.x0&&n.x<f.x1&&n.z>f.z0&&n.z<f.z1))
  add('V11','warn',`Ingen nåbar navigationspunkt i ${f.name}.`,f.id,'Anslut golvytan och frigör plats.');
 if(!results.some(r=>r.check==='V11'))add('V11','pass','Golvytorna har navigationspunkter.');
 const a=world.anchors.analysts,c=world.anchors.counterAnalysts;
 if(a.some(x=>c.some(y=>world.segmentClear({...x,y:1.5},{...y,y:1.5}))))add('V13','warn','Motståndarnas startpunkter har direkt siktlinje.',null,'Lägg skydd mellan lagen.');
 else add('V13','pass','Ingen direkt sikt mellan lagens spawns.');
 add('V12','info','Bedöm långa siktlinjer och skydd i 3D-vyn.');
 add('V16','info','Navigering använder båda öppna dörrbladslägena; fysisk sväng styrs vid aktörens ankomst.');
 return report(true,results);
}
function report(engine,results){const errors=results.filter(r=>r.status==='fail').length,warnings=results.filter(r=>r.status==='warn').length;
 return {tool:'level-validator',toolVersion:'1.0.0',ranAt:new Date().toISOString(),engine:{ran:engine,navigationSpacing:engine?.7:null,actorRadius:.2,widthGrid:.1},
  summary:{errors,warnings,playable:engine&&errors===0},results};}
