/** Editor-only, procedural low-poly furnishings: no GLB download or external assets. */
export const PROCEDURAL_LIBRARY=Object.freeze([
 {id:'studio:orange-kitchen-chair',name:'Orange köksstol · vanlig stol',category:'stolar',width:.48,depth:.48,height:.76,shape:'dining-chair',kind:'chair',chairRole:'kitchen',featured:true},
 {id:'studio:desk-120',name:'Skrivbord 120 × 70 · vitt/silver',category:'bord',width:1.2,depth:.7,height:.75,shape:'desk'},
 {id:'studio:desk-160',name:'Skrivbord 160 × 80 · vitt/silver',category:'kontor',width:1.6,depth:.8,height:.75,shape:'desk'},
 {id:'studio:desk-180',name:'Skrivbord 180 × 80 · vitt/silver',category:'kontor',width:1.8,depth:.8,height:.75,shape:'desk'},
 {id:'studio:slim-120',name:'Smalt köksbord 120 × 45 · vitt/silver',category:'kok',width:1.2,depth:.45,height:.75,shape:'table'},
 {id:'studio:slim-180',name:'Smalt köksbord 180 × 45 · vitt/silver',category:'kok',width:1.8,depth:.45,height:.75,shape:'table'},
 {id:'studio:slim-240',name:'Smalt långbord 240 × 50 · vitt/silver',category:'kok',width:2.4,depth:.5,height:.75,shape:'table'},
 {id:'studio:round-80',name:'Runt bord Ø 80 · vitt/silver',category:'bord',width:.8,depth:.8,height:.75,shape:'round'},
 {id:'studio:round-110',name:'Runt bord Ø 110 · vitt/silver',category:'bord',width:1.1,depth:1.1,height:.75,shape:'round'},
 {id:'studio:round-140',name:'Runt bord Ø 140 · vitt/silver',category:'bord',width:1.4,depth:1.4,height:.75,shape:'round'},
 {id:'studio:desk-screen-120',name:'Bordsskärm blå · 120 cm',category:'kontor',width:1.2,depth:.07,height:.48,shape:'screen',placement:'desk-edge'},
 {id:'studio:desk-screen-160',name:'Bordsskärm blå · 160 cm',category:'kontor',width:1.6,depth:.07,height:.48,shape:'screen',placement:'desk-edge'},
 {id:'studio:counter-120',name:'Köksbänk vit · 120 cm',category:'kok',width:1.2,depth:.62,height:.9,shape:'counter',placement:'floor'},
 {id:'studio:counter-180',name:'Köksbänk vit · 180 cm',category:'kok',width:1.8,depth:.62,height:.9,shape:'counter',placement:'floor'},
 {id:'studio:lab-counter-180',name:'Labbänk vit · 180 cm',category:'labb',width:1.8,depth:.75,height:.9,shape:'counter',placement:'floor'},
 {id:'studio:microwave',name:'Mikrovågsugn mörkgrå',category:'kok',width:.5,depth:.42,height:.31,shape:'microwave',placement:'countertop'},
 {id:'studio:coffee-machine',name:'Kaffemaskin',category:'kok',width:.28,depth:.37,height:.39,shape:'machine',placement:'countertop'},
 {id:'studio:lab-instrument',name:'Labbapparat / analysinstrument',category:'labb',width:.52,depth:.48,height:.47,shape:'machine',placement:'countertop'},
 {id:'studio:monitor',name:'Datorskärm svart',category:'kontor',width:.55,depth:.19,height:.39,shape:'monitor',placement:'countertop'},
 {id:'studio:keyboard',name:'Tangentbord svart',category:'kontor',width:.45,depth:.16,height:.035,shape:'keyboard',placement:'countertop'},
 {id:'studio:printer',name:'Skrivare / etikettprinter',category:'kontor',width:.4,depth:.38,height:.26,shape:'printer',placement:'countertop'},
 {id:'studio:storage-cabinet',name:'Förvaringsskåp vitt',category:'labb',width:.8,depth:.52,height:1.8,shape:'cabinet',placement:'floor'}
].map(o=>Object.freeze({...o,kind:o.kind||'prop',license:'Original · Designstudion, procedurbyggd',source:'Samma fyrbenta stolform som Floor 5 · inga extra filer',model:o.shape,thumb:null})));
export const PROCEDURAL_MAP=new Map(PROCEDURAL_LIBRARY.map(o=>[o.id,o]));
/** Correct only the mislabeled office-chair preset from editor 3.4 drafts. */
export function upgradeLegacyOrangeChair(project){let count=0;
 for(const item of [...project.furniture.added,...project.furniture.placements]){
  if(item.assetId!=='kenney:furniture-kit:chairdesk'||item.assetName!=='Orange köksstol · silverben'||item.chairRole!=='kitchen')continue;
  item.assetId='studio:orange-kitchen-chair';item.assetName='Orange köksstol · vanlig stol';
  if(item.w===.62&&item.d===.62&&item.height===1.05){item.w=.48;item.d=.48;item.height=.76;}
  if(!project.assets.library.includes(item.assetId))project.assets.library.push(item.assetId);
  count++;
 }
 return count;
}
export function proceduralOf(item){return PROCEDURAL_MAP.get(item?.assetId)||null;}
export function placementRole(item){return proceduralOf(item)?.placement||'floor';}
export function roundTable(item){return proceduralOf(item)?.shape==='round';}
