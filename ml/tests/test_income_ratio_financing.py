import unittest
from dataclasses import asdict, replace

from fastapi.testclient import TestClient

from test_preferences import FixedRanker
from test_vehicle_matching import person, vehicle
from vehicle_matching.api import create_app
from vehicle_matching.budget import financed_amount, recommendation_budget
from vehicle_matching.finance import INCOME_RATIO_ANNUAL_RATE, assess, installment
from vehicle_matching.service import CandidateService

# person(): 월 가용자금 330만 원(600 − 150 − 20 − 100), 차에 쓸 예금 5,500만 원(6,000 − 500)
FUNDS = 55000000


def household(**changes):
    return person(financing_mode='recommendation', down_payment=0, **changes)


class IncomeRatioFinancingTests(unittest.TestCase):
    def test_installment_and_running_cost_within_income_share_make_car_above_savings_eligible(self):
        car = vehicle(price=70000000)
        self.assertIn('insufficient-cash-for-outright-purchase', assess(household(), car)['exclusions'])
        cost = assess(household(vehicle_income_ratio=30, vehicle_payment_months=36), car)
        self.assertTrue(cost['eligible'])
        self.assertEqual(cost['principal'], 70000000 - FUNDS)
        self.assertEqual(cost['monthly_payment'], -(-installment(15000000, INCOME_RATIO_ANNUAL_RATE, 36) // 1))
        self.assertEqual(cost['monthly_total'], cost['monthly_payment'] + cost['monthly_running_cost'])
        self.assertEqual(cost['monthly_vehicle_cap'], 1800000)

    def test_monthly_total_above_income_share_is_excluded_even_with_spare_savings(self):
        cheap = vehicle(price=10000000)
        cost = assess(household(vehicle_income_ratio=5), cheap)
        self.assertGreater(cost['monthly_running_cost'], 300000)
        self.assertEqual(cost['exclusions'], ['exceeds-income-ratio'])
        self.assertEqual(cost['funding_source'], 'income')

    def test_boundary_at_exact_cap_is_eligible_and_one_won_less_is_not(self):
        car = vehicle(price=70000000)
        total = assess(household(vehicle_income_ratio=30, vehicle_payment_months=36), car)['monthly_total']
        # 소득 1원 단위로 한도를 total 에 정확히 맞춘다 (100% 비율: 한도 = 월 가용자금).
        exact = household(vehicle_income_ratio=100, vehicle_payment_months=36,
                          monthly_income=1500000 + 200000 + 1000000 + total)
        self.assertTrue(assess(exact, car)['eligible'])
        self.assertIn('exceeds-income-ratio', assess(replace(exact, monthly_income=exact.monthly_income - 1), car)['exclusions'])

    def test_income_share_never_exceeds_money_left_each_month(self):
        cost = assess(household(vehicle_income_ratio=100, vehicle_payment_months=12), vehicle())
        self.assertEqual(cost['monthly_vehicle_cap'], 3300000)

    def test_lump_sum_with_income_share_still_requires_cash(self):
        cost = assess(household(vehicle_income_ratio=30), vehicle(price=70000000))
        self.assertIn('insufficient-cash-for-outright-purchase', cost['exclusions'])
        self.assertNotIn('insufficient-monthly-buffer', cost['exclusions'])

    def test_months_without_ratio_are_rejected(self):
        with self.assertRaises(ValueError):
            household(vehicle_payment_months=36)


class IncomeRatioBudgetTests(unittest.TestCase):
    def test_price_upper_adds_principal_repayable_by_cap_minus_cheapest_running_cost(self):
        cars = [vehicle(id='a', model='A', price=40000000), vehicle(id='b', model='B', price=70000000)]
        profile = household(vehicle_income_ratio=30, vehicle_payment_months=36)
        costs = {car.id: assess(profile, car) for car in cars}
        band = recommendation_budget(profile, cars, costs)
        financed = int(financed_amount(1800000 - costs['a']['monthly_running_cost'], 36))
        self.assertEqual(band['policy'], 'income-ratio-financing-band-v1')
        self.assertEqual(band['financedAmount'], financed)
        self.assertEqual(band['upper'], FUNDS + financed)
        self.assertGreater(band['upper'], FUNDS)

    def test_zero_ratio_keeps_cash_only_band(self):
        band = recommendation_budget(household(), [vehicle()], {'example': assess(household(), vehicle())})
        self.assertEqual(band['policy'], 'cash-importance-band-v1')
        self.assertEqual(band['upper'], FUNDS)

    def test_service_recommends_financed_car_with_public_installment(self):
        cars = [vehicle(id='a', model='A', price=40000000), vehicle(id='b', model='B', price=70000000)]
        service = CandidateService(FixedRanker(), cars)
        cash = service.recommend(person())
        financed = service.recommend(person(vehicle_income_ratio=30, vehicle_payment_months=36))
        self.assertEqual([r['vehicle']['id'] for r in cash['recommendations']], ['a'])
        chosen = {r['vehicle']['id']: r for r in financed['recommendations']}
        self.assertIn('b', chosen)
        self.assertGreater(chosen['b']['cost']['monthly_payment'], 0)
        self.assertEqual(chosen['b']['decisionEvidence']['financial']['financing'], 'installment')
        self.assertEqual(chosen['b']['decisionEvidence']['financial']['cashAfterPurchase'], 0)


class IncomeRatioApiTests(unittest.TestCase):
    def test_api_accepts_ratio_and_rejects_unknown_months(self):
        service = CandidateService(FixedRanker(), [vehicle(price=70000000)])
        with TestClient(create_app(service)) as client:
            profile = {key: value for key, value in asdict(person()).items() if key != 'financing_mode'}
            ok = client.post('/api/v2/recommendations', json={'profile': {**profile, 'vehicle_income_ratio': 30, 'vehicle_payment_months': 36}})
            self.assertEqual(ok.status_code, 200)
            self.assertEqual(len(ok.json()['data']['recommendations']), 1)
            bad = client.post('/api/v2/recommendations', json={'profile': {**profile, 'vehicle_income_ratio': 30, 'vehicle_payment_months': 30}})
            self.assertEqual(bad.status_code, 400)


if __name__ == '__main__':
    unittest.main()
