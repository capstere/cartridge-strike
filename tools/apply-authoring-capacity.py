"""Apply the reviewed Studio authoring-capacity change to the known 5.7.2 sources.
No private project or model data is read, uploaded, removed or rewritten.
"""
from pathlib import Path
import hashlib, json, re, posixpath
root = Path('.')
changed = set()

def write(name, text):
    p = root / name
    if not p.exists() or p.read_text() != text:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding='utf-8')
        changed.add(name)

def replace(name, old, new, count=1):
    p = root / name
    text = p.read_text()
    assert text.count(old) == count, f'Expected {count} occurrences in {name}: {old!r}'
    write(name, text.replace(old, new))

def prepend(name, line):
    write(name, line + '\n' + (root/name).read_text())

write('furniture-editor/project-limits.mjs', '''/** Generous authoring resource ceilings, NOT gameplay/performance budgets.
 * Save/import source data separately from physics validation and game optimization.
 * Lossless recovery remains available when a structural/resource check rejects a draft.
 */
export const AUTHORING_LIMITS=Object.freeze({
 furnitureRecords:10000,buildingParts:5000,sourceChanges:5000,floors:1000,
 posters:1000,treatments:1000,surfaceOverrides:10000,jsonBytes:16*1024*1024
});
export const MAX_FURNITURE_RECORDS=AUTHORING_LIMITS.furnitureRecords;
export const MAX_PROJECT_JSON_BYTES=AUTHORING_LIMITS.jsonBytes;
export function furnitureRecordCount(f){
 if(!f||!['placements','added','removed'].every(k=>Array.isArray(f[k])))return null;
 return f.placements.length+f.added.length+f.removed.length;
}
export function authoringStatus(project){
 const len=v=>Array.isArray(v)?v.length:0;
 const furniture=len(project?.furniture?.placements)+len(project?.furniture?.added);
 const parts=len(project?.architecture?.added);
 const large=furniture>1000||parts>1000;
 return {furniture,parts,large,message:`${furniture} möbelposter · ${parts} nya byggdelar. `+
  (large?'Stort byggprojekt: spara originalet; optimera en separat spelkopia senare.':'Bygg och spara först. Spelkontroll och optimering görs separat.')};
}
''')
for file in ['architecture.mjs','paint-over-wall.mjs','rectangle-room.mjs','posters.mjs','treatments.mjs','surface-style.mjs','floor-edge.mjs']:
    prepend('furniture-editor/build/'+file,"import {AUTHORING_LIMITS} from '../project-limits.mjs?v=5.7.3';")
replace('furniture-editor/build/architecture.mjs',
 'patch.edits.length>600||patch.added.length>250||patch.removed.length>600||patch.floors.length>100',
 'patch.edits.length>AUTHORING_LIMITS.sourceChanges||patch.added.length>AUTHORING_LIMITS.buildingParts||patch.removed.length>AUTHORING_LIMITS.sourceChanges||patch.floors.length>AUTHORING_LIMITS.floors')
