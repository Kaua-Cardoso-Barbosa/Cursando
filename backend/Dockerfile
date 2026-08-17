FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PORT=5000
ENV DB_HOST=127.0.0.1
ENV DB_PORT=3050
ENV DB_NAME=/app/WEBCAR.FDB
ENV DB_USER=sysdba
ENV DB_PASSWORD=masterkey

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libfbclient2 \
    firebird4.0-server \
    firebird4.0-utils \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chown firebird:firebird /app/WEBCAR.FDB || true \
    && chmod 664 /app/WEBCAR.FDB || true

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 5000
EXPOSE 3050

CMD ["/entrypoint.sh"]