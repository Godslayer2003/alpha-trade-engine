import importlib
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient


class TestServiceAccess(unittest.TestCase):
    def test_internal_endpoint_requires_shared_secret(self):
        with patch.dict(os.environ, {'AI_ENGINE_SHARED_SECRET': 'test-only-secret'}):
            from app import main
            importlib.reload(main)
            with TestClient(main.app) as client:
                self.assertEqual(client.get('/health').status_code, 200)
                self.assertEqual(client.get('/v1/market/candles').status_code, 401)
                self.assertEqual(
                    client.get('/v1/market/candles', headers={'x-internal-secret': 'test-only-secret'}).status_code,
                    422,
                )


if __name__ == '__main__':
    unittest.main()
