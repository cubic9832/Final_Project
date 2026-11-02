import unittest
from dataclasses import replace
from pathlib import Path

from vehicle_matching.api import load_service
from vehicle_matching.finance import Profile
from vehicle_matching.height_preferences import HEIGHT_BANDS, matches_height


class HeightPreferenceTests(unittest.TestCase):
    def test_boundaries_have_no_gaps_or_overlaps(self):
        for height in range(1100, 2001):
            self.assertEqual(sum(matches_height(band, height) for band in HEIGHT_BANDS), 1)
        self.assertFalse(matches_height('low', None))
        self.assertTrue(matches_height('any', None))

    def test_recommendations_respect_height_even_with_budget_supplementation(self):
        service = load_service(Path(__file__).resolve().parents[1] / 'outputs/models/scenario-choices/20261102-height-high-value-3m')
        profile = Profile(monthly_income=10000000, monthly_expenses=1000000,
                          existing_monthly_payment=0, liquid_assets=1000000000,
                          down_payment=0, emergency_reserve=0, monthly_savings=0,
                          annual_distance=15000, months=0)
        for band in HEIGHT_BANDS:
            result = service.recommend(replace(profile, preferred_height=band), 9)
            self.assertTrue(result['recommendations'])
            for item in result['recommendations']:
                self.assertTrue(matches_height(band, item['vehicle']['height_mm']))
