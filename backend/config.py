import os

class Settings:
    PROJECT_NAME: str = "Cursando"
    PROJECT_VERSION: str = "1.0.0"

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "firebird+fdb://SYSDBA:masterkey@localhost:3050/C:/caminho/do/seu/banco/cursando.fdb"
    )

    SECRET_KEY: str = os.getenv("SECRET_KEY", "chave_secreta_super_segura")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

settings = Settings()