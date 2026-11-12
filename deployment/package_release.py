"""Package tracked runtime inputs; never include local configuration or credentials."""
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import shutil


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def runtime_file(name):
    path = Path(name)
    if name.startswith('ml/outputs/models/'):
        return path.suffix in {'.json', '.pt', '.md'}
    if name.startswith('ml/') and not name.startswith(('ml/tests/', 'ml/outputs/')):
        return path.suffix == '.py' or path.name in {'serve-candidates.sh', 'pyproject.toml', 'requirements.txt'}
    if name.startswith('tools/'):
        return path.suffix == '.py'
    return name.startswith('data/vehicles/') and path.suffix in {'.json', '.csv'}


def package(root, output, commit):
    root, output = Path(root), Path(output)
    output.mkdir(parents=True, exist_ok=True)
    config = json.loads((root / 'deployment/config.json').read_text())
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
    with tempfile.TemporaryDirectory() as temporary:
        stage = Path(temporary)
        for name in filter(runtime_file, filter(None, tracked)):
            source = root / name
            if source.is_symlink() or not source.is_file():
                raise ValueError('Invalid tracked runtime file: ' + name)
            target = stage / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        jar = root / 'back/build/libs/back-0.0.1-SNAPSHOT.jar'
        (stage / 'backend').mkdir()
        shutil.copyfile(jar, stage / 'backend/app.jar')
        model = stage / 'ml' / config['model']
        for name in ('metadata.json', 'catalog.json', 'model.pt', 'vehicle_traits.json'):
            if not (model / name).is_file():
                raise ValueError('Missing selected model input: ' + name)
        files = {p.relative_to(stage).as_posix(): digest(p) for p in stage.rglob('*') if p.is_file()}
        manifest = {'commit': commit, 'model': config['model'], 'files': files}
        (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        with tarfile.open(output / 'release.tar.gz', 'w:gz') as archive:
            for path in sorted(stage.rglob('*')):
                if path.is_file():
                    archive.add(path, arcname=path.relative_to(stage).as_posix(), recursive=False)
    print('Packaged runtime files:', len(files))


if __name__ == '__main__':
    import sys
    package(Path.cwd(), sys.argv[1], sys.argv[2])