replace('furniture-editor/build/architecture.mjs',"throw Error('För många arkitekturändringar.');", "throw Error('Byggprojektet överskrider redigerarens resursgräns. Spara en säkerhetskopia; originalet ska inte rensas.');")
replace('furniture-editor/build/paint-over-wall.mjs',"if(updated.filter(e=>!e.source&&!e.deleted).length>250)throw Error('För många nya byggdelar (max 250).');", "if(updated.filter(e=>!e.source&&!e.deleted).length>AUTHORING_LIMITS.buildingParts)throw Error(`Redigerarens resursgräns är ${AUTHORING_LIMITS.buildingParts} nya byggdelar. Spara en säkerhetskopia innan du fortsätter.`);")
replace('furniture-editor/build/rectangle-room.mjs','entries.filter(e=>!e.source&&!e.deleted).length+4>250','entries.filter(e=>!e.source&&!e.deleted).length+4>AUTHORING_LIMITS.buildingParts')
replace('furniture-editor/build/rectangle-room.mjs',"throw Error('För många egna väggar för projektformatet (max 250).');", "throw Error(`Redigerarens resursgräns är ${AUTHORING_LIMITS.buildingParts} byggdelar. Spara en säkerhetskopia.`);")
replace('furniture-editor/build/rectangle-room.mjs',"if(withFloor&&floors.length+1>100)throw Error('För många golvytor för projektformatet (max 100).');", "if(withFloor&&floors.length+1>AUTHORING_LIMITS.floors)throw Error(`Redigerarens resursgräns är ${AUTHORING_LIMITS.floors} golvytor. Spara en säkerhetskopia.`);")
replace('furniture-editor/build/posters.mjs','export const POSTER_MAX=40;','export const POSTER_MAX=AUTHORING_LIMITS.posters;')
replace('furniture-editor/build/posters.mjs',"throw Error('För många affischer i projektet (max 40).');", "throw Error(`Redigerarens resursgräns är ${POSTER_MAX} affischer. Spara en säkerhetskopia.`);")
replace('furniture-editor/build/treatments.mjs','export const TREATMENTS_MAX=120;','export const TREATMENTS_MAX=AUTHORING_LIMITS.treatments;')
replace('furniture-editor/build/treatments.mjs',"throw Error('Max 120 gardiner/persienner.');", "throw Error(`Redigerarens resursgräns är ${TREATMENTS_MAX} gardiner/persienner. Spara en säkerhetskopia.`);",2)
replace('furniture-editor/build/surface-style.mjs','Object.keys(colors).length>1000','Object.keys(colors).length>AUTHORING_LIMITS.surfaceOverrides')
replace('furniture-editor/build/surface-style.mjs','Object.keys(v).length>600','Object.keys(v).length>AUTHORING_LIMITS.surfaceOverrides')
replace('furniture-editor/build/floor-edge.mjs','Object.keys(edits).length>100','Object.keys(edits).length>AUTHORING_LIMITS.floors')
f='furniture-editor/build/level-project.mjs'
replace(f,'import {MAX_FURNITURE_RECORDS,furnitureRecordCount}', 'import {AUTHORING_LIMITS,MAX_PROJECT_JSON_BYTES,MAX_FURNITURE_RECORDS,furnitureRecordCount}')
replace(f,"LEVEL_EDITOR_VERSION='5.7.2'","LEVEL_EDITOR_VERSION='5.7.3'")
replace(f,"if(input.length>5*1024*1024)fail('JSON över 5 MiB');", "if(input.length>MAX_PROJECT_JSON_BYTES||new TextEncoder().encode(input).length>MAX_PROJECT_JSON_BYTES)fail('JSON över 16 MiB; behåll originalfilen');")
replace(f,'g.floors.length>100','g.floors.length>AUTHORING_LIMITS.floors')
replace(f,'a.edits.length>600||a.added.length>250||a.removed.length>600||a.floors.length>100','a.edits.length>AUTHORING_LIMITS.sourceChanges||a.added.length>AUTHORING_LIMITS.buildingParts||a.removed.length>AUTHORING_LIMITS.sourceChanges||a.floors.length>AUTHORING_LIMITS.floors')
replace(f,'Object.keys(finishes).length>100','Object.keys(finishes).length>AUTHORING_LIMITS.floors')
replace(f,"if(JSON.stringify(input).length>5*1024*1024)fail('JSON över 5 MiB');", "if(new TextEncoder().encode(JSON.stringify(input)).length>MAX_PROJECT_JSON_BYTES)fail('JSON över 16 MiB; behåll originalfilen');")
prepend('furniture-editor/main.mjs',"import {MAX_PROJECT_JSON_BYTES} from './project-limits.mjs?v=5.7.3';")
replace('furniture-editor/main.mjs',"if(file.size>5*1024*1024)throw Error('JSON-filen är för stor (max 5 MB).');", "if(file.size>MAX_PROJECT_JSON_BYTES)throw Error('JSON-filen är för stor (max 16 MiB). Behåll originalfilen.');")
# Show design capacity without feeding a performance threshold into validation or saving.
prepend('furniture-editor/new.mjs',"import {authoringStatus} from './project-limits.mjs?v=5.7.3';")
replace('furniture-editor/new.mjs','function redraw(){updateFloor5InteriorUI();',"function redraw(){updateFloor5InteriorUI();\n const capacity=$('authoringStatus');if(capacity)capacity.textContent=authoringStatus(p()).message;")
replace('furniture-editor/new.html','<h2>Din bana</h2>', '<h2>Din bana · byggmaster</h2><p class="hint" id="authoringStatus">Bygg och spara först. Optimering görs senare i en separat spelkopia.</p>')
# The old boundary assertion must test the actual resource ceiling, not a fixed old count.
prepend('furniture-editor/build/draft-save.test.mjs',"import {MAX_FURNITURE_RECORDS} from '../project-limits.mjs?v=5.7.3';")
replace('furniture-editor/build/draft-save.test.mjs',"test('exceeding the runtime budget still allows a lossless draft download'", "test('exceeding the authoring resource ceiling still allows a lossless draft download'")
replace('furniture-editor/build/draft-save.test.mjs','length:2001','length:MAX_FURNITURE_RECORDS+1')
replace('furniture-editor/build/draft-save.test.mjs',"assert.throws(()=>parseProject(p),/2001\\/2000/);", "assert.throws(()=>parseProject(p),/möbelposter/);")
replace('furniture-editor/build/draft-save.test.mjs','project.furniture.added.length,2001','project.furniture.added.length,MAX_FURNITURE_RECORDS+1')
# Existing rejection tests remain boundary tests at the shared resource ceilings.
prepend('furniture-editor/build/rectangle-room.test.mjs',"import {AUTHORING_LIMITS} from '../project-limits.mjs?v=5.7.3';")
replace('furniture-editor/build/rectangle-room.test.mjs','length:247','length:AUTHORING_LIMITS.buildingParts-3')
replace('furniture-editor/build/rectangle-room.test.mjs',']),/250/);',']),new RegExp(String(AUTHORING_LIMITS.buildingParts)));')
replace('furniture-editor/build/rectangle-room.test.mjs','length:100','length:AUTHORING_LIMITS.floors')
replace('furniture-editor/build/rectangle-room.test.mjs',']),/100/);',']),new RegExp(String(AUTHORING_LIMITS.floors)));')
prepend('furniture-editor/editor.test.mjs',"import {MAX_FURNITURE_RECORDS} from './project-limits.mjs?v=5.7.3';")
replace('furniture-editor/editor.test.mjs','Array(2001)','Array(MAX_FURNITURE_RECORDS+1)')
# Keep schema limits and runtime validation aligned without reformatting the document.
p='furniture-editor/build/level-project.schema.json'
s=(root/p).read_text().splitlines(keepends=True)
for i,line in enumerate(s):
    if line.startswith('    "ground":'):
        line=line.replace('"maxProperties": 100','"maxProperties": 1000').replace('"floors": {"type": "array", "maxItems": 100,','"floors": {"type": "array", "maxItems": 1000,')
    elif line.startswith('    "architecture":'):
        line=line.replace('"maxItems": 600','"maxItems": 5000').replace('"maxItems": 250','"maxItems": 5000').replace('"maxItems": 100','"maxItems": 1000')
    elif line.startswith('    "furniture":'):
        line=line.replace('"maxItems": 2000','"maxItems": 10000')
    elif line.startswith('    "floorFinishes":'):line=line.replace('"maxProperties": 100','"maxProperties": 1000')
    elif line.startswith('    "surfaceMaterials":'):line=line.replace('"maxProperties": 600','"maxProperties": 10000')
    elif line.startswith('    "surfaceColors":'):line=line.replace('"maxProperties": 1000','"maxProperties": 10000')
    s[i]=line
