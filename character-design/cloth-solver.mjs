/** Fixed-step XPBD distance/bend cloth, Verlet inertia and swept-body capsules.
 * No self collision or garment sewing. Rest lengths and pinning are immutable.
 */
export class ClothSolver{
 constructor(positions,edges,pins,{compliance=2e-7,damping=.985}={}){this.rest=Float64Array.from(positions);this.positions=Float64Array.from(positions);this.previous=Float64Array.from(positions);this.pins=new Set(pins);this.compliance=compliance;this.damping=damping;this.edges=edges.map(([a,b,bend=1])=>({a,b,length:Math.hypot(...[0,1,2].map(k=>positions[a*3+k]-positions[b*3+k])),compliance:compliance*bend,lambda:0}));this.time=0;}
 reset(target=this.rest){this.positions.set(target);this.previous.set(target);this.time=0;}
 step(dt,targets,capsules=[],wind=0){
  if(!Number.isFinite(dt)||dt<=0||dt>1/30)throw Error('Invalid cloth timestep');const p=this.positions,old=this.previous;
  for(let i=0;i<p.length/3;i++){const at=i*3;if(this.pins.has(i)){for(let k=0;k<3;k++)p[at+k]=old[at+k]=targets[at+k];continue;}for(let k=0;k<3;k++){const v=p[at+k],force=k===1?-9.81:k===2?wind*(.6+.4*Math.sin(this.time*2+i*.13)):wind*.17*Math.cos(this.time*1.3);p[at+k]+=(v-old[at+k])*this.damping+force*dt*dt;old[at+k]=v;}}
  for(const c of this.edges)c.lambda=0;
  for(let iteration=0;iteration<7;iteration++){
   for(const c of this.edges){const a=c.a*3,b=c.b*3,dx=p[a]-p[b],dy=p[a+1]-p[b+1],dz=p[a+2]-p[b+2],len=Math.hypot(dx,dy,dz);if(len<1e-9)continue;const wa=this.pins.has(c.a)?0:1,wb=this.pins.has(c.b)?0:1,alpha=c.compliance/(dt*dt),dl=(-(len-c.length)-alpha*c.lambda)/(wa+wb+alpha||1);c.lambda+=dl;for(let k=0;k<3;k++){const n=[dx,dy,dz][k]/len;p[a+k]+=wa*dl*n;p[b+k]-=wb*dl*n;}}
   for(let i=0;i<p.length/3;i++){if(this.pins.has(i))continue;const at=i*3;for(const {a,b,r}of capsules){const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],length=ab.reduce((s,v)=>s+v*v,0),t=Math.max(0,Math.min(1,ab.reduce((s,v,k)=>s+(p[at+k]-a[k])*v,0)/(length||1))),d=ab.map((v,k)=>p[at+k]-a[k]-v*t),dist=Math.hypot(...d);if(dist<r&&dist>1e-9)for(let k=0;k<3;k++)p[at+k]+=d[k]*(r-dist)/dist;}p[at+1]=Math.max(.012,p[at+1]);}
  }
  this.time+=dt;if(p.some(v=>!Number.isFinite(v)))throw Error('Cloth solver diverged');
 }
}
