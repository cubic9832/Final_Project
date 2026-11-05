import copy
import json
from pathlib import Path
import unittest

from tools.data.vehicles.build_reviewed_specifications import complete_catalog
from vehicle_matching.catalog import ROOT, read_catalog
from vehicle_matching.finance import Profile
from vehicle_matching.recommendation_policy import seating_status
from vehicle_matching.preferences import exclusions


class SpecificationCompletionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = json.loads((ROOT / 'ml/outputs/models/scenario-choices/20261103-unified-managed-3m/catalog.json').read_text(encoding='utf-8'))
        cls.manifest = json.loads((ROOT / 'data/vehicles/specification-completion-20261104/manifest.json').read_text(encoding='utf-8'))

    def test_completion_preserves_frozen_input_and_rejects_changed_identity_or_facts(self):
        original = copy.deepcopy(self.source)
        completed = complete_catalog(self.source, self.manifest)
        self.assertEqual(self.source, original)
        self.assertEqual({row['id'] for row in completed}, {row['id'] for row in original})
        identifier = self.manifest['vehicles'][0]['identity']['id']
        for key, value in [('price', 1), ('length_mm', 4000)]:
            changed = copy.deepcopy(original)
            next(row for row in changed if row['id'] == identifier)[key] = value
            with self.assertRaises(ValueError):
                complete_catalog(changed, self.manifest)

    def test_published_coverage_and_cargo_seating_filter_use_completed_facts(self):
        cars = read_catalog(ROOT / 'ml/outputs/models/scenario-choices/20261104-specifications-completed/catalog.json')
        public = [car for car in cars if car.recommendation_enabled]
        self.assertTrue(all(car.length_mm and car.seats for car in public))
        by_id = {car.id: car for car in cars}
        profile = Profile(monthly_income=10000000, monthly_expenses=1000000,
            existing_monthly_payment=0, liquid_assets=200000000, emergency_reserve=0,
            monthly_savings=0, annual_distance=12000, down_payment=0, months=0,
            minimum_seats=5, preferred_size='large')
        cargo = by_id['legacy-db-167']
        self.assertEqual(seating_status(profile, cargo), 'insufficient')
        self.assertIn('insufficient-seats', exclusions(profile, cargo))
        tourer = by_id['legacy-db-170']
        self.assertEqual(seating_status(profile, tourer), 'match')
        self.assertNotIn('length-unverified', exclusions(profile, tourer))


if __name__ == '__main__':
    unittest.main()
