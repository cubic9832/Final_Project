"""Height ranges in millimeters; shared boundaries belong to the next band."""
HEIGHT_BANDS = {'low': (1100, 1399), 'medium': (1400, 1699), 'high': (1700, 2000)}


def matches_height(preference, height_mm):
    if preference == 'any':
        return True
    lower, upper = HEIGHT_BANDS[preference]
    return height_mm is not None and lower <= height_mm <= upper
