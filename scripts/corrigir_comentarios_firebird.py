"""Corrige UTF-8 interpretado como Latin-1 somente nos comentários Firebird.

Usa DB_USER/DB_PASSWORD e, opcionalmente, DB_HOST e FIREBIRD_CLIENT_LIB.
Execute com o Python do backend e --database apontando para uma cópia do banco.
O DDL é transacional: SQL fora dos comentários e BLR devem permanecer idênticos.
"""

import argparse
import os
import re

import fdb


# Literais vêm antes dos comentários para preservar aspas e seus conteúdos.
TOKENS = re.compile(r"'(?:''|[^'])*'|\"(?:\"\"|[^\"])*\"|/\*.*?\*/|--[^\r\n]*", re.S)


def corrigir_comentarios(source):
    count = 0

    def corrigir(match):
        nonlocal count
        text = match[0]
        if text.startswith(('/*', '--')) and re.search(r'[ÃÂ][\x80-\xbf]', text):
            corrected = text.encode('latin1').decode('utf-8')
            count += 1
            return corrected
        return text

    return TOKENS.sub(corrigir, source), count


def sem_comentarios(source):
    return TOKENS.sub(lambda m: '' if m[0].startswith(('/*', '--')) else m[0], source)


def ler_blob(value):
    return value.read() if hasattr(value, 'read') else value


def corrigir_banco(connection):
    cursor = connection.cursor()
    total_objects = total_comments = 0
    try:
        for kind, table, prefix in (
            ('TRIGGER', 'RDB$TRIGGERS', 'RDB$TRIGGER'),
            ('FUNCTION', 'RDB$FUNCTIONS', 'RDB$FUNCTION'),
        ):
            cursor.execute(
                f'SELECT {prefix}_NAME, {prefix}_SOURCE, {prefix}_BLR '
                f'FROM {table} WHERE COALESCE(RDB$SYSTEM_FLAG, 0) = 0'
            )
            objects = [tuple(ler_blob(v) for v in row) for row in cursor.fetchall()]
            for name, source, blr in objects:
                if not source:
                    continue
                corrected, count = corrigir_comentarios(source)
                if not count:
                    continue
                if sem_comentarios(source) != sem_comentarios(corrected):
                    raise RuntimeError('SQL fora dos comentários foi alterado.')
                quoted_name = '"' + name.strip().replace('"', '""') + '"'
                if kind == 'FUNCTION':
                    # Assinatura existente no commit 80143e5; nenhuma outra
                    # função é recriada com parâmetros inferidos.
                    if name.strip() != 'AUDIT_JSON':
                        raise RuntimeError(f'Assinatura não suportada: {name.strip()}')
                    ddl = (
                        f'ALTER FUNCTION {quoted_name} ("VALOR" VARCHAR(1000)) '
                        'RETURNS BLOB SUB_TYPE TEXT AS '
                    )
                else:
                    # O corpo AS preserva evento, posição e estado do gatilho.
                    ddl = f'ALTER TRIGGER {quoted_name} '
                cursor.execute(ddl + corrected)
                cursor.execute(
                    f'SELECT {prefix}_SOURCE, {prefix}_BLR FROM {table} '
                    f'WHERE {prefix}_NAME = ?', (name,)
                )
                actual_source, actual_blr = map(ler_blob, cursor.fetchone())
                if actual_source != corrected or actual_blr != blr:
                    raise RuntimeError(f'Fonte ou BLR divergente: {name.strip()}')
                total_objects += 1
                total_comments += count
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
    return total_objects, total_comments


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', required=True)
    args = parser.parse_args()
    if os.environ.get('FIREBIRD_CLIENT_LIB'):
        fdb.load_api(os.environ['FIREBIRD_CLIENT_LIB'])
    connection = fdb.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        database=args.database,
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        charset='UTF8',
    )
    try:
        objects, comments = corrigir_banco(connection)
        print(f'{comments} comentários corrigidos em {objects} objetos; BLR preservado.')
    finally:
        connection.close()


if __name__ == '__main__':
    main()
