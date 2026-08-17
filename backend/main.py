from flask import Flask
import fdb
import os
import sys
import threading
import time
from flask_cors import CORS


app = Flask(__name__)
sys.modules.setdefault('main', sys.modules[__name__])
app.config.from_pyfile('config.py')

app.config['SESSION_COOKIE_SAMESITE'] = "None"
app.config['SESSION_COOKIE_SECURE'] = True

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    "https://cursando-iota.vercel.app",
    "https://cursando-br.vercel.app"
])

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


class FirebirdConnectionProxy:
    def __init__(self, flask_app):
        self.app = flask_app
        self.local = threading.local()

    def _dsn(self):
        database = self.app.config['DB_NAME']
        host = self.app.config.get('DB_HOST')
        port = self.app.config.get('DB_PORT')

        if host:
            if port:
                return f"{host}/{port}:{database}"
            return f"{host}:{database}"

        return database

    def _connect_once(self):
        database = self.app.config['DB_NAME']
        if not os.path.exists(database):
            raise FileNotFoundError(f"Banco Firebird nao encontrado em '{database}'")

        kwargs = {
            "dsn": self._dsn(),
            "user": self.app.config['DB_USER'],
            "password": self.app.config['DB_PASSWORD'],
        }

        charset = self.app.config.get('DB_CHARSET')
        if charset:
            kwargs["charset"] = charset

        return fdb.connect(**kwargs)

    def reconnect(self):
        self.close()
        connection = self._connect_once()
        self.local.connection = connection
        return connection

    def get(self):
        connection = getattr(self.local, "connection", None)
        if connection is None:
            connection = self.reconnect()
        return connection

    def cursor(self):
        try:
            return self.get().cursor()
        except Exception:
            return self.reconnect().cursor()

    def commit(self):
        return self.get().commit()

    def rollback(self):
        return self.get().rollback()

    def close(self):
        connection = getattr(self.local, "connection", None)
        if connection is not None:
            try:
                connection.close()
            except Exception:
                pass
            self.local.connection = None

    def test_connection(self):
        cursor = None
        try:
            cursor = self.cursor()
            cursor.execute("select 1 from rdb$database")
            cursor.fetchone()
        finally:
            if cursor is not None:
                cursor.close()


def wait_for_database(connection_proxy):
    database = app.config['DB_NAME']
    retries = app.config['DB_CONNECT_RETRIES']
    retry_delay = app.config['DB_CONNECT_RETRY_DELAY']
    last_error = None

    for attempt in range(1, retries + 1):
        try:
            connection_proxy.test_connection()
            print(f"Conectado ao Firebird em {connection_proxy._dsn()}", flush=True)
            return
        except Exception as exc:
            last_error = exc
            print(
                f"Tentativa {attempt}/{retries} falhou ao conectar no Firebird "
                f"'{database}': {exc}",
                flush=True,
            )
            time.sleep(retry_delay)

    raise RuntimeError(f"Erro ao conectar no banco Firebird '{database}': {last_error}") from last_error


con = FirebirdConnectionProxy(app)
wait_for_database(con)

if __name__ == '__main__':
    app.run(host=app.config['HOST'], port=app.config['PORT'], debug=app.config['DEBUG'])