"""Exactly bounded pairwise dataset with high-value/height coverage and group-isolated splits."""
import argparse
from collections import Counter
from dataclasses import asdict
import hashlib
import itertools
import json
import math
from pathlib import Path
import random
import shutil
import numpy as np
from vehicle_matching.catalog import ROOT, read_catalog
from vehicle_matching.finance import Profile, assess
from vehicle_matching.budget import recommendation_budget
from vehicle_matching.recommendation_policy import seating_status
from vehicle_matching.height_scenario_model import FEATURE_NAMES, encode_height_scenario
from vehicle_matching.ui_scenario_features import choice_utility
from tools.data.households.generate_scenario_population import file_hash, write_json
from tools.data.households.scenario_coverage import model_key, coverage_report

ROLES=('train','validation','test')
def generate(output, comparisons=3000000, seed=20261102, source=None, require_coverage=True):
    output=Path(output);output.mkdir(parents=True,exist_ok=False)
    source=Path(source or ROOT/'data/vehicles/high-value-height-v1-20261102')
    for name in ('catalog.json','vehicle_traits.json','height_evidence.json','build_report.json'):shutil.copyfile(source/name,output/name)
    catalog=read_catalog(output/'catalog.json');traits=json.loads((output/'vehicle_traits.json').read_text(encoding='utf-8'))['vehicles']
    seeds=json.loads((ROOT/'data/households/synthetic/scenario-population-v3-broad-taste-10k-20261029/seed_personas.json').read_text(encoding='utf-8'))
    rng=random.Random(seed);seen=set();counts=Counter();models={role:Counter() for role in ROLES};specs=Counter();shards=[]
    template=Profile(**seeds[0]['profile'])
    template=Profile(**{**asdict(template),'annual_distance':15000,'financing_mode':'recommendation','liquid_assets':10000000000.,'monthly_income':1000000000.})
    prices=np.asarray([c.price for c in catalog]);running=np.asarray([assess(template,c)['monthly_running_cost'] for c in catalog])
    seats=np.asarray([c.seats or 0 for c in catalog]);known=np.asarray([c.seats_status!='official-reference-conflict' for c in catalog])
    count=0;users=0;attempts=0
    config={'version':'ui-scenario-height-population-v2','target_comparisons':comparisons,'seed':seed,'pairs_per_user_max':10,'split':[.7,.15,.15],'high_value_financial_stratum_probability':.35,'price_band_policy':'cash-importance-band-v1','feature_names':FEATURE_NAMES}
    write_json(output/'configuration.json',config)
    while count<comparisons:
        buckets={r:{'features':[],'comparisons':[],'labels':[],'profile_ids':[],'vehicle_indices':[],'users':[],'choices':[]} for r in ROLES}
        accepted=0
        while accepted<1000 and count<comparisons:
            attempts+=1
            if attempts>max(10000,comparisons*30):raise ValueError('Insufficient eligible contexts')
            p=dict(rng.choice(seeds)['profile']);scale=rng.lognormvariate(0,.5)
            for key in ('monthly_income','monthly_expenses','existing_monthly_payment','liquid_assets'):p[key]=round(p[key]*scale*rng.uniform(.9,1.1)/10000)*10000
            if rng.random()<.35:p['liquid_assets']=round(rng.uniform(180000000,1000000000)/10000)*10000
            p.update(down_payment=0,months=0,annual_rate=0,emergency_reserve=0,monthly_savings=0,minimum_buffer=0,annual_distance=15000,purpose='commute',purpose_importance=1,preferred_body_type='any',body_importance=3,seating_importance=3,financing_mode='recommendation',purchase_price_ceiling=0)
            p['minimum_seats']=rng.choice([0,0,0,2,3,4,5,5,6,7,8,9]);p['preferred_fuel']=rng.choice([None,None,'GASOLINE','HYBRID','DIESEL','LPG','ELECTRIC']);p['preferred_size']=rng.choice(['any','any','small','medium','large'])
            p['charging_available']=rng.choice([True,False]) if p['preferred_fuel']=='ELECTRIC' else False
            for key in ('cost_importance','space_importance','fuel_importance'):p[key]=rng.choice([1,3,5])
            profile=Profile(**p);band=recommendation_budget(profile,[],{})
            available=p['monthly_income']-p['monthly_expenses']-p['existing_monthly_payment']
            mask=(prices>=band['lower'])&(prices<=band['upper'])&((p['liquid_assets']-prices)>=12*np.maximum(0,running-available))
            if p['minimum_seats']:mask &= (seats>=p['minimum_seats'])&known
            indices=np.flatnonzero(mask).tolist();pool={}
            for i in indices:pool.setdefault((catalog[i].brand,catalog[i].model),[]).append(i)
            if len(pool)<2:continue
            finance={k:p[k] for k in ('monthly_income','monthly_expenses','existing_monthly_payment','liquid_assets')}
            group=hashlib.sha256(json.dumps(finance,sort_keys=True).encode()).hexdigest()
            if group in seen:continue
            split=int(group[:8],16)/0xffffffff;role='train' if split<.7 else 'validation' if split<.85 else 'test'
            prefs={'sportiness':None,'angularity':rng.choice([None,None,0.,.5,1.]),'acceleration':rng.choice([None,None,0.,.5,1.])}
            for k in ('design_importance','performance_importance','asset_retention_importance','running_cost_importance'):prefs[k]=rng.choice([1,3,5])
            user={'id':users,'group':group,'profile':asdict(profile),'preferences':prefs,'split':role}
            families=rng.sample(list(pool),min(5,len(pool)));chosen=[rng.choice(pool[f]) for f in families]
            features=[]
            for i in chosen:
                cost=assess(profile,catalog[i])
                if not cost['eligible'] or seating_status(profile,catalog[i])!='match':raise ValueError('Fast eligibility mismatch')
                features.append(encode_height_scenario(user,catalog[i],traits[catalog[i].id],cost))
            pairs=list(itertools.combinations(range(len(chosen)),2));rng.shuffle(pairs);pairs=pairs[:min(10,comparisons-count)]
            scores=[choice_utility(x) for x in features];bucket=buckets[role];offset=len(bucket['features'])
            bucket['features'].extend(features);bucket['profile_ids'].extend([users]*len(chosen));bucket['vehicle_indices'].extend(chosen)
            for a,b in pairs:
                delta=max(-60,min(60,(scores[a]-scores[b])/.25));prob=1/(1+math.exp(-delta));draw=rng.random();label=int(draw<prob)
                bucket['comparisons'].append([offset+a,offset+b]);bucket['labels'].append(label)
                bucket['choices'].append({'user_id':users,'a':chosen[a],'b':chosen[b],'label':label,'probability_a':prob,'draw':draw})
                for i in (chosen[a],chosen[b]):models[role][model_key(catalog[i])]+=1;specs[catalog[i].id]+=1
            bucket['users'].append(user);seen.add(group);accepted+=1;users+=1;count+=len(pairs);counts[role+'_profiles']+=1;counts[role+'_comparisons']+=len(pairs)
        directory=output/f'shard-{len(shards):04d}';directory.mkdir()
        for role,b in buckets.items():
            np.savez_compressed(directory/f'{role}_choices.npz',features=np.asarray(b['features'],dtype=np.float32).reshape(-1,len(FEATURE_NAMES)),comparisons=np.asarray(b['comparisons'],dtype=np.int64).reshape(-1,2),labels=np.asarray(b['labels'],dtype=np.float32),profile_ids=np.asarray(b['profile_ids'],dtype=np.int64),vehicle_indices=np.asarray(b['vehicle_indices'],dtype=np.int64))
            for suffix,rows in [('profiles',b['users']),('choices',b['choices'])]:(directory/f'{role}_{suffix}.jsonl').write_text(''.join(json.dumps(row,ensure_ascii=False)+'\n' for row in rows),encoding='utf-8')
        shards.append({'directory':directory.name});print(json.dumps({'stage':'generate','profiles':users,'comparisons':count,'target':comparisons}),flush=True)
    coverage=coverage_report(catalog,models,specs,{'train':20,'validation':5,'test':5},1);write_json(output/'coverage_report.json',coverage)
    if require_coverage and coverage['status']!='passed':raise ValueError('Vehicle coverage failed')
    write_json(output/'manifest.json',{'version':config['version'],'feature_names':FEATURE_NAMES,'profiles':users,'comparisons':count,'partitions':{r:{'profiles':counts[r+'_profiles'],'comparisons':counts[r+'_comparisons']} for r in ROLES},'shards':shards,'files_sha256':{str(p.relative_to(output)):file_hash(p) for p in output.rglob('*') if p.is_file()},'source_sha256':{str(p.relative_to(ROOT)):file_hash(p) for p in (Path(__file__),ROOT/'ml/vehicle_matching/height_scenario_model.py')}})

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',required=True,type=Path);p.add_argument('--comparisons',type=int,default=3000000);p.add_argument('--source',type=Path);p.add_argument('--smoke',action='store_true');a=p.parse_args();generate(a.output,a.comparisons,source=a.source,require_coverage=not a.smoke)
