import importlib
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


class SecurityConfigTests(unittest.TestCase):
    def reload_security(self):
        import core.security as security
        return importlib.reload(security)

    def test_startup_security_config_fails_without_secret_key(self):
        with patch.dict(os.environ, {}, clear=True):
            security = self.reload_security()

            with self.assertRaisesRegex(RuntimeError, "SECRET_KEY environment variable is required"):
                security.validate_security_config()

    def test_development_mode_allows_missing_secret_key(self):
        with patch.dict(os.environ, {"ENV": "development"}, clear=True):
            security = self.reload_security()

            security.validate_security_config()
            self.assertTrue(security.get_jwt_secret_key())


if __name__ == "__main__":
    unittest.main()
