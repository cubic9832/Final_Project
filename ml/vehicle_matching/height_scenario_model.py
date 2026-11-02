"""Versioned 39-input UI ranker including vehicle height."""
import numpy as np
from vehicle_matching.ui_scenario_features import FEATURE_NAMES as BASE_FEATURES, encode_ui_scenario
from vehicle_matching.ui_scenario_model import UiScenarioRanker

FEATURE_NAMES = (*BASE_FEATURES, 'height')

def encode_height_scenario(user, vehicle, traits, cost=None):
    if vehicle.height_mm is None:
        raise ValueError('Height is required by height-scenario-v2')
    return np.concatenate((encode_ui_scenario(user, vehicle, traits, cost),
                           np.asarray([vehicle.height_mm / 3500], dtype=np.float32)))

class HeightScenarioRanker(UiScenarioRanker):
    schema = 'ui-scenario-height-ranker-v2'
    feature_names = FEATURE_NAMES
    encode = staticmethod(encode_height_scenario)
