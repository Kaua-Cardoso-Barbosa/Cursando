import os

from dotenv import load_dotenv


load_dotenv()


SECRET_KEY = os.getenv("SECRET_KEY")

DEBUG = os.getenv("DEBUG", "False").lower() == "true"

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "5000"))
WAITRESS_THREADS = int(os.getenv("WAITRESS_THREADS", "4"))


DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.path.join(
    os.path.dirname(__file__),
    os.getenv("DB_NAME", "BANCO.FDB")
)
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")


JWT_SECRET_KEY = SECRET_KEY
JWT_TOKEN_LOCATION = os.getenv(
    "JWT_TOKEN_LOCATION",
    "cookies,headers"
).split(",")

JWT_ACCESS_COOKIE_NAME = os.getenv(
    "JWT_ACCESS_COOKIE_NAME",
    "token"
)

JWT_COOKIE_SECURE = os.getenv(
    "JWT_COOKIE_SECURE",
    "False"
).lower() == "true"

JWT_COOKIE_CSRF_PROTECT = os.getenv(
    "JWT_COOKIE_CSRF_PROTECT",
    "False"
).lower() == "true"

JWT_COOKIE_SAMESITE = os.getenv(
    "JWT_COOKIE_SAMESITE",
    "Lax"
)


# Arkhé

ARKHE_BASE_URL = os.getenv("ARKHE_BASE_URL")
ARKHE_CLIENT_ID = os.getenv("ARKHE_CLIENT_ID")
ARKHE_CLIENT_SECRET = os.getenv("ARKHE_CLIENT_SECRET")