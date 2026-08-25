from waitress import serve
from main import app

if __name__ == "__main__":
    serve(
        app,
        host=app.config["HOST"],
        port=app.config["PORT"],
        threads=app.config["WAITRESS_THREADS"],
    )