import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


SECRET_KEY = os.getenv("SECRET_KEY", "WebCar@123")

DEBUG = env_bool("FLASK_DEBUG", False)

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "5000"))

DB_HOST = os.getenv("DB_HOST", "127.0.0.1").strip()
DB_PORT = int(os.getenv("DB_PORT", "3050"))
DB_NAME = os.getenv("DB_NAME", os.path.join(BASE_DIR, "Cursando.FDB"))
DB_USER = os.getenv("DB_USER", "sysdba")
DB_PASSWORD = os.getenv("DB_PASSWORD", "masterkey")
DB_CHARSET = os.getenv("DB_CHARSET", "").strip()
DB_CONNECT_RETRIES = int(os.getenv("DB_CONNECT_RETRIES", "30"))
DB_CONNECT_RETRY_DELAY = float(os.getenv("DB_CONNECT_RETRY_DELAY", "2"))

WAITRESS_THREADS = int(os.getenv("WAITRESS_THREADS", "8"))