"""One-shot, hash-checked correction of the inspected 6.1 sources; branch only."""
from pathlib import Path
import hashlib,json,subprocess
checks={'src/fps/character-library.mjs':'00ad1737af5486d3218d778f7fe8e5ac4ac514df7c2006f03fe030c362704b8d','character-design/fashion-preview.mjs':'52a7520d81c3518c9bd2c2491b671c3c0670ddbe942be9717bb4b1b1911d392e'}
for file,sha in checks.items():
    assert hashlib.sha256(Path(file).read_bytes()).hexdigest()==sha,file+' has changed'
p=Path('src/fps/character-library.mjs');s=p.read_text()
s=s.replace('import {makeFootwear}', 'import {makeFittedFootwear}')
a="""  const foot=bones.get('foot_'+side),p=restPosition(foot),x=p.x;
  const footwear=makeFootwear();
  const sole=attached(footwear.sole,rubber,new T.Vector3(x,0,0),foot,'boot-sole-'+side);
  const upper=attached(footwear.upper,leather,new T.Vector3(x,0,0),foot,'shoe-upper-'+side);
  sole.userData.footwear='low-profile-v1';upper.userData.footwear='low-profile-v1';
  sole.geometry.computeBoundingBox();shoes.push(sole);"""
b="""  const {sole,upper}=makeFittedFootwear({root,bones,meshes,side,soleMaterial:rubber,upperMaterial:leather});
  ownedGeometry.push(sole.geometry,upper.geometry);meshes.push(sole,upper);shoes.push(sole);"""
assert s.count(a)==1;s=s.replace(a,b)
s=s.replace(',metal=standard(0x8b989c,.4,.65)','').replace("const pelvis=bones.get('pelvis'),chest=",'const chest=')
s='\n'.join(l for l in s.split('\n') if "'duty-belt'" not in l and "'belt-buckle'" not in l)
needle=' root.updateMatrixWorld(true);\n const restPosition='
assert s.count(needle)==1
s=s.replace(needle," // GLB node transforms may store an animation pose; attachments use inverse-bind rest.\n root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.pose();});\n root.updateMatrixWorld(true);\n const restPosition=")
p.write_text(s)
p=Path('character-design/fashion-preview.mjs');s=p.read_text()
a="if(name==='trousers-fabric')for(let i=0;i<pos.count;i++)pos.setZ(i,source[i*3+2]*fit);"
b="// Preserve the ankle opening: garment fit tapers to zero at the cuffs.\n   if(name==='trousers-fabric')for(let i=0;i<pos.count;i++)pos.setZ(i,source[i*3+2]*(avatar.isDwarf?fit:1+(fit-1)*clamp((source[i*3+1]-.25)/.20,0,1)));"
assert s.count(a)==1;p.write_text(s.replace(a,b))
p=Path('character-design/runtime-export.mjs');s=p.read_text();assert "'low-profile-v1'" in s;p.write_text(s.replace("'low-profile-v1'","'ankle-fitted-v2'").replace("studioVersion:'6.1'","studioVersion:'6.1.1'").replace('karaktärspaket 6.1\\n','karaktärspaket 6.1.1\\n'))
p=Path('character-design/index.html');s=p.read_text();assert '<span class="edition">6.1</span>' in s;p.write_text(s.replace('<span class="edition">6.1</span>','<span class="edition">6.1.1</span>'))
p=Path('character-design/app.mjs');s=p.read_text();p.write_text(s.replace("studioVersion:'6.1'","studioVersion:'6.1.1'"))
# Refresh the existing cache dependency chain; no versioned asset binaries change.
for f in subprocess.check_output(['git','ls-files','-z']).decode().split('\0'):
    p=Path(f)
    if p.is_file() and p.suffix in {'.mjs','.js','.html','.css'} and not f.startswith(('vendor/','frontline/')):
        s=p.read_text();new=s.replace('v=6.1.0','v=6.1.1')
        if new!=s:p.write_text(new)
p=Path('build-info.json');info=json.loads(p.read_text())
for row in info['files']:
    b=Path(row['path']).read_bytes();row['bytes']=len(b);row['sha256']=hashlib.sha256(b).hexdigest()
info['bytes']=sum(r['bytes'] for r in info['files']);p.write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
