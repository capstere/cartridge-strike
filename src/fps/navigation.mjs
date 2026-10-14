import { AStar, Graph, NavNode, NavEdge, Vector3 } from '../../vendor/yuka/yuka.module.js';
import { ACTOR_RADIUS, SpatialIndex, polygonBounds } from './physics.mjs';

/** Yuka navigation graph generated from accepted routes + collision-validated floor samples.
 * All edges are swept with the actor footprint. The old reviewed routes provide samples
 * in narrow apertures where a regular grid alone could miss a valid existing doorway.
 */
export function createNavigation(data,physics,{spacing=.70,radius=ACTOR_RADIUS+.002,clearanceCacheLimit=8192}={}){
  const graph=new Graph(),nodes=[],index=new SpatialIndex(1),dedup=new Map(),edgeKeys=new Set(),cache=new Map();
  const started=performance.now();
  const clearanceCache=new Map(),clearanceStats={calls:0,hits:0,samples:0,size:0,limit:Math.max(0,Math.floor(clearanceCacheLimit))};
  let cacheClearance=false;
  function remember(key,result){
    if(key){if(clearanceCache.size>=clearanceStats.limit)clearanceCache.delete(clearanceCache.keys().next().value);clearanceCache.set(key,result);clearanceStats.size=clearanceCache.size;}
    return result;
  }
  function clear(a,b,r=radius){
    // Static capsule clearance is symmetric. Preserve every coordinate bit in
    // the key: rounding could accidentally permit a wall-edge penetration.
    // Dynamic actors are resolved separately by Game and never enter this cache.
    let key=null;
    if(cacheClearance){
      clearanceStats.calls++;
      if(clearanceStats.limit){const first=a.x<b.x||a.x===b.x&&a.z<=b.z;const p=first?a:b,q=first?b:a;key=`${r}:${p.x},${p.z}:${q.x},${q.z}`;const cached=clearanceCache.get(key);if(cached!==undefined){clearanceStats.hits++;return cached;}}
    }
    const distance=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(distance/.075));
    for(let i=0;i<=steps;i++){if(cacheClearance)clearanceStats.samples++;if(!physics.canOccupy(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps,r))return remember(key,false);}
    return remember(key,true);
  }
  function add(x,z){
    const key=`${x.toFixed(3)},${z.toFixed(3)}`;if(dedup.has(key))return dedup.get(key);
    if(!physics.canOccupy(x,z,radius))return -1;
    const n={id:nodes.length,x,z};nodes.push(n);dedup.set(key,n.id);graph.addNode(new NavNode(n.id,new Vector3(x,0,z)));index.insert(n,{minX:x,maxX:x,minZ:z,maxZ:z});return n.id;
  }
  function connect(a,b){
    if(a===b||a<0||b<0)return;const key=a<b?`${a}:${b}`:`${b}:${a}`;if(edgeKeys.has(key))return;
    const from=nodes[a],to=nodes[b];if(!clear(from,to))return;
    graph.addEdge(new NavEdge(a,b,Math.hypot(to.x-from.x,to.z-from.z)));edgeKeys.add(key);
  }
  for(const route of data.routes)for(const segment of route.segments){
    let previous=-1;
    for(let j=0;j<segment.points.length-1;j++){
      const a=segment.points[j],b=segment.points[j+1],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.65));
      for(let i=0;i<=steps;i++){
        const id=add(a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps);connect(previous,id);previous=id;
      }
    }
  }
  // Sampling within each actual polygon avoids allocating a rectangular grid over excluded rooms.
  for(const polygon of data.floorPolygons){
    const b=polygonBounds(polygon);
    for(let x=Math.ceil(b.minX/spacing)*spacing;x<=b.maxX;x+=spacing)for(let z=Math.ceil(b.minZ/spacing)*spacing;z<=b.maxZ;z+=spacing)add(x,z);
  }
  for(const door of data.doors.filter(d=>!d.blocked)){
    const [x,z]=door.center,dx=door.b[0]-door.a[0],dz=door.b[1]-door.a[1],length=Math.hypot(dx,dz);
    for(const offset of [-.65,0,.65])add(x-dz/length*offset,z+dx/length*offset);
  }
  for(const n of nodes){
    const neighbors=[...index.nearby(n.x,n.z,1.04)].filter(m=>m.id<n.id&&Math.hypot(m.x-n.x,m.z-n.z)<=1.04);
    for(const other of neighbors)connect(n.id,other.id);
  }
  // Label connected components once; an impossible objective must fail loudly, never teleport.
  const component=new Int32Array(nodes.length).fill(-1),out=[];let components=0;
  for(const n of nodes)if(component[n.id]<0){const queue=[n.id];component[n.id]=components;for(let q=0;q<queue.length;q++){graph.getEdgesOfNode(queue[q],out);for(const e of out)if(component[e.to]<0){component[e.to]=components;queue.push(e.to);}}components++;}
  // Construction performs many one-off probes; only retain live path queries.
  cacheClearance=true;
  function nearest(point){
    for(const distance of [1.2,2.6,5.2,10]){
      const choices=[...index.nearby(point.x,point.z,distance)].sort((a,b)=>Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z));
      for(const n of choices)if(clear(point,n,ACTOR_RADIUS))return n;
    }
    return null;
  }
  function findPath(from,to){
    if(!from||!to||![from.x,from.z,to.x,to.z].every(Number.isFinite))return [];
    if(clear(from,to,ACTOR_RADIUS))return [{x:to.x,z:to.z}];
    const start=nearest(from),end=nearest(to);if(!start||!end||component[start.id]!==component[end.id])return [];
    const key=`${start.id}:${end.id}`;let ids=cache.get(key);
    if(!ids){const search=new AStar(graph,start.id,end.id).search();if(!search.found)return [];ids=search.getPath();if(cache.size>512)cache.clear();cache.set(key,ids);}
    const raw=[{x:from.x,z:from.z},...ids.map(id=>({x:nodes[id].x,z:nodes[id].z})),{x:to.x,z:to.z}],path=[];
    let current=0;
    while(current<raw.length-1){
      let next=current+1;
      // A bounded lookahead smooths routes without expensive full-map visibility sweeps.
      for(let i=Math.min(raw.length-1,current+32);i>current+1;i--)if(clear(raw[current],raw[i],ACTOR_RADIUS+.001)){next=i;break;}
      path.push(raw[next]);current=next;
    }
    return path;
  }
  return {findPath,clear,nearest,nodes,graph,statistics:{nodes:nodes.length,edges:edgeKeys.size,components,buildMs:Math.round(performance.now()-started),clearance:clearanceStats,library:'Yuka Graph/NavNode/NavEdge/AStar'}};
}