write(p,''.join(s))
# Cache-bust only the transitive dependants of changed runtime files. No source logic changes.
modules={n for n in changed if n.endswith(('.mjs','.js')) and not n.endswith('.test.mjs')}
# Inspect actual import/from/new URL or HTML src references, never documentation prose.
pattern=re.compile(r'''(["'])(\.{1,2}/[^"'\s?#]+\.(?:mjs|js))(?:\?v=[^"'\s]+)?\1''')
htmlpattern=re.compile(r'''((?:src|href)=["'])([^"'\s?#]+\.(?:mjs|js))(?:\?v=[^"'\s]+)?(["'])''')
files=[p for folder in ('furniture-editor','src','fps','studio','character-design') for p in (root/folder).rglob('*') if p.suffix in ('.js','.mjs','.html') and not p.name.endswith('.test.mjs')]
for _ in range(30):
    prior=len(modules)
    for p in files:
        name=p.as_posix();before=p.read_text()
        def sub(m):
            target=posixpath.normpath(posixpath.join(posixpath.dirname(name),m[2]))
            return m[1]+m[2]+'?v=5.7.3'+m[1] if target in modules else m[0]
        after=pattern.sub(sub,before)
        if p.suffix=='.html':
            def htmlsub(m):
                target=posixpath.normpath(posixpath.join(posixpath.dirname(name),m[2]))
                return m[1]+m[2]+'?v=5.7.3'+m[3] if target in modules else m[0]
            after=htmlpattern.sub(htmlsub,after)
        if after!=before:
            write(name,after)
            if p.suffix!='.html':modules.add(name)
    if len(modules)==prior:break
else:raise RuntimeError('Cache dependency propagation did not converge')
# Regenerate hashes only for the manifest's existing runtime files.
p=root/'build-info.json';info=json.loads(p.read_text())
for row in info['files']:
    data=(root/row['path']).read_bytes();row['bytes']=len(data);row['sha256']=hashlib.sha256(data).hexdigest()
info['bytes']=sum(x['bytes'] for x in info['files'])
write('build-info.json',json.dumps(info,ensure_ascii=False,indent=2)+'\n')
print('Updated',len(changed),'files; unchanged geometry and no private project data.')
for name in sorted(changed):print(name)
