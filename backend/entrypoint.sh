#!/bin/sh

echo "Iniciando Firebird 4..."

service firebird4.0 start || true

echo "Aguardando Firebird escutar em ${DB_HOST}:${DB_PORT}..."

for i in $(seq 1 30); do
  nc -z "$DB_HOST" "$DB_PORT" && break
  sleep 1
done

if ! nc -z "$DB_HOST" "$DB_PORT"; then
  echo "ERRO: Firebird nao abriu a porta ${DB_PORT}"
  exit 1
fi

echo "Firebird abriu a porta ${DB_PORT}"

echo "Lendo senha atual do SYSDBA..."

CURRENT_PASSWORD="masterkey"

if [ -f /etc/firebird/4.0/SYSDBA.password ]; then
  CURRENT_PASSWORD=$(grep ISC_PASSWORD /etc/firebird/4.0/SYSDBA.password | cut -d'"' -f2)
fi

echo "Tentando ajustar senha do SYSDBA para DB_PASSWORD..."

gsec -user SYSDBA -password "$CURRENT_PASSWORD" -modify SYSDBA -pw "$DB_PASSWORD" || \
gsec -user SYSDBA -password masterkey -modify SYSDBA -pw "$DB_PASSWORD" || \
gsec -user SYSDBA -password sysdba -modify SYSDBA -pw "$DB_PASSWORD" || true

echo "Testando conexao com ${DB_NAME}..."

isql-fb -user "$DB_USER" -password "$DB_PASSWORD" "$DB_HOST/$DB_PORT:$DB_NAME" -q <<EOF || true
SELECT 1 FROM RDB\$DATABASE;
EOF

echo "Iniciando backend Flask..."

python server.py