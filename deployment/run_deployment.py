"""GitHub runner orchestration. Authentication is supplied by GitHub OIDC."""
import argparse
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import time
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / 'deployment/config.json').read_text())


def aws(*args):
    result = subprocess.run(['aws', '--region', CONFIG['region'], *args], check=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return json.loads(result.stdout) if result.stdout.strip() else None


def github(path):
    request = Request('https://api.github.com/repos/cubic9832/final-project/' + path,
                      headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
                               'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def verify_ci(commit):
    if not re.fullmatch('[0-9a-f]{40}', commit):
        raise ValueError('Invalid commit SHA')
    if github('git/ref/heads/main')['object']['sha'] != commit:
        raise ValueError('This commit is no longer the latest main; run the latest commit instead')
    runs = github('actions/workflows/ci.yml/runs?event=push&branch=main&head_sha=' + commit)['workflow_runs']
    # The latest CI attempt for this exact commit must have passed both required jobs.
    if not runs or runs[0]['conclusion'] != 'success' or runs[0]['head_repository']['full_name'] != 'cubic9832/final-project':
        raise ValueError('The latest main CI run for this commit must succeed first')
    print('MAIN_CI_VERIFIED:', commit, flush=True)


def checksum(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def wait_command(command_id):
    deadline = time.monotonic() + 1500
    while time.monotonic() < deadline:
        try:
            invocation = aws('ssm', 'get-command-invocation', '--command-id', command_id,
                             '--instance-id', CONFIG['instance'])
        except subprocess.CalledProcessError as error:
            if b'InvocationDoesNotExist' not in error.stderr:
                raise
            time.sleep(5)
            continue
        status = invocation['Status']
        if status in {'Pending', 'InProgress', 'Delayed'}:
            time.sleep(5)
            continue
        print(invocation.get('StandardOutputContent', ''), flush=True)
        print(invocation.get('StandardErrorContent', ''), flush=True)
        if status != 'Success' or invocation['ResponseCode'] != 0:
            raise RuntimeError('EC2 deployment command failed: ' + status)
        return
    raise TimeoutError('EC2 command is still unresolved; inspect Systems Manager Run Command before retrying: ' + command_id)


def deploy_server(commit, publish):
    account = aws('sts', 'get-caller-identity')['Account']
    if account != CONFIG['account']:
        raise ValueError('Unexpected AWS account')
    status = aws('ssm', 'describe-instance-information', '--filters',
                 'Key=InstanceIds,Values=' + CONFIG['instance'])['InstanceInformationList']
    if len(status) != 1 or status[0]['PingStatus'] != 'Online':
        raise ValueError('EC2 must be Online in Systems Manager')
    release_id = commit + '-' + os.environ['GITHUB_RUN_ID'] + '-' + os.environ['GITHUB_RUN_ATTEMPT']
    prefix = 'releases/' + release_id
    artifact_uri = 's3://' + CONFIG['artifact_bucket'] + '/' + prefix
    files = {'release.tar.gz': ROOT / '.deployment-output/release.tar.gz',
             'deploy_release.py': ROOT / 'deployment/deploy_release.py'}
    for name, path in files.items():
        aws('s3api', 'put-object', '--bucket', CONFIG['artifact_bucket'], '--key', prefix + '/' + name,
            '--body', str(path), '--server-side-encryption', 'AES256')
    commands = ['set -eu', 'umask 077', 'work=$(mktemp -d /var/tmp/creditcompass-deploy.XXXXXXXX)', 'cd "$work"']
    for name, path in files.items():
        commands += ['aws s3 cp ' + shlex.quote(artifact_uri + '/' + name) + ' ' + shlex.quote(name)
                     + ' --region ' + shlex.quote(CONFIG['region']) + ' --only-show-errors',
                     'printf "%s  %s\n" ' + shlex.quote(checksum(path)) + ' ' + shlex.quote(name) + ' | sha256sum -c -']
    commands.append('/home/ec2-user/creditcompass/ml/.venv/bin/python deploy_release.py --archive release.tar.gz --release-id ' + shlex.quote(release_id)
                    + ('' if publish else ' --check-only'))
    # Recheck immediately before the first server command. Do not deploy a stale queued commit.
    verify_ci(commit)
    command = aws('ssm', 'send-command', '--document-name', 'AWS-RunShellScript',
                  '--instance-ids', CONFIG['instance'], '--timeout-seconds', '120',
                  '--parameters', json.dumps({'commands': ['\n'.join(commands)], 'executionTimeout': ['1200']}),
                  '--comment', 'CreditComPass ' + ('deployment ' if publish else 'readiness ') + release_id)
    command_id = command['Command']['CommandId']
    print('SSM_COMMAND_ID:', command_id, flush=True)
    wait_command(command_id)


def publish_frontend():
    dist = ROOT / 'front/dist'
    bucket = 's3://' + CONFIG['frontend_bucket']
    # Existing hashed files remain available to browsers already using the previous index.
    subprocess.run(['aws', '--region', CONFIG['region'], 's3', 'sync', str(dist), bucket,
                    '--exclude', 'index.html', '--cache-control', 'public,max-age=3600', '--only-show-errors'], check=True)
    subprocess.run(['aws', '--region', CONFIG['region'], 's3', 'cp', str(dist / 'assets'), bucket + '/assets/',
                    '--recursive', '--cache-control', 'public,max-age=31536000,immutable', '--only-show-errors'], check=True)
    subprocess.run(['aws', '--region', CONFIG['region'], 's3', 'cp', str(dist / 'index.html'), bucket + '/index.html',
                    '--cache-control', 'no-cache,max-age=0,must-revalidate', '--content-type', 'text/html', '--only-show-errors'], check=True)
    invalidation = aws('cloudfront', 'create-invalidation', '--distribution-id', CONFIG['distribution'], '--paths', '/*')
    invalidation_id = invalidation['Invalidation']['Id']
    print('CLOUDFRONT_INVALIDATION:', invalidation_id, flush=True)
    deadline = time.monotonic() + 900
    while time.monotonic() < deadline:
        result = aws('cloudfront', 'get-invalidation', '--distribution-id', CONFIG['distribution'], '--id', invalidation_id)
        if result['Invalidation']['Status'] == 'Completed':
            return
        time.sleep(15)
    raise TimeoutError('CloudFront invalidation is still pending; inspect before retrying')


def verify_public():
    host = CONFIG['public_host']
    with urlopen('https://' + host + '/index.html', timeout=30) as response:
        if response.read() != (ROOT / 'front/dist/index.html').read_bytes():
            raise ValueError('CloudFront is not serving this release index.html')
    with urlopen('https://' + host + '/api/v2/recommendation-options', timeout=30) as response:
        payload = json.load(response)
    if payload.get('success') is not True or payload.get('data', {}).get('modelBundle') != Path(CONFIG['model']).name:
        raise ValueError('Public recommendation API verification failed')
    connection = http.client.HTTPSConnection(host, timeout=20)
    try:
        key = 'dGhlIHNhbXBsZSBub25jZQ=='
        connection.request('GET', '/ws', headers={'Connection': 'Upgrade', 'Upgrade': 'websocket',
                           'Origin': 'https://' + host, 'Sec-WebSocket-Key': key,
                           'Sec-WebSocket-Version': '13'})
        response = connection.getresponse()
        if response.status != 101 or response.getheader('Sec-WebSocket-Accept') != 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=':
            raise ValueError('Public WebSocket upgrade failed')
    finally:
        connection.close()
    print('PUBLIC_FRONTEND_API_WEBSOCKET_OK', flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--commit', required=True)
    parser.add_argument('--verify-ci-only', action='store_true')
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    verify_ci(args.commit)
    if args.verify_ci_only:
        return
    deploy_server(args.commit, args.publish)
    if args.publish:
        publish_frontend()
        verify_public()
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as stream:
            stream.write('## CreditComPass deployment\n\nCommit: `' + args.commit + '`\n\n'
                         + ('Server and frontend deployed; public checks passed.\n' if args.publish
                            else 'Readiness checks passed. Services and production frontend were not changed.\n'))


if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        # Never dump AWS request arguments or credentials into logs.
        print('Command failed:', error.cmd[0], 'exit', error.returncode, flush=True)
        raise SystemExit(1)
