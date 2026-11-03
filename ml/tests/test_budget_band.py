import unittest
from dataclasses import replace

from test_preferences import FixedRanker
from test_vehicle_matching import person,vehicle
from vehicle_matching.service import CandidateService
from vehicle_matching.budget import recommendation_budget
from vehicle_matching.finance import assess


class BudgetBandTests(unittest.TestCase):
    def test_price_does_not_break_equal_ml_score_ties(self):
        cars=[vehicle(id='cheap',model='Cheap',price=10000000,length_mm=4100),
              vehicle(id='a',model='A',price=40000000,length_mm=6000),
              vehicle(id='b',model='B',price=45000000,length_mm=6000),
              vehicle(id='c',model='C',price=50000000,length_mm=6000)]
        result=CandidateService(FixedRanker(),cars).recommend(person(cost_importance=5,liquid_assets=60000000))
        self.assertEqual({r['vehicle']['model'] for r in result['recommendations']},{'A','B','C'})
        self.assertEqual(result['recommendations'][0]['vehicle']['model'], 'A')
        self.assertEqual(result['budgetPolicy']['lower'],33000000)

    def test_price_band_prefers_in_range_then_fills_below_without_exceeding_cap(self):
        cars=[vehicle(id=str(i),model=str(i),price=price) for i,price in enumerate((10000000,25000000,30000000,50000000,100000000))]
        p=person(purchase_price_ceiling=50000000,liquid_assets=60000000)
        result=CandidateService(FixedRanker(),cars).recommend(p)
        self.assertEqual([r['vehicle']['price'] for r in result['recommendations']],[50000000,10000000,25000000])
        self.assertEqual(result['budgetPolicy']['supplementedCount'],2)
        self.assertTrue(all(r['cost']['eligible'] for r in result['recommendations']))

    def test_fuel_preference_orders_equal_ml_scores_without_exceeding_cash(self):
        cars = [vehicle(id='ev', model='Electric', price=40000000, fuel='ELECTRIC', efficiency=5),
                vehicle(id='gas', model='Gas', price=45000000, fuel='GASOLINE', efficiency=12),
                vehicle(id='expensive', model='Expensive', price=60000000, fuel='ELECTRIC', efficiency=5)]
        service = CandidateService(FixedRanker(), cars)
        p = person(preferred_fuel='ELECTRIC', fuel_importance=5, cost_importance=1, liquid_assets=45000000, emergency_reserve=0)
        electric = service.recommend(p)
        gas = service.recommend(replace(p, preferred_fuel='GASOLINE'))
        self.assertEqual(electric['recommendations'][0]['vehicle']['id'], 'ev')
        self.assertEqual(gas['recommendations'][0]['vehicle']['id'], 'gas')
        self.assertEqual(len(electric['recommendations']), 2)
        self.assertTrue(all(r['cost']['eligible'] for r in electric['recommendations']))
        self.assertNotIn('expensive', [r['vehicle']['id'] for r in electric['recommendations']])
        self.assertTrue(all(electric['recommendations'][i]['rankingScore'] >=
                            electric['recommendations'][i+1]['rankingScore']
                            for i in range(len(electric['recommendations'])-1)))

    def test_more_funds_raise_reference_price_band_when_catalog_has_candidates(self):
        cars=[vehicle(id=str(i),model=str(i),price=i*10000000) for i in range(1,16)]
        service=CandidateService(FixedRanker(),cars)
        p=person(monthly_income=3000000,monthly_expenses=1500000,monthly_savings=500000,
                 existing_monthly_payment=200000,liquid_assets=30000000,down_payment=0,emergency_reserve=5000000)
        low=service.recommend(p); high=service.recommend(replace(p,monthly_income=6000000,liquid_assets=60000000))
        self.assertGreater(high['budgetPolicy']['upper'],low['budgetPolicy']['upper'])
        self.assertTrue(all(r['vehicle']['price'] <= high['budgetPolicy']['financialUpper'] for r in high['recommendations']))

    def test_income_never_becomes_purchase_cash_or_raises_cash_budget(self):
        cars=[vehicle(id=str(i),model=str(i),price=i*10000000) for i in range(1,16)]
        service=CandidateService(FixedRanker(),cars)
        p=person(liquid_assets=30000000,down_payment=0,emergency_reserve=5000000)
        first=service.recommend(p); rich_salary=service.recommend(replace(p,monthly_income=30000000))
        self.assertEqual(first['budgetPolicy']['financialUpper'],25000000)
        self.assertEqual(first['budgetPolicy']['upper'],rich_salary['budgetPolicy']['upper'])
        self.assertTrue(all(r['vehicle']['price']<=25000000 for r in rich_salary['recommendations']))
        no_cash=replace(p,monthly_income=30000000,liquid_assets=0,emergency_reserve=0)
        self.assertEqual(service.recommend(no_cash)['recommendations'],[])

    def test_empty_or_sparse_financial_pool_is_not_filled_with_ineligible_cars(self):
        poor=person(monthly_income=1000000,monthly_expenses=1000000,monthly_savings=0,
                    existing_monthly_payment=0,liquid_assets=0,emergency_reserve=0,down_payment=0)
        service=CandidateService(FixedRanker(),[vehicle()])
        self.assertEqual(service.recommend(poor)['recommendations'],[])
        self.assertEqual(len(service.recommend(person(liquid_assets=35000000))['recommendations']),1)

    def test_importance_band_boundaries_prioritize_in_range_and_fill_below(self):
        prices = (59999999, 60000000, 69999999, 70000000, 79999999, 80000000, 100000000, 100000001)
        cars = [vehicle(id=str(price), model=str(price), price=price, seats=5) for price in prices]
        for importance, lower in ((1,80000000),(2,80000000),(3,70000000),(4,60000000),(5,60000000)):
            with self.subTest(importance=importance):
                profile = person(liquid_assets=100000000, emergency_reserve=0, cost_importance=importance)
                result = CandidateService(FixedRanker(),cars,ml_only=True).recommend(profile,20)
                self.assertEqual(result['budgetPolicy']['lower'], lower)
                self.assertEqual({r['vehicle']['price'] for r in result['recommendations']},
                                 {price for price in prices if price <= 100000000})
                tiers=[r['vehicle']['price'] < lower for r in result['recommendations']]
                self.assertEqual(tiers,sorted(tiers))
                unavailable = vehicle(id='unaffordable',model='Unaffordable',price=200000000)
                empty = CandidateService(FixedRanker(),[cars[0],unavailable],ml_only=True).recommend(profile)
                self.assertEqual([r['vehicle']['id'] for r in empty['recommendations']], [cars[0].id])
                self.assertEqual(empty['budgetPolicy']['lower'], lower)

    def test_fractional_lower_boundary_rounds_up_and_conditional_candidates_obey_band(self):
        profile = person(liquid_assets=100000001, emergency_reserve=0, cost_importance=5, minimum_seats=7)
        cars = [vehicle(id='below',model='Below',price=60000000,seats=None),
                vehicle(id='edge',model='Edge',price=60000001,seats=None)]
        result = CandidateService(FixedRanker(),cars,ml_only=True).recommend(profile)
        self.assertEqual(result['budgetPolicy']['lower'],60000001)
        self.assertEqual([r['vehicle']['id'] for r in result['conditionalRecommendations']],['edge'])

    def test_above_catalog_uses_nine_distinct_expensive_models_then_ml_order(self):
        class WeightedRanker(FixedRanker):
            def score_candidates(self,profile,cars):
                sign = 1 if profile.cost_importance == 1 else -1
                return [sign * car.price for car in cars], [False] * len(cars)
        cars=[vehicle(id=str(i),model=str(i),price=i*10000000,seats=5) for i in range(1,13)]
        cars.append(vehicle(id='duplicate',model='12',price=119000000,seats=5))
        service=CandidateService(WeightedRanker(),cars,ml_only=True)
        profile=person(liquid_assets=1000000000,emergency_reserve=0,cost_importance=1)
        result=service.recommend(profile,9)
        self.assertTrue(result['budgetPolicy']['fallbackApplied'])
        self.assertEqual([r['vehicle']['price'] for r in result['recommendations']],list(range(120000000,30000000,-10000000)))
        reverse=service.recommend(replace(profile,cost_importance=5),9)
        self.assertEqual([r['vehicle']['price'] for r in reverse['recommendations']],list(range(40000000,130000000,10000000)))
        self.assertEqual(len({r['vehicle']['model'] for r in result['recommendations']}),9)

    def test_fallback_does_not_relax_required_seats_or_fill_from_unknown_seats(self):
        cars=[vehicle(id='two',model='Two',price=100000000,seats=2),
              vehicle(id='unknown',model='Unknown',price=90000000,seats=None),
              vehicle(id='family',model='Family',price=80000000,seats=7)]
        profile=person(liquid_assets=1000000000,emergency_reserve=0,minimum_seats=7)
        result=CandidateService(FixedRanker(),cars,ml_only=True).recommend(profile,9)
        self.assertEqual([r['vehicle']['id'] for r in result['recommendations']],['family'])
        self.assertEqual(result['conditionalRecommendations'],[])

    def test_exact_catalog_ceiling_still_uses_normal_band(self):
        profile=person(liquid_assets=100000000,emergency_reserve=0,cost_importance=1)
        result=CandidateService(FixedRanker(),[vehicle(price=80000000)],ml_only=True).recommend(profile,9)
        self.assertEqual(result['budgetPolicy']['policy'],'cash-importance-band-v1')

    def test_supplements_respect_seats_and_rank_within_each_group(self):
        class PriceRanker(FixedRanker):
            def score_candidates(self,profile,cars):
                return [-car.price for car in cars], [False]*len(cars)
        cars=[vehicle(id='preferred',model='Preferred',price=150000000,seats=5),
              vehicle(id='low',model='Low',price=30000000,seats=5),
              vehicle(id='mid',model='Mid',price=40000000,seats=5),
              vehicle(id='short',model='Short',price=20000000,seats=2),
              vehicle(id='unknown',model='Unknown',price=25000000,seats=None),
              vehicle(id='over',model='Over',price=210000000,seats=5)]
        profile=person(liquid_assets=200000000,emergency_reserve=0,minimum_seats=5,cost_importance=3)
        result=CandidateService(PriceRanker(),cars,ml_only=True).recommend(profile,9)
        self.assertEqual([r['vehicle']['id'] for r in result['recommendations']],['preferred','low','mid'])
        self.assertEqual(result['budgetPolicy']['supplementedCount'],2)


if __name__=='__main__': unittest.main()
