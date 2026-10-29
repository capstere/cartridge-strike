/** Portable, deterministic v2 concept format. No browser or 3D dependencies. */
export const FORMAT='cartridge-strike-character-project';
export const VERSION=2;
export const REQUIRED_CLIPS=Object.freeze(['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop','Jump_Loop','Crouch_Idle_Loop','Crouch_Fwd_Loop','Pistol_Idle_Loop','Pistol_Shoot','Pistol_Reload','Death01']);
export const ANCHORS=Object.freeze({root:'Fristående / kropp',Head:'Huvud',spine_03:'Bröst / rygg',pelvis:'Midja',hand_l:'Vänster hand',hand_r:'Höger hand',foot_l:'Vänster fot',foot_r:'Höger fot'});
export const SHAPES=Object.freeze({box:'Kub / låda',sphere:'Kula',cylinder:'Cylinder',cone:'Kon',torus:'Ring'});
export const PALETTES=Object.freeze({
  analysts:{jacket:'#22435e',pants:'#22435e',vest:'#132d42',skin:'#e8d1b9',hair:'#49372a',boots:'#243039',accent:'#5aa8cf'},
  counterAnalysts:{jacket:'#9b967c',pants:'#9b967c',vest:'#505b42',skin:'#c6a486',hair:'#261e19',boots:'#243039',accent:'#c9ad65'},
  civilian:{jacket:'#dedecf',pants:'#475462',vest:'#b9babb',skin:'#e8d1b9',hair:'#49372a',boots:'#343b42',accent:'#468e8c'},
  blank:{jacket:'#7c8794',pants:'#7c8794',vest:'#7c8794',skin:'#d6ac8e',hair:'#3e2921',boots:'#35373b',accent:'#d7a54b'}
});
export const PRESETS=Object.freeze({
  cap:{label:'Keps',shape:'box',anchor:'Head',position:[0,1.748,-.01],dimensions:[.29,.08,.27],color:'#354953'},
  glasses:{label:'Glasögon',shape:'box',anchor:'Head',position:[0,1.635,.11],dimensions:[.24,.045,.055],color:'#222d39'},
  beard:{label:'Skägg',shape:'box',anchor:'Head',position:[0,1.518,.117],dimensions:[.16,.075,.065],color:'#413127'},
  hair:{label:'Hår / uppsättning',shape:'sphere',anchor:'Head',position:[0,1.765,0],dimensions:[.26,.13,.23],color:'#36261e'},
  helmet:{label:'Hjälm',shape:'sphere',anchor:'Head',position:[0,1.75,-.005],dimensions:[.29,.16,.29],color:'#353f51'},
  backpack:{label:'Ryggsäck',shape:'box',anchor:'spine_03',position:[0,1.18,-.19],dimensions:[.3,.40,.17],color:'#394851'},
  badge:{label:'Märke',shape:'box',anchor:'spine_03',position:[.08,1.38,.185],dimensions:[.09,.08,.013],color:'#e2ac53'},
  shoulder:{label:'Axelskydd',shape:'sphere',anchor:'spine_03',position:[-.22,1.43,0],dimensions:[.18,.16,.17],color:'#435765'},
  wrist:{label:'Armband',shape:'torus',anchor:'hand_l',position:[-.34,1.18,.05],dimensions:[.105,.03,.105],color:'#54a6c8'}
});
const cssColor=s=>/^#[0-9a-fA-F]{6}$/.test(s);
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
export function filename(value){return (String(value||'projekt').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,48))||'projekt';}
export function newProject({kind='character',newCharacter=false,gender='male',team='analysts',template='analysts',name}={}){
  const isObject=kind==='object';
  const theme=PALETTES[template]||PALETTES.analysts;
  return {
    format:FORMAT,version:VERSION,kind:isObject?'object':'character',
    name:name||(isObject?'Mitt 3D-objekt':newCharacter?'Min nya karaktär':'Min FPS-karaktär'),
    intent:newCharacter?'create':'revise',
    base:{gender:gender==='female'?'female':'male',team:['analysts','counterAnalysts','hostage'].includes(team)?team:'analysts',template:PALETTES[template]?template:'analysts',
      original_glb:'quaternius-operator-'+(gender==='female'?'female':'male')+'.glb'},
    palette:{...theme},body:{height:100,width:100},pose:'Idle_Loop',
    parts:[],notes:{face:'',clothes:'',shoes:'',gear:'',general:''},
    // Reference files are opt-in local attachments; bytes live outside this portable JSON.
    references:[]
  };
}
export function addPart(project,preset='box'){
  if(project.parts.length>=60)throw Error('Maximalt 60 delar per projekt.');
  const p=PRESETS[preset];
  const shape=p?p.shape:(SHAPES[preset]?preset:'box');
  const index=project.parts.reduce((n,a)=>Math.max(n,Number(a.id)||0),0)+1;
  const item={
    id:String(index),name:p?p.label:'Egen '+SHAPES[shape].toLowerCase(),
    shape,anchor:project.kind==='object'?'root':p?p.anchor:'spine_03',
    position:project.kind==='object'?[0,.4,0]:p?[...p.position]:[0,1.25,.16],
    rotation:[0,0,0],dimensions:p?[...p.dimensions]:[.25,.25,.25],
    color:p?p.color:'#56abc5',visible:true,
    note:''
  };
  project.parts.push(item);
  return item;
}
export function clonePart(project,id){
  const old=project.parts.find(p=>p.id===id);
  if(!old)throw Error('Delen finns inte.');
  const next=addPart(project,old.shape);
  Object.assign(next,JSON.parse(JSON.stringify(old)),{id:next.id,name:old.name+' kopia',position:[old.position[0]+.13,old.position[1],old.position[2]]});
  return next;
}
export function validateProject(data){
  if(!data||typeof data!=='object'||data.format!==FORMAT||data.version!==VERSION)throw Error('Inte ett Character Design Studio v2-projekt.');
  if(!['character','object'].includes(data.kind)||typeof data.name!=='string'||data.name.length>100)throw Error('Projektets typ eller namn är ogiltigt.');
  const b=data.base||{};
  if(!['male','female'].includes(b.gender)||!['analysts','counterAnalysts','hostage'].includes(b.team)||!PALETTES[b.template]||b.original_glb!=='quaternius-operator-'+b.gender+'.glb')throw Error('Okänd grundmodell.');
  if(!data.palette||Object.keys(PALETTES.analysts).some(key=>!cssColor(data.palette[key])))throw Error('Ogiltiga klädfärger.');
  if(!data.body||!finite(data.body.height,80,120)||!finite(data.body.width,80,120))throw Error('Kroppsreglagen är utanför tillåtet område.');
  if(!REQUIRED_CLIPS.includes(data.pose))throw Error('Okänd pose.');
  if(!Array.isArray(data.parts)||data.parts.length>60||new Set(data.parts.map(p=>p.id)).size!==data.parts.length)throw Error('För många eller duplicerade delar.');
  for(const p of data.parts){
    if(!p||typeof p.id!=='string'||p.id.length>32||typeof p.name!=='string'||p.name.length>80||!SHAPES[p.shape]||!Object.hasOwn(ANCHORS,p.anchor)||!cssColor(p.color)||
      ![p.position,p.rotation,p.dimensions].every(a=>Array.isArray(a)&&a.length===3)||
      !p.position.every(n=>finite(n,-5,5))||!p.rotation.every(n=>finite(n,-180,180))||
      !p.dimensions.every(n=>finite(n,.01,4))||typeof p.visible!=='boolean'||typeof p.note!=='string'||p.note.length>1000)throw Error('Fel i en objektdel.');
    if(data.kind==='object'&&p.anchor!=='root')throw Error('Fristående objekt kan inte fästas på skelett.');
  }
  if(!data.notes||Object.keys(newProject().notes).some(k=>typeof data.notes[k]!=='string'||data.notes[k].length>3000))throw Error('Ogiltiga designanteckningar.');
  if(!Array.isArray(data.references)||data.references.length>8||data.references.some(x=>!x||typeof x.name!=='string'||x.name.length>100||!['glb','blend','png','jpg','jpeg','webp'].includes(x.type)||!finite(x.bytes,0,12*1024*1024)))throw Error('Ogiltiga referenser.');
  return data;
}
export function animationContract(project,availableClips=[],availableBones=[]){
  return {
    schema:'cartridge-strike-fps-rig-contract-v1',source_file:project.base.original_glb,
    existing_game_character_import:'src/fps/character-library.mjs',
    existing_game_actor_bridge:'src/fps/character-actors.mjs',
    reference_height_m:1.69,
    dimensions_multiplier:{height:project.body.height/100,width:project.body.width/100},
    required_animation_clips:[...REQUIRED_CLIPS],
    observed_animation_clips:[...availableClips],
    observed_bone_names:[...availableBones],
    attachment_rule:'Character parts are attached to named bones. position/rotation/dimensions are in meters/degrees in the source neutral character coordinate space; see README for rest-pose placement and verify with skinning.',
    quality_checks:['Preserve original skeleton, hierarchy, bone names, bind poses, skin weights and motion clips','Avoid rigid attachments that detach during crouch, jump, reload or death','Validate hands and weapon alignment, first-person and third-person silhouettes','Keep original model unchanged until a separate integration and regression run','Optimize polygon count, draw calls, memory and mobile/WebGL performance','Check all materials and avoid duplicated built-in runtime vest, boots, patches and headset'],
    deliverable:'Final character GLB (glTF 2.0) rigged/skinned and animated + updated material mapping + 4 preview angles + integration notes',
    prototype_only:true
  };
}
export function aiBrief(project,availableClips=[],availableBones=[]){
  validateProject(project);
  const c=animationContract(project,availableClips,availableBones);
  const lines=[
    '# CARTRIDGE STRIKE / 3D DESIGN HANDOFF',
    '',
    'Project: '+project.name,
    'Task: '+(project.kind==='object'?'Create a reusable 3D prop':project.intent==='create'?'Create a NEW, unique animated FPS character':'Revise the EXISTING animated FPS character'),
    '',
    '## Source and interpretation',
    project.kind==='character'?('Start from BASE_RIG.glb ('+project.base.original_glb+'); do NOT substitute an unrelated skeleton.'):'The project contains a precisely positioned 3D primitive prototype and JSON. The object is NOT an animated game character.',
    'The 4-angle reference PNG and annotations are creative direction, not exact topology.',
    'PROJECT.json is the canonical editable specification; ANIMATION_CONTRACT.json is the compatibility checklist.',
    '',
    '## Appearance',
    'Body height: '+project.body.height+'% of original. Body width: '+project.body.width+'% of original.',
    ...Object.entries(project.palette).map(([k,v])=>'Material '+k+': '+v),
    ...Object.entries(project.notes).map(([k,v])=>k+': '+(v||'[unchanged / unspecified]')),
    '',
    '## Modelled 3D components (coordinates in original unscaled model space, meters)',
    ...(project.parts.length?project.parts.map(p=>'- '+p.name+' ('+p.shape+'), anchor='+p.anchor+', pos=['+p.position.join(', ')+'], rotation degrees=['+p.rotation.join(', ')+'], dimensions m=['+p.dimensions.join(', ')+'], color='+p.color+', visible='+p.visible+', note='+(p.note||'none')):['No added primitive parts.']),
    '',
    '## Character animation and FPS integration',
    ...(project.kind==='character'?[
      'Original height is normalized to approximately 1.69m by the game.',
      'Preserve all source animation clips and compatible skinning, not just a static mesh.',
      'Critical animations: '+REQUIRED_CLIPS.join(', ')+'.',
      'Bone attachments must follow the body in idle, walk, run, jump, crouch, shooting, reloading and death.',
      'Retain handed weapon attachment/grip and check correct IK support hand alignment.',
      'The game builds clothing colors, boots, vest, radio, headset and patches at runtime. Merge/replace these deliberately; avoid overlapping meshes.',
      'Export optimized skinned GLB with embedded textures and animation. Test FPS runtime separately; no assertion that this concept ZIP is a ready-to-play 3D model.',
    ]:[
      'Create a reusable optimized prop GLB with sensible origin/pivot, dimensions and collision suggestion.',
      'Character animation requirements apply only if the prop is later attached to a character.',
    ]),
    '',
    '## Delivery acceptance',
    ...c.quality_checks.map((v,i)=>(i+1)+'. '+v),
    'Provide final game-ready .glb, 4 orthographic views, a change log, and an integration note describing any rig/material differences.',
    'The generated PROP_PROTOTYPE.glb is a static shape concept; it is NOT the final rigged character and is not animation-complete.',
    'Reference files are inspiration; use only what the user has rights to include.'
  ];
  return lines.join('\n');
}
