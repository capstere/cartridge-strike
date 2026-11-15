/** Menu for local, validated playable GLBs; no network or studio-project parsing. */
import {listPrivateCharacters,deletePrivateCharacter,validCharacterId} from './private-character-store.mjs';
import {EXTERNAL_CHARACTER_ID,EXTERNAL_CHARACTER_LABEL,externalCharacterStored,importExternalCharacterFile,deleteExternalCharacter} from './external-character-store.mjs';
export const CHARACTER_PREFERENCE='cartridge-selected-character';
export function preferredCharacter(url,storage){
 const q=new URL(url).searchParams;if(q.has('avatar'))return q.get('avatar');
 try{return storage.getItem(CHARACTER_PREFERENCE)||'';}catch{return '';}
}
export function characterMenuURL(url,id,{team='analysts',seed=42}={}){
 if(id&&id!==EXTERNAL_CHARACTER_ID&&!validCharacterId(id))throw Error('Ogiltig sparad karaktär. Välj Originalkaraktär.');
 const next=new URL(url);next.searchParams.delete('character');next.searchParams.set('avatar',id);
 next.searchParams.set('team',team==='counterAnalysts'?'counterAnalysts':'analysts');
 next.searchParams.set('seed',String(Math.min(999999,Math.max(1,Math.floor(Number(seed)||42)))));return next.href;
}
export function characterOptionLabel(row,rows){
 const same=rows.filter(r=>r.name===row.name);if(same.length<2)return row.name;
 const date=new Date(row.updated),stamp=Number.isFinite(date.getTime())?date.toLocaleString('sv-SE'):'okänd tid';
 return row.name+' · '+stamp+' · kopia '+(same.findIndex(r=>r.id===row.id)+1);
}
export async function setupCharacterMenu({getTeam,getSeed}){
 const select=document.getElementById('player-character'),status=document.getElementById('character-status'),remove=document.getElementById('delete-character');
 const id=preferredCharacter(location.href,{getItem:key=>localStorage.getItem(key)});let rows=[],externalAvailable=false;
 const say=text=>{status.textContent=text;};
 try{rows=await listPrivateCharacters();}catch(e){say('Kunde inte läsa lokala karaktärer. Du kan välja Originalkaraktär. '+e.message);}
 try{externalAvailable=await externalCharacterStored();}catch(e){say('Importerade modeller är inte tillgängliga. '+e.message);}
 select.replaceChildren(new Option('Originalkaraktär',''));
 if(externalAvailable)select.add(new Option(EXTERNAL_CHARACTER_LABEL,EXTERNAL_CHARACTER_ID));
 for(const row of rows){const option=new Option(characterOptionLabel(row,rows)+(row.compatible?'':' · behöver sparas om'),row.id);select.append(option);}
 if(id&&!rows.some(r=>r.id===id)&&!(id===EXTERNAL_CHARACTER_ID&&externalAvailable))select.append(new Option(id===EXTERNAL_CHARACTER_ID?'Importera Darth Vader igen':'Sparad karaktär saknas på denna enhet',id));
 select.value=id;remove.hidden=!id||!(rows.some(r=>r.id===id)||id===EXTERNAL_CHARACTER_ID&&externalAvailable);
 if(!status.textContent)say(rows.length||externalAvailable?'Importerade och sparade karaktärer finns bara på denna enhet.':'Ingen extern modell importerad. Välj Importera Vader-GLB eller öppna karaktärsstudion.');
 const navigate=value=>{document.getElementById('start').disabled=true;select.disabled=true;say('Laddar karaktären…');location.assign(characterMenuURL(location.href,value,{team:getTeam(),seed:getSeed()}));};
 const importButton=document.getElementById('import-external-button'),fileInput=document.getElementById('external-character-file');
 importButton.onclick=()=>fileInput.click();
 fileInput.onchange=async()=>{
  const file=fileInput.files?.[0];fileInput.value='';if(!file)return;
  importButton.disabled=true;select.disabled=true;document.getElementById('start').disabled=true;say('Kontrollerar Vader-modellens animationer och sparar lokalt…');
  try{await importExternalCharacterFile(file);navigate(EXTERNAL_CHARACTER_ID);}
  catch(e){say(e.message+' Modellen har inte ändrats.');importButton.disabled=false;select.disabled=false;document.getElementById('start').disabled=false;}
 };
 select.onchange=()=>navigate(select.value);
 remove.onclick=async()=>{if(!confirm('Ta bort den här lokala spelkopian? Eventuella projekt i ateljén finns kvar.'))return;remove.disabled=true;try{if(select.value===EXTERNAL_CHARACTER_ID)await deleteExternalCharacter();else await deletePrivateCharacter(select.value);navigate('');}catch(e){say(e.message);remove.disabled=false;}};
 return {id,loaded(name){try{if(id)localStorage.setItem(CHARACTER_PREFERENCE,id);else localStorage.removeItem(CHARACTER_PREFERENCE);}catch{say('Valet används nu men kunde inte kommas ihåg i denna webbläsare.');return;}
  if(name)say(name+' · Lokalt sparad. Händerna matchar. Välj lag och starta match.');
 },error(message){say(message+' Välj Originalkaraktär eller en annan sparad karaktär för att fortsätta.');}};
}
