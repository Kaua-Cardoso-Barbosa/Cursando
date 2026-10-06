import os
from datetime import timedelta

from dotenv import load_dotenv


load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


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
DB_LOG_NAME = os.path.join(
    os.path.dirname(__file__),
    os.getenv("DB_LOG_NAME", "LOG_GRAVACAO.FDB")
)
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "cursandoemail@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "True").lower() == "true"


JWT_SECRET_KEY = SECRET_KEY
JWT_TOKEN_LOCATION = os.getenv(
    "JWT_TOKEN_LOCATION",
    "cookies,headers"
).split(",")

JWT_ACCESS_COOKIE_NAME = os.getenv(
    "JWT_ACCESS_COOKIE_NAME",
    "token"
)
JWT_ACCESS_TOKEN_EXPIRES = timedelta(
    days=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_DAYS", "7"))
)
JWT_ADMIN_ACCESS_TOKEN_EXPIRES = timedelta(
    minutes=int(os.getenv("JWT_ADMIN_ACCESS_TOKEN_EXPIRES_MINUTES", "15"))
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
VALOR_ASSINATURA = float(os.getenv("VALOR_ASSINATURA", "10.00"))
