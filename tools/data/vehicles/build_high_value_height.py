"""Merge frozen high-value catalog and field-level height evidence, without touching old artifacts."""
import argparse
from collections import Counter
from dataclasses import fields
import hashlib
import json
from pathlib import Path
import subprocess
from vehicle_matching.catalog import ROOT, Vehicle, read_catalog, save_catalog
from tools.data.households.generate_scenario_population import write_json

SOURCE_REVISION = '230488c6d2775cd017eac2d4fadbefef5e1bbc23'

def source(path):
    raw = subprocess.check_output(['git','show',f'{SOURCE_REVISION}:{path}'],cwd=ROOT)
    return json.loads(raw), hashlib.sha256(raw).hexdigest()

def build(output):
    output=Path(output);output.mkdir(parents=True,exist_ok=False)
    rich,rhash=source('data/vehicles/full-trait-evidence-20261028/catalog-with-traits.json')
    specifications,shash=source('data/vehicles/web-recheck-20261028/vehicles.json')
    specs={row['id']:row['specifications'] for row in specifications}
    current=ROOT/'ml/outputs/models/scenario-choices/20261030-ui-v1-10k'
    base=json.loads((current/'catalog.json').read_text(encoding='utf-8'))
    traits=json.loads((current/'vehicle_traits.json').read_text(encoding='utf-8'))['vehicles']
    rows={row['id']:row for row in base}
    skipped=[]
    for row in rich:
        if not isinstance(row.get('price'),(int,float)) or row['price']<=0:
            skipped.append({'id':row['id'],'reason':'no-recorded-price'});continue
        if row['id'] not in rows: rows[row['id']]=row
    # Manufacturer documents checked during this run. Variant applicability remains recorded.
    official={
      'Revuelto':(1160,'https://www.lamborghini.com/sites/it-en/files/DAM/lamborghini/facelift_2019/model_detail/revuelto/2024/brochure/07_23/REVUELTO_DIGITAL_BROCHURE_EN_2024.pdf'),
      '296 GTS':(1191,'https://www.ferrari.com/content/dam/ferrari-fcom/old/pdf/CS_296_GTS_final_gbr.pdf'),
      '12Cilindri Spider':(1292,'https://www.ferrari.com/content/dam/ferrari-fcom/old/pdf/CS_Ferrari_12Cilindri_Spider_def_gbr.pdf'),
    }
    prior={'SEDAN':1460,'SUV':1710,'HATCHBACK':1490,'WAGON':1480,'MPV':1900,'BOX':1900,'PICKUP':1850,'COUPE':1330,'CONVERTIBLE':1320,'ROADSTER':1270}
    allowed={f.name for f in fields(Vehicle)};catalog=[];evidence={};counts=Counter()
    rich_by_id={row['id']:row for row in rich}
    for identifier,row in rows.items():
        s=specs.get(identifier,{})
        height=dict(s.get('height_mm') or {})
        if row['model'] in official:
            value,url=official[row['model']];height={'value':value,'status':'official-reference','source_url':url,'checked_on':'2026-11-02'}
        if not isinstance(height.get('value'),(int,float)) or not 800<=height['value']<=3500:
            height={'value':prior.get(row.get('body_type'),1500),'status':'estimated','method':'body-type-height-prior-v1','source_url':''}
        clean={key:value for key,value in row.items() if key in allowed}
        for key in ('length_mm','seats'):
            if clean.get(key) is None:
                value=s.get(key,{}).get('value')
                if isinstance(value,(int,float)):clean[key]=int(value)
        clean.update(height_mm=int(height['value']),height_source_url=height.get('source_url'),height_status=height.get('status','reference'))
        car=Vehicle(**clean);catalog.append(car);evidence[identifier]=height;counts[car.height_status]+=1
        if identifier not in traits:
            original=rich_by_id.get(identifier,{}).get('lifestyle_traits',{})
            values=original.get('values',{})
            fallback={'exterior_sportiness':1. if car.body_type in ('COUPE','CONVERTIBLE','ROADSTER') else .5,'exterior_angularity':.5,'acceleration_performance':.5}
            traits[identifier]={'values':{key:values.get(key) if values.get(key) is not None else value for key,value in fallback.items()},'evidence':original.get('evidence',{})}
            for key in fallback:
                traits[identifier]['evidence'].setdefault(key,{'kind':'estimated-body-prior','method':'high-value-trait-compatibility-v1'})
    save_catalog(output/'catalog.json',catalog)
    write_json(output/'vehicle_traits.json',{'schema':'high-value-height-traits-v2','vehicles':{c.id:traits[c.id] for c in catalog}})
    write_json(output/'height_evidence.json',evidence)
    report={'catalog_count':len(catalog),'model_count':len({(c.brand,c.model) for c in catalog}),'height_coverage':len(evidence),'height_status_counts':dict(counts),'source_hashes':{'rich_catalog':rhash,'specifications':shash},'source_branch':SOURCE_REVISION,'skipped':skipped,'maximum_price':max(c.price for c in catalog),'new_ids':sorted(set(rows)-{r['id'] for r in base})}
    write_json(output/'build_report.json',report);print(json.dumps(report),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);build(p.parse_args().output)
