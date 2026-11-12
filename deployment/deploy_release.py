"""SSM root entry point: stage, validate, back up RDS, switch and recover apps."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import pwd
import re
import shutil
import subprocess
import tarfile
import tempfile
import time
from urllib.parse import urlsplit
from urllib.request import urlopen

PROJECT = Path('/home/ec2-user/creditcompass')
STATE = Path('/home/ec2-user/.local/share/creditcompass')
PYTHON = PROJECT / 'ml/.venv/bin/python'
SERVICES = ('creditcompass-backend', 'creditcompass-ml')
DROP_NAME = 'zz-creditcompass-auto-deploy.conf'


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def systemctl(*args):
    return run('systemctl', *args, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.decode().strip()


def safe_extract(archive_path, destination):
    with tarfile.open(archive_path) as archive:
        seen = set()
        members = archive.getmembers()
        if sum(m.size for m in members) > 1024 ** 3:
            raise ValueError('Release exceeds 1 GiB unpacked limit')
        for member in members:
            name = PurePosixPath(member.name)
            if (not member.isfile() or name.is_absolute() or '..' in name.parts
                    or '\\' in member.name or member.name in seen):
                raise ValueError('Unsafe or duplicate archive entry')
            seen.add(member.name)
        for member in members:
            target = destination / member.name
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.extractfile(member) as source, target.open('xb') as output:
                shutil.copyfileobj(source, output)
            target.chmod(0o644)


def verify_manifest(release):
    manifest = json.loads((release / 'manifest.json').read_text())
    actual = {p.relative_to(release).as_posix() for p in release.rglob('*') if p.is_file()}
    if actual != set(manifest['files']) | {'manifest.json'}:
        raise ValueError('Release file list mismatch')
    for name, expected in manifest['files'].items():
        with (release / name).open('rb') as stream:
            if hashlib.file_digest(stream, 'sha256').hexdigest() != expected:
                raise ValueError('Release checksum mismatch: ' + name)
    model = PurePosixPath(manifest['model'])
    if model.is_absolute() or '..' in model.parts or not str(model).startswith('outputs/models/'):
        raise ValueError('Invalid model path')
    return manifest


def validate_runtime(release, manifest):
    # Reuse the known CPU environment. Dependency changes require a separate preparation.
    descriptors = {'pyproject.toml', 'requirements.txt'}
    for name in descriptors:
        old, new = PROJECT / 'ml' / name, release / 'ml' / name
        if old.exists() != new.exists() or (old.exists() and old.read_bytes().replace(b'\r\n', b'\n') != new.read_bytes().replace(b'\r\n', b'\n')):
            raise ValueError('ML dependencies changed; prepare the server environment first: ' + name)
    if not PYTHON.is_file():
        raise ValueError('Existing Python virtual environment missing')
    code = (
        'import sys; from pathlib import Path; '
        'from vehicle_matching.api import load_service; '
        'service=load_service(Path(sys.argv[1])); '
        'print("MODEL_LOAD_OK")'
    )
    python_path = str(release / 'ml') + ':' + str(release)
    # runuser resets parts of the environment; set the release import path after switching user.
    run('runuser', '-u', 'ec2-user', '--', '/usr/bin/env', 'PYTHONPATH=' + python_path,
        str(PYTHON), '-B', '-c', code,
        str(release / 'ml' / manifest['model']), cwd=release, timeout=180)


def database_settings():
    # This deployment intentionally supports only the existing external RDS configuration.
    text = (PROJECT / 'config/application-prod.yml').read_text()
    block = re.search(r'(?m)^([ \t]*)datasource:[ \t]*\n', text)
    if not block:
        raise ValueError('External datasource configuration missing')
    lines = []
    for line in text[block.end():].splitlines():
        if line.strip() and len(line) - len(line.lstrip()) <= len(block[1]):
            break
        lines.append(line)
    section = '\n'.join(lines)
    match = re.search(r'jdbc:mysql://([^\s\"\']+)', section)
    user = re.search(r'(?m)^\s*username:\s*[\"\']?([\w-]+)', section)
    if not match or not user or user[1] != 'creditcompass':
        raise ValueError('Unexpected datasource configuration')
    url = urlsplit('mysql://' + match[1])
    if not url.hostname or not url.hostname.endswith('.ap-northeast-2.rds.amazonaws.com') or url.path != '/final_sample':
        raise ValueError('Backup target must be the configured Seoul RDS final_sample database')
    pid = systemctl('show', SERVICES[0], '-p', 'MainPID', '--value')
    if not pid.isdigit() or int(pid) == 0:
        raise ValueError('Backend must be running before starting deployment')
    values = dict(item.split(b'=', 1) for item in Path('/proc/' + pid + '/environ').read_bytes().split(b'\0') if b'=' in item)
    password = values.get(b'DB_PASSWORD', b'').decode()
    if not password or '\n' in password or '\r' in password:
        raise ValueError('DB_PASSWORD unavailable in current backend environment')
    return url.hostname, url.port or 3306, user[1], password


def mysql_credentials(settings, folder):
    host, port, user, password = settings
    escaped = password.replace('\\', '\\\\').replace('"', '\\"')
    path = folder / 'mysql.cnf'
    path.write_text('[client]\nhost=' + host + '\nport=' + str(port) + '\nuser=' + user
                    + '\npassword="' + escaped + '"\nssl-mode=REQUIRED\n', encoding='utf-8')
    path.chmod(0o600)
    return '--defaults-extra-file=' + str(path)


def database_check(settings):
    with tempfile.TemporaryDirectory() as folder:
        option = mysql_credentials(settings, Path(folder))
        run('mysql', option, '--batch', '--skip-column-names', 'final_sample', '-e',
            'SELECT COUNT(*) FROM flyway_schema_history WHERE success=1;', stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, timeout=30)


def backup_database(settings, release_id):
    folder = STATE / 'backups' / release_id
    folder.mkdir(parents=True, mode=0o700)
    output = folder / 'final_sample.sql'
    with tempfile.TemporaryDirectory() as temporary, output.open('xb') as stream:
        output.chmod(0o600)
        option = mysql_credentials(settings, Path(temporary))
        run('mysqldump', option, '--single-transaction', '--no-tablespaces', '--set-gtid-purged=OFF',
            '--hex-blob', '--default-character-set=utf8mb4', 'final_sample', stdout=stream,
            stderr=subprocess.PIPE, timeout=180)
    if output.stat().st_size < 100:
        raise ValueError('Database backup is unexpectedly empty')
    shutil.chown(folder, 'ec2-user', 'ec2-user')
    shutil.chown(output, 'ec2-user', 'ec2-user')
    print('RDS_BACKUP_OK:', output, flush=True)


def wait_json(url, predicate, seconds=120):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        try:
            with urlopen(url, timeout=5) as response:
                payload = json.load(response)
            if payload.get('success') is True and predicate(payload.get('data')):
                return
        except (OSError, ValueError):
            pass
        time.sleep(3)
    raise RuntimeError('Health check failed: ' + url)


def start_and_check(model=None):
    systemctl('start', SERVICES[0])
    wait_json('http://127.0.0.1:8080/api/v1/vehicles/recommendation-catalog', lambda data: isinstance(data, list) and bool(data))
    systemctl('start', SERVICES[1])
    wait_json('http://127.0.0.1:8002/api/v2/recommendation-options',
              lambda data: isinstance(data, dict) and (model is None or data.get('modelBundle') == Path(model).name))


def set_current(link, target):
    temporary = link.with_name('current.next')
    temporary.unlink(missing_ok=True)
    temporary.symlink_to(target)
    temporary.replace(link)


def activate(release, manifest, settings):
    current = STATE / 'releases/current'
    if current.exists() and not current.is_symlink():
        raise ValueError('Current release must be a symbolic link')
    old_target = os.readlink(current) if current.is_symlink() else None
    drops = [Path('/etc/systemd/system') / (service + '.service.d') / DROP_NAME for service in SERVICES]
    originals = [p.read_bytes() if p.exists() else None for p in drops]
    recovery = STATE / 'backups' / (release.name + '-settings')
    recovery.mkdir(parents=True, mode=0o700)
    (recovery / 'previous.json').write_text(json.dumps({'current': old_target,
        'dropins': {str(path): original.decode() if original is not None else None
                    for path, original in zip(drops, originals)}}, indent=2))
    model = current / 'ml' / manifest['model']
    contents = [
        '[Service]\nExecStart=\nExecStart=/usr/bin/java -jar ' + str(current / 'backend/app.jar')
        + ' --spring.profiles.active=prod --spring.config.additional-location=file:' + str(PROJECT / 'config') + '/\n'
        + 'Environment="ML_MODEL_RUN_DIR=' + str(model) + '"\n'
        + 'Environment="ML_MODEL_ROOT=' + str(current / 'ml/outputs/models') + '"\n',
        '[Service]\nExecStart=\nExecStart=/bin/bash ' + str(current / 'ml/serve-candidates.sh') + '\n'
        + 'Environment="PYTHON=' + str(PYTHON) + '"\nEnvironment="RUN=' + manifest['model'] + '"\n'
    ]
    try:
        systemctl('stop', SERVICES[1], SERVICES[0])
        for service in SERVICES:
            if systemctl('show', service, '-p', 'MainPID', '--value') != '0':
                raise RuntimeError('Service process is still running')
        backup_database(settings, release.name)
        set_current(current, release)
        for path, content in zip(drops, contents):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
        systemctl('daemon-reload')
        start_and_check(manifest['model'])
    except Exception:
        print('Deployment failed; restoring previous application settings. Database is NOT automatically restored.', flush=True)
        systemctl('stop', *SERVICES)
        if old_target is None:
            current.unlink(missing_ok=True)
        else:
            set_current(current, old_target)
        for path, original in zip(drops, originals):
            if original is None:
                path.unlink(missing_ok=True)
            else:
                path.write_bytes(original)
        systemctl('daemon-reload')
        start_and_check()
        print('PREVIOUS_APPLICATION_RECOVERED', flush=True)
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', required=True)
    parser.add_argument('--release-id', required=True)
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'[0-9a-f]{40}-\d+-\d+', args.release_id):
        raise ValueError('Invalid release ID')
    if os.geteuid() != 0:
        raise ValueError('Run through SSM as root')
    STATE.mkdir(parents=True, exist_ok=True)
    # SSM uses umask 077. Root-created parent directories must also be accessible
    # to the application user, not just the files inside the individual release.
    for directory in (STATE, STATE / 'releases', STATE / 'backups'):
        directory.mkdir(exist_ok=True)
        shutil.chown(directory, 'ec2-user', 'ec2-user')
        directory.chmod(0o700)
    with (STATE / 'deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if shutil.disk_usage(STATE).free < 2 * 1024 ** 3:
            raise ValueError('At least 2 GiB free disk space is required')
        release = STATE / 'releases' / args.release_id
        release.mkdir(parents=True, exist_ok=False)
        safe_extract(args.archive, release)
        manifest = verify_manifest(release)
        if manifest['commit'] != args.release_id.split('-')[0]:
            raise ValueError('Release commit mismatch')
        account = pwd.getpwnam('ec2-user')
        for path in [release, *release.rglob('*')]:
            os.chown(path, account.pw_uid, account.pw_gid)
        validate_runtime(release, manifest)
        settings = database_settings()
        database_check(settings)
        for service in SERVICES:
            if systemctl('is-active', service) != 'active':
                raise ValueError('Both services must be active before deployment')
        if args.check_only:
            print('DEPLOY_READINESS_OK: no services stopped; no database writes', flush=True)
            return
        activate(release, manifest, settings)
        print('SERVER_DEPLOY_OK:', manifest['commit'], flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Do not expose subprocess output, process environment or connection secrets.
        print('DEPLOY_FAILED:', type(error).__name__, str(error), flush=True)
        raise SystemExit(1)
