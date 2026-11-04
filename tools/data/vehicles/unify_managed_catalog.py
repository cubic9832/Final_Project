"""Build a lossless, reviewed catalog migration from frozen database exports.

Run with PYTHONPATH=ml;. . Never updates historical models or training shards.
"""
import argparse
from copy import deepcopy
from dataclasses import asdict, fields
import hashlib
import json
from pathlib import Path
import re

from vehicle_matching.catalog import Vehicle, save_catalog


def read_lines(path):
    return [json.loads(line) for line in Path(path).read_text(encoding='utf-8-sig').splitlines() if line.strip()]


def normalized_trim(value):
    value = (value or '').split('·')[0].strip()
    value = re.sub(r'\([^)]*\)|\d+인승', '', value).strip().lower()
    aliases = {'모던': 'modern', '스마트': 'smart', '인스퍼레이션': 'inspiration',
               '프레스티지': 'prestige', '시그니처': 'signature', '트렌디': 'trendy',
               '라이트': 'light', '에어': 'air', '노블레스': 'noblesse'}
    return re.sub(r'\s+', '', aliases.get(value, value))


def build(managed, legacy, model, output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    existing = {row['id']: deepcopy(row) for row in read_lines(managed)}
    snapshot = {row['id']: row for row in json.loads((Path(model)/'catalog.json').read_text(encoding='utf-8'))}
    traits = json.loads((Path(model)/'vehicle_traits.json').read_text(encoding='utf-8'))['vehicles']
    allowed = {field.name for field in fields(Vehicle)}
    for identifier, car in snapshot.items():
        if identifier not in existing:
            existing[identifier] = {'id': identifier, 'payload': deepcopy(car), 'status': 'PUBLISHED'}
        else:
            payload = existing[identifier]['payload']
            # Preserve DB prices and identity. Only bring across missing model evidence.
            for key in ('height_mm', 'height_source_url', 'height_status', 'seats', 'seats_status', 'seats_note', 'seat_options'):
                if payload.get(key) is None or key.startswith('height_'):
                    payload[key] = car.get(key)
    mapping = {}
    added = []
    for old in read_lines(legacy):
        matches = [row for row in existing.values() if row['payload']['brand'] == old['brand']
                   and row['payload']['model'] == old['name'] and row['payload']['fuel'] == old['fuel_code']
                   and normalized_trim(row['payload']['trim']) == normalized_trim(old['trim_name'])
                   and (not old['model_year'] or str(row['payload'].get('year') or '') == str(old['model_year']))
                   and float(row['payload']['price']) == float(old['price'])]
        if len(matches) == 1:
            row = matches[0]
        else:
            identifier = f"legacy-db-{old['id']}"
            body = old['class_code'] or ''
            body = 'SUV' if 'SUV' in body else 'SEDAN' if 'SEDAN' in body else 'MPV' if body == 'MPV' else 'HATCHBACK'
            payload = {'id': identifier, 'brand': old['brand'], 'model': old['name'], 'trim': old['trim_name'] or old['name'],
                       'year': str(old['model_year'] or ''), 'fuel': old['fuel_code'], 'price': float(old['price']),
                       'efficiency': float(old['efficiency_value']) if old['efficiency_value'] else None,
                       'source_url': old['source_url'] or '', 'checked_on': '2026-10-14',
                       'quality': 'legacy-database-import', 'source_note': 'V3/V5 database seed import; original specifications preserved.',
                       'body_type': body, 'seats': old['seating_capacity'], 'seats_status': 'legacy-database',
                       'image_url': old['image_url'], 'default_configuration': old['powertrain']}
            row = {'id': identifier, 'payload': payload, 'status': 'PUBLISHED'}
            existing[identifier] = row
            added.append(identifier)
        mapping[str(old['id'])] = row['id']
        payload = row['payload']
        payload.setdefault('legacy_ids', []).append(str(old['id']))
        for source, target in [('powertrain', 'powertrain'), ('class_code', 'class_code'), ('condition_code', 'condition_code'),
                               ('displacement_cc', 'displacement_cc'), ('price_before_incentive', 'price_before_incentive'),
                               ('city_efficiency', 'city_efficiency'), ('highway_efficiency', 'highway_efficiency'),
                               ('wheel_size_inch', 'wheel_size_inch'), ('efficiency_unit', 'efficiency_unit')]:
            if old.get(source) is not None:
                payload.setdefault(target, old[source])
    height_priors = {'SEDAN': 1450, 'HATCHBACK': 1500, 'SUV': 1700, 'MPV': 1900, 'BOX': 1800,
                     'PICKUP': 1800, 'COUPE': 1400, 'CONVERTIBLE': 1400, 'ROADSTER': 1300, 'WAGON': 1500}
    catalog = []
    for identifier, row in sorted(existing.items()):
        payload = row['payload']
        payload.setdefault('origin', '국산' if payload['brand'] in ('현대','기아','제네시스','KG모빌리티','르노코리아','쉐보레') else '수입')
        payload.setdefault('drive', '미확인')
        payload.setdefault('source_name', 'unified-catalog-import')
        payload.setdefault('memo', '')
        payload['recommendation_enabled'] = row['status'] == 'PUBLISHED'
        if not payload.get('height_mm'):
            payload.update(height_mm=height_priors.get(payload.get('body_type'), 1500), height_status='estimated-body-prior', height_source_url='')
        clean = {key: value for key, value in payload.items() if key in allowed}
        car = Vehicle(**clean)
        catalog.append(car)
        payload.update(asdict(car))
        if identifier not in traits:
            traits[identifier] = {'values': {'exterior_sportiness': .5, 'exterior_angularity': .5, 'acceleration_performance': .5},
                                  'evidence': {key: {'kind': 'unverified-neutral-prior', 'method': 'unified-catalog-neutral-v1',
                                                   'limitation': 'No individual measurement; neutral training assumption.'}
                                               for key in ('exterior_sportiness', 'exterior_angularity', 'acceleration_performance')}}
    def write(name, value):
        (output/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    save_catalog(output/'catalog.json', catalog)
    write('managed_rows.json', list(existing.values()))
    write('legacy_mapping.json', mapping)
    write('vehicle_traits.json', {'schema': 'unified-managed-traits-v1', 'vehicles': {car.id: traits[car.id] for car in catalog}})
    write('height_evidence.json', {car.id: {'value': car.height_mm, 'status': car.height_status, 'source_url': car.height_source_url} for car in catalog})
    write('build_report.json', {'catalog_count': len(catalog), 'legacy_mapping_count': len(mapping), 'imported_legacy_ids': added,
                              'model_only_preserved': sorted(set(snapshot)-{row['id'] for row in read_lines(managed)}),
                              'disabled_ids': [car.id for car in catalog if not car.recommendation_enabled],
                              'sources_sha256': {str(path): hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in (managed, legacy, Path(model)/'catalog.json')}})
    # Hex JSON avoids SQL escaping and preserves Unicode on all shells.
    statements = ['-- Canonical managed catalog; generated from immutable exports.']
    for row in existing.values():
        raw = json.dumps(row['payload'], ensure_ascii=False).encode().hex()
        statements.append(f"INSERT INTO managed_vehicles(id,payload,status) VALUES('{row['id']}',CAST(CONVERT(0x{raw} USING utf8mb4) AS JSON),'{row['status']}') ON DUPLICATE KEY UPDATE payload=VALUES(payload),version=version+1,updated_at=CURRENT_TIMESTAMP(6);")
    (output/'catalog_migration.sql').write_text('\n'.join(statements)+'\n', encoding='utf-8')
    print(json.dumps({'vehicles': len(catalog), 'legacy_mapped': len(mapping), 'legacy_added': len(added)}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for name in ('managed', 'legacy', 'model', 'output'):
        parser.add_argument('--'+name, required=True, type=Path)
    args = parser.parse_args()
    build(args.managed, args.legacy, args.model, args.output)
