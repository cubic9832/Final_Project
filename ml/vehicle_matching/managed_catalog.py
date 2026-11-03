"""Read the published runtime catalog without modifying frozen training bundles."""
import json
from dataclasses import asdict, fields
import time
from urllib.request import urlopen
from urllib.error import URLError
from fastapi import HTTPException
from vehicle_matching.catalog import Vehicle

class ManagedCatalog:
    def __init__(self,url): self.url=url

    def read(self):
        try:
            with urlopen(self.url,timeout=3) as response:
                payload=json.load(response)
            if payload.get('success') is not True or not isinstance(payload.get('data'),list):
                raise ValueError('Invalid catalog envelope')
            allowed={field.name for field in fields(Vehicle)}
            vehicles=[Vehicle(**{key:value for key,value in row.items() if key in allowed}) for row in payload['data']]
            if len({v.id for v in vehicles})!=len(vehicles):raise ValueError('Duplicate catalog IDs')
            return vehicles
        except (URLError,TimeoutError,ValueError,TypeError,OSError) as error:
            # A removed vehicle must not silently return via a stale model snapshot.
            raise HTTPException(status_code=503,detail='차량 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.') from error


class ManagedSnapshotGuard:
    """Reject stale weights instead of silently ranking edited or deleted DB rows."""
    def __init__(self, url, snapshot):
        self.provider = ManagedCatalog(url)
        self.expected = {car.id: asdict(car) for car in snapshot if car.recommendation_enabled}
        self.checked_at = None

    def check(self):
        now = time.monotonic()
        if self.checked_at is not None and now - self.checked_at < 5:
            return
        actual = {car.id: asdict(car) for car in self.provider.read()}
        if actual != self.expected:
            raise HTTPException(status_code=503, detail='차량 데이터가 학습 시점과 달라졌습니다. 카탈로그 동기화와 재학습이 필요합니다.')
        self.checked_at = now
