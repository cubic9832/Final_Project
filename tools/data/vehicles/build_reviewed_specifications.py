"""Build a guarded DB migration and a versioned serving catalog from reviewed facts.

Historical training bundles are never modified. The new serving bundle explicitly
records that its weights were reused, rather than claiming a new training run.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import shutil


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def complete_catalog(catalog, manifest):
    result = copy.deepcopy(catalog)
    indexed = {row['id']: row for row in result}
    seen = set()
    for correction in manifest['vehicles']:
        identifier = correction['identity']['id']
        if identifier in seen:
            raise ValueError(f'Duplicate correction: {identifier}')
        seen.add(identifier)
        row = indexed[identifier]
        if any(row.get(key) != value for key, value in correction['identity'].items()):
            raise ValueError(f'Vehicle identity changed: {identifier}')
        for key, value in correction['previous'].items():
            if row.get(key) != value:
                raise ValueError(f'Existing specification changed: {identifier}.{key}')
        for key in ('length_mm', 'seats'):
            if key in correction['updates'] and row.get(key) is not None:
                raise ValueError(f'Refusing to overwrite known specification: {identifier}.{key}')
        row.update(correction['updates'])
    return result


def sql_literal(value):
    return "'" + str(value).replace('\\', '\\\\').replace("'", "''") + "'"


def migration_sql(manifest):
    statements = ['-- Reviewed missing specifications; preserve prices, visibility and administrator edits.',
                  '-- Evidence: data/vehicles/specification-completion-20261104/manifest.json',
                  'START TRANSACTION;']
    for correction in manifest['vehicles']:
        identity, previous, updates = (correction[name] for name in ('identity', 'previous', 'updates'))
        assignments = []
        for key, value in updates.items():
            assignments.extend([sql_literal('$.' + key), 'CAST(' + sql_literal(json.dumps(value, ensure_ascii=False)) + ' AS JSON)'])
        conditions = ['id = ' + sql_literal(identity['id'])]
        for key, value in {**identity, **previous}.items():
            # JSON equality preserves numeric types and distinguishes a changed field.
            if key == 'id':
                continue
            if value is None:
                conditions.append(f"(JSON_EXTRACT(payload, '$.{key}') IS NULL OR JSON_TYPE(JSON_EXTRACT(payload, '$.{key}')) = 'NULL')")
            else:
                conditions.append(f"JSON_EXTRACT(payload, '$.{key}') = CAST({sql_literal(json.dumps(value, ensure_ascii=False))} AS JSON)")
        statements.append('UPDATE managed_vehicles\nSET payload = JSON_SET(payload, ' + ', '.join(assignments) +
                          '), version = version + 1, updated_at = CURRENT_TIMESTAMP(6)\nWHERE ' + ' AND '.join(conditions) + ';')
    return '\n\n'.join(statements + ['COMMIT;']) + '\n'


def build(source, manifest_path, output, migration):
    if output.exists():
        raise FileExistsError(output)
    manifest = read(manifest_path)
    catalog = complete_catalog(read(source / 'catalog.json'), manifest)
    output.mkdir(parents=True)
    for name in ('model.pt', 'vehicle_traits.json'):
        shutil.copyfile(source / name, output / name)
    write(output / 'catalog.json', catalog)
    metadata = read(source / 'metadata.json')
    metadata['catalog_revision'] = {'version': manifest['version'], 'base_bundle': source.name,
        'manifest': manifest_path.as_posix(), 'manifest_sha256': hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
        'weights_retrained': False, 'reason': 'Reviewed missing length and seating facts; original training provenance retained.'}
    metadata['files_sha256'] = {name: hashlib.sha256((output / name).read_bytes()).hexdigest()
                               for name in ('model.pt', 'catalog.json', 'vehicle_traits.json')}
    write(output / 'metadata.json', metadata)
    report = read(source / 'training_report.json')
    report['catalog_revision'] = metadata['catalog_revision']
    report['evaluation_scope'] = 'Original training/holdout catalog; completed catalog checked separately in serving_verification.json.'
    write(output / 'training_report.json', report)
    migration.write_text(migration_sql(manifest), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--manifest', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--migration', required=True, type=Path)
    args = parser.parse_args()
    build(args.source, args.manifest, args.output, args.migration)
