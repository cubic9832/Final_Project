"""Database edits must not silently invalidate the serving model's catalog."""
from dataclasses import replace
import unittest
from unittest.mock import Mock
from fastapi import HTTPException
from vehicle_matching.catalog import Vehicle
from vehicle_matching.managed_catalog import ManagedSnapshotGuard


class ManagedSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.car = Vehicle('managed-a', 'brand', 'model', 'trim', '2026', 30000000,
                           'GASOLINE', 12, 'https://example.test/price', '2026-11-03')

    def test_published_catalog_matches_but_review_rows_do_not_require_publication(self):
        review = replace(self.car, id='review', recommendation_enabled=False)
        guard = ManagedSnapshotGuard('unused', [self.car, review])
        guard.provider.read = Mock(return_value=[self.car])
        guard.check()
        self.assertIsNotNone(guard.checked_at)

    def test_price_change_and_deletion_require_retraining(self):
        for actual in ([], [replace(self.car, price=31000000)]):
            guard = ManagedSnapshotGuard('unused', [self.car])
            guard.provider.read = Mock(return_value=actual)
            with self.assertRaises(HTTPException) as raised:
                guard.check()
            self.assertEqual(raised.exception.status_code, 503)


if __name__ == '__main__':
    unittest.main()
