"""Importance-specific purchase band; monthly affordability stays mandatory."""
import math

from vehicle_matching.finance import INCOME_RATIO_ANNUAL_RATE, monthly_vehicle_cap


def lower_percent(cost_importance):
    # UI uses 1/3/5; API values 2 and 4 share the adjacent low/high groups.
    return 80 if cost_importance <= 2 else 70 if cost_importance == 3 else 60


def financed_amount(monthly_payment, months, annual_rate=INCOME_RATIO_ANNUAL_RATE):
    """Principal that a level monthly installment repays; inverse of finance.installment."""
    if monthly_payment <= 0 or months <= 0:
        return 0
    if annual_rate == 0:
        return monthly_payment * months
    rate = annual_rate / 12
    return monthly_payment * (1 - (1 + rate) ** -months) / rate


def recommendation_budget(profile, vehicles, costs):
    funds = max(0, profile.liquid_assets - profile.emergency_reserve)
    monthly = max(0, profile.monthly_income - profile.monthly_expenses - profile.existing_monthly_payment
                  - profile.monthly_savings - profile.minimum_buffer)
    cap = monthly_vehicle_cap(profile)
    financed = 0
    if cap is not None and profile.vehicle_payment_months:
        # Purchase capacity comes from the selected installment, independently of
        # catalog eligibility. Running costs are checked separately in assess().
        financed = math.floor(financed_amount(cap, profile.vehicle_payment_months))
    upper = math.floor(funds) + financed
    if profile.purchase_price_ceiling:
        upper = min(upper, math.floor(profile.purchase_price_ceiling))
    percent = lower_percent(profile.cost_importance)
    # Integer arithmetic rounds up to the first allowed won without float drift.
    lower = (upper * percent + 99) // 100
    income = {} if cap is None else {'policy': 'income-ratio-financing-band-v1', 'monthlyIncomeRatio': profile.vehicle_income_ratio,
                                     'financingMonths': profile.vehicle_payment_months, 'financingAnnualRate': INCOME_RATIO_ANNUAL_RATE,
                                     'monthlyVehicleCap': round(cap), 'financedAmount': financed}
    return {'policy': 'cash-importance-band-v1', 'lower': lower, 'upper': upper,
            'financialUpper': upper, 'availablePurchaseFunds': round(funds), 'monthlyVehicleBudget': round(monthly),
            'referenceMonthlyRunningCost': None, 'lowerRatio': percent / 100,
            'costImportance': profile.cost_importance, 'catalogCapped': False, **income}


def apply_budget_preference(score, vehicle, band):
    """Compatibility helper; the price band is an eligibility filter, not a bonus."""
    return {**score, 'policy': 'cash-importance-band-v1'}


def top_catalog_fallback(profile, catalog, eligible, band):
    """Only relax a band above the entire catalog; retain hard eligibility."""
    catalog_upper = max((vehicle.price for vehicle in catalog), default=0)
    if not catalog_upper or band['lower'] <= catalog_upper:
        return None
    from vehicle_matching.recommendation_policy import seating_status
    models = set()
    selected = []
    for vehicle in sorted(eligible, key=lambda car: (-car.price, car.id)):
        model = (vehicle.brand, vehicle.model)
        if seating_status(profile, vehicle) != 'match' or model in models:
            continue
        models.add(model)
        selected.append(vehicle)
        if len(selected) == 9:
            break
    return selected


def budget_order(vehicle, score, band):
    return (-score, vehicle.id)
