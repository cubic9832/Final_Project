import unittest
from unittest.mock import Mock
from vehicle_matching.managed_catalog import ManagedSnapshotGuard
from dataclasses import replace
from types import SimpleNamespace
from fastapi.testclient import TestClient
from vehicle_matching.api import create_app
from vehicle_matching.catalog import Vehicle


class RuntimeCatalogApiTests(unittest.TestCase):
    def test_candidate_endpoint_uses_runtime_public_vehicles(self):
        car = Vehicle('runtime', 'brand', 'model', 'trim', '2026', 23980000,
                      'GASOLINE', 12, 'https://example.test/price', '2026-11-12')
        service = SimpleNamespace(vehicles=[car, replace(car, id='draft', recommendation_enabled=False)])
        with TestClient(create_app(service)) as client:
            response = client.get('/api/v2/recommendation-candidates')
            self.assertEqual(response.status_code, 200)
            self.assertEqual([row['id'] for row in response.json()['data']], ['runtime'])
            service.vehicles = [replace(car, price=25000000)]
            self.assertEqual(client.get('/api/v2/recommendation-candidates').json()['data'][0]['price'], 25000000)

    def test_runtime_candidate_endpoint_keeps_snapshot_guard_and_recovers(self):
        car = Vehicle('runtime', 'brand', 'model', 'trim', '2026', 23980000,
                      'GASOLINE', 12, 'https://example.test/price', '2026-11-12')
        service = SimpleNamespace(vehicles=[car])
        with TestClient(create_app(service)) as client:
            guard = ManagedSnapshotGuard('unused', [car])
            guard.provider.read = Mock(return_value=[replace(car, price=25000000)])
            client.app.state.snapshot_guard = guard
            self.assertEqual(client.get('/api/v2/recommendation-candidates').status_code, 503)
            guard.provider.read = Mock(return_value=[car])
            self.assertEqual(client.get('/api/v2/recommendation-candidates').status_code, 200)
