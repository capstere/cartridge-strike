#!/usr/bin/env python3
"""Apply only the checksum-bound owner layout delta over public 0.15.3.

This transfer contains runtime geometry, tests and public release documentation,
not private source originals. It fails closed on unexpected input or output.
"""
from pathlib import Path
import base64, hashlib, json, lzma, re, subprocess
ROOT = Path(__file__).resolve().parents[1]
TRANSPORT = ROOT / 'tools/owner-layout-transfer'
PAYLOAD_SHA = '3bd59d52b5797476ec1a59e13fe3aae4fae9f3dff16e5c779c01ad2c76a8eae6'
ALLOWED = {
    'fps/index.html', 'src/floor5-data.js', 'src/world.js',
    'src/fps/world.mjs', 'src/fps/doors.mjs', 'src/fps/furnishings.mjs',
    'src/fps/living-floor-plan.mjs', 'build-info.json',
    'tools/detail-efficiency-smoke.cjs', 'tools/owner-layout.test.mjs',
    'tools/owner-door-traversal.mjs', 'tools/owner-layout-smoke.mjs',
    'tools/verify-owner-runtime.mjs', 'OWNER_LAYOUT_RELEASE.md',
}
def sha(data):
    return hashlib.sha256(data).hexdigest()
def main():
    if not TRANSPORT.exists():
        subprocess.run(['node', 'tools/verify-owner-runtime.mjs'], cwd=ROOT, check=True)
        print('No transport replay; existing owner runtime independently verified.')
        return
    parts = sorted(TRANSPORT.glob('*.b64'))
    assert [p.name for p in parts] == [f'{i:03d}.b64' for i in range(5)], 'Incomplete transport'
    raw = lzma.decompress(base64.b64decode(''.join(p.read_text().strip() for p in parts), validate=True))
    assert len(raw) < 1000000 and sha(raw) == PAYLOAD_SHA, 'Transfer checksum mismatch'
    payload = json.loads(raw)
    assert payload['schemaVersion'] == 1 and payload['version'] == '0.16.0'
    assert set(payload['expectedResultHashes']) == ALLOWED, 'Unexpected output allowlist'
    current = json.loads((ROOT / 'build-info.json').read_text())
    assert current['gameVersion'] == '0.15.3', 'Wrong public baseline version'
    floor = ROOT / 'src/floor5-data.js'
    original = floor.read_text()
    assert sha(original.encode()) == payload['floorExpectedBase'], 'Wrong geometry baseline'
    a = original.index('const data=') + 11
    b = original.index(';\ndata.pdfToWorld', a)
    old = json.loads(original[a:b])
    model = dict(old)
    for key, change in payload['floorDelta'].items():
        if change['op'] == 'sequence':
            model[key] = [old[key][item['ref']] if 'ref' in item else item['value'] for item in change['items']]
        else:
            assert change['op'] == 'replace'
            model[key] = change['value']
    model = {key: model[key] for key in payload['floorKeyOrder']}
    rebuilt = payload['floorPrefix'] + json.dumps(model, ensure_ascii=False, separators=(',', ':')) + payload['floorSuffix']
    assert sha(rebuilt.encode()) == payload['floorResult'], 'Geometry round-trip mismatch'
    patch = payload['textPatch']
    paths = re.findall(r'^diff --git a/(\S+) b/(\S+)$', patch, flags=re.M)
    assert paths and all(a == b and a in ALLOWED for a,b in paths), 'Unexpected patch paths'
    assert set(a for a,_ in paths) == ALLOWED - {'build-info.json','src/floor5-data.js'}
    subprocess.run(['git','apply','--check','-'], input=patch.encode(), cwd=ROOT, check=True)
    subprocess.run(['git','apply','-'], input=patch.encode(), cwd=ROOT, check=True)
    floor.write_text(rebuilt, encoding='utf-8')
    current['priorReleaseProvenance'] = {'gameVersion': current['gameVersion'], 'release': current['release']}
    current['gameVersion'] = payload['version']
    current['release'] = payload['release']
    paths = {f['path'] for f in current['files']}
    for prefix in ['src','fps','assets','vendor','licenses']:
        paths.update(p.relative_to(ROOT).as_posix() for p in (ROOT/prefix).rglob('*') if p.is_file())
    files = []
    for path in sorted(paths):
        assert '..' not in Path(path).parts and not Path(path).is_absolute()
        data = (ROOT/path).read_bytes()
        files.append({'path': path, 'bytes': len(data), 'sha256': sha(data)})
    assert len(files) == payload['integrityFileCount'] == 191
    current['files'] = files
    current['ownerLayout'] = payload['ownerLayout']
    (ROOT/'build-info.json').write_text(json.dumps(current, ensure_ascii=False, indent=2)+'\n')
    for path, expected in payload['expectedResultHashes'].items():
        actual = sha((ROOT/path).read_bytes())
        assert actual == expected, f'Unexpected output bytes: {path}: {actual}'
    print(json.dumps({'status':'PASS','version':payload['version'],'changedFiles':len(ALLOWED),'runtimeManifestFiles':len(files),'preservedBase':payload['baseCommit']},indent=2))
if __name__ == '__main__':
    main()
