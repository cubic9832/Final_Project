"""Height feature and high-value pair-data contracts."""
from dataclasses import asdict, replace
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
from vehicle_matching.catalog import ROOT, read_catalog
from vehicle_matching.height_scenario_model import FEATURE_NAMES, HeightScenarioRanker, encode_height_scenario
from vehicle_matching.preference_model import preference_network
from vehicle_matching.ui_scenario_features import encode_ui_scenario
from vehicle_matching.train_ui_scenario import audit
from tools.data.households.generate_height_population import generate

class HeightScenarioTests(unittest.TestCase):
    def test_height_is_extra_input_and_saved_inference_is_identical(self):
        source=ROOT/'data/vehicles/high-value-height-v1-20261102'
        cars=read_catalog(source/'catalog.json');car=cars[0]
        from vehicle_matching.finance import Profile
        p=Profile(monthly_income=10000000,monthly_expenses=1000000,existing_monthly_payment=0,liquid_assets=1000000000,down_payment=0,emergency_reserve=0,monthly_savings=0,annual_distance=15000,months=0,financing_mode='recommendation')
        user={'profile':asdict(p),'preferences':{}}
        traits=json.loads((source/'vehicle_traits.json').read_text(encoding='utf-8'))['vehicles']
        x=encode_height_scenario(user,car,traits[car.id]);self.assertEqual(len(x),39)
        np.testing.assert_array_equal(x[:-1],encode_ui_scenario(user,car,traits[car.id]))
        self.assertNotEqual(x[-1],encode_height_scenario(user,replace(car,height_mm=car.height_mm+10),traits[car.id])[-1])
        stats=(np.zeros(39),np.ones(39),np.zeros(39),np.ones(39))
        model=HeightScenarioRanker(preference_network(39),stats,traits)
        with tempfile.TemporaryDirectory(dir=ROOT/'tmp') as folder:
            output=Path(folder)/'model';model.save(output,{'dataset_version':'ui-scenario-height-population-v2'},source/'catalog.json',source/'vehicle_traits.json')
            loaded=HeightScenarioRanker.load(output)
            self.assertEqual(model.score_candidates(user,[car]),loaded.score_candidates(user,[car]))
            from fastapi.testclient import TestClient
            from vehicle_matching.api import create_app, load_service
            with TestClient(create_app(load_service(output))) as client:
                options=client.get('/api/v2/recommendation-options').json()['data']
                self.assertTrue(options['scenarioSupported']);self.assertEqual(options['featureCount'],39)
                request={'profile':{key:float(user['profile'][key]) for key in ('monthly_income','monthly_expenses','existing_monthly_payment','liquid_assets','emergency_reserve','monthly_savings','annual_distance')},'scenario':{},'k':3}
                response=client.post('/api/v2/recommendations',json=request)
                self.assertEqual(response.status_code,200,response.text)
                self.assertEqual(response.json()['data']['featureCount'],39)
        with self.assertRaisesRegex(ValueError,'height'):replace(car,height_mm=0)

    def test_exact_pair_count_group_isolation_price_band_and_full_audit(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'tmp') as folder:
            output=Path(folder)/'data'
            with contextlib.redirect_stdout(io.StringIO()):generate(output,comparisons=401,require_coverage=False)
            manifest=json.loads((output/'manifest.json').read_text(encoding='utf-8'))
            self.assertEqual(manifest['comparisons'],401);self.assertEqual(manifest['feature_names'],list(FEATURE_NAMES))
            cars=read_catalog(output/'catalog.json');traits=json.loads((output/'vehicle_traits.json').read_text(encoding='utf-8'))['vehicles']
            with contextlib.redirect_stdout(io.StringIO()):report=audit(output,manifest,cars,traits,encode_height_scenario)
            self.assertEqual(report['status'],'passed');self.assertFalse(report['financial_group_leakage'])
            self.assertTrue(any(c.price>248000000 for c in cars));self.assertTrue(all(c.height_mm for c in cars))
