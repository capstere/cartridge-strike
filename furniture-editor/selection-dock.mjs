/**
 * Contextual, scene-adjacent furniture inspector.
 * Reuses the editor's EXISTING input/change and undo handlers for X/Z/width/depth,
 * collision, rotation and copy. No second project state or standalone renderer.
 */
const fieldIDs={x:'dockX',z:'dockZ',w:'dockWidth',d:'dockDepth'};
const roundDisplay=value=>String(Math.round(Number(value)*1000)/1000);
const $=id=>document.getElementById(id);

export function installSelectionDock({getIssue,getMountIssue,onHeight,onMountMode,onWallHeight,onWallSide,onFacing}){
 const panel=$('editDock'),reopen=$('editDockReopen'),name=$('editDockName'),message=$('editDockMessage');
 const collision=$('dockCollision'),height=$('dockHeight'),mount=$('dockMountMode'),wallY=$('dockWallY'),wallYRow=$('dockWallHeightRow');
 let itemId=null,collapsed=false;

 function showCollapsed(value){
  collapsed=value;panel.hidden=value;reopen.hidden=!value;
  reopen.setAttribute('aria-label',value?'Redigera markerad möbel':'');
 }
 function sync(item,{isFurniture=false}={}){
  if(!isFurniture||!item){
   itemId=null;panel.hidden=true;reopen.hidden=true;return;
  }
  if(itemId!==item.id){itemId=item.id;collapsed=false;}
  name.textContent=item.assetName||item.name||item.kind||'Möbel';
  for(const [source,destination] of Object.entries(fieldIDs))
   $(destination).value=roundDisplay(item[source]);
  height.value=roundDisplay(item.height);
  collision.value=item.collision==='none'?'none':'solid';
  mount.value=item.wallMount?'wall':item.mountId?'surface':'floor';
  wallYRow.hidden=!item.wallMount;
  $('dockWallSide').hidden=!item.wallMount;$('dockFacing').hidden=!item.wallMount||!item.assetId;
  $('dockRotate').disabled=!!item.wallMount;$('dockUp').hidden=$('dockDown').hidden=!item.wallMount;
  wallY.value=item.wallMount?roundDisplay(item.wallMount.y):'';
  const diagnostics=$('showPhysics').checked;
  const mountIssue=getMountIssue?.(item),issue=mountIssue||(diagnostics?getIssue(item):null);
  message.classList.toggle('issue',!!issue);
  message.textContent=issue?(mountIssue||'Fysikkontroll: '+issue):'Placera fritt. Ändringarna sparas automatiskt.';
  showCollapsed(collapsed);
 }
 function changeNative(source,value){
  const original=$(source);
  original.value=String(value);
  original.dispatchEvent(new Event('change',{bubbles:true}));
 }
 for(const [source,destination] of Object.entries(fieldIDs)){
  const input=$(destination);
  input.addEventListener('change',()=>{
   if(!itemId)return;
   const value=Number(input.value);
   if(!input.value.trim()||!Number.isFinite(value)){
    message.textContent='Skriv ett giltigt tal. Inget har ändrats.';
    input.focus();return;
   }
   changeNative(source,value);
  });
 }
 height.addEventListener('change',()=>{
  if(!itemId)return;
  const value=Number(height.value);
  if(!height.value.trim()||!Number.isFinite(value)||value<.1||value>8){
   message.textContent='Höjd måste vara mellan 0,1 och 8 modellenheter. Inget har ändrats.';
   height.focus();return;
  }
  onHeight(value);
 });
 collision.addEventListener('change',()=>changeNative('collisionMode',collision.value));
 mount.addEventListener('change',()=>{
  if(!itemId)return;
  const ok=onMountMode?.(mount.value);
  if(ok===false)message.textContent='Flytta objektet närmare bordet eller väggen och försök igen.';
 });
 wallY.addEventListener('change',()=>{
  if(!itemId)return;
  const value=Number(wallY.value);
  if(!wallY.value.trim()||!Number.isFinite(value)||value<.1||value>5.9){
   message.textContent='Välj en höjd från 0,1 till 5,9.';return;
  }
  onWallHeight?.(value);
 });
 $('dockWallSide').addEventListener('click',()=>onWallSide?.());
 $('dockFacing').addEventListener('click',()=>onFacing?.());
 for(const [id,delta] of [['dockUp',.1],['dockDown',-.1]])$(id).addEventListener('click',()=>{if(itemId&&wallY.value)onWallHeight?.(Number(wallY.value)+delta);});
 $('dockRotate').addEventListener('click',()=>$('rotate').click());
 $('dockDuplicate').addEventListener('click',()=>{
  // The player must see the scene when choosing a position for a duplicate.
  showCollapsed(true);$('duplicate').click();
 });
 $('dockUndo').addEventListener('click',()=>$('undo').click());
 $('dockDelete').addEventListener('click',()=>$('remove').click());
 $('editDockClose').addEventListener('click',()=>showCollapsed(true));
 reopen.addEventListener('click',()=>showCollapsed(false));
 return {sync};
}
