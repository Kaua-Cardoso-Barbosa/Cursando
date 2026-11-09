"""?ndices, sequ?ncia e deduplica??o dos envios do chat; prepara??o ?nica por processo."""
from banco_37 import get_db


def preparar_chat():
    con = get_db()
    cur = con.cursor()
    try:
        cur.execute("SELECT 1 FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME = 'MENSAGENS_CHAT' AND RDB$FIELD_NAME = 'CHAVE_ENVIO'")
        if not cur.fetchone():
            cur.execute('ALTER TABLE MENSAGENS_CHAT ADD CHAVE_ENVIO VARCHAR(80)')
            con.commit()
        cur.execute("SELECT 1 FROM RDB$GENERATORS WHERE RDB$GENERATOR_NAME = 'GEN_CHAT_MENSAGEM'")
        if not cur.fetchone():
            cur.execute('CREATE SEQUENCE GEN_CHAT_MENSAGEM')
            con.commit()
        # Também recupera uma preparação interrompida após criar a sequência.
        # O avanço relativo nunca diminui o gerador, mesmo com vários processos.
        cur.execute('SELECT COALESCE(MAX(ID_MENSAGEM), 0) FROM MENSAGENS_CHAT')
        maior_id = int(cur.fetchone()[0])
        cur.execute('SELECT GEN_ID(GEN_CHAT_MENSAGEM, 0) FROM RDB$DATABASE')
        atual = int(cur.fetchone()[0])
        if atual < maior_id:
            cur.execute('SELECT GEN_ID(GEN_CHAT_MENSAGEM, CAST(? AS INTEGER)) FROM RDB$DATABASE', (maior_id - atual,))
            cur.fetchone()
        for nome, colunas, unico in [
            ('IX_CHAT_CONVERSA', 'ID_CURSO, ID_ALUNO, ID_MENSAGEM', False),
            ('IX_CHAT_NAO_LIDAS', 'ID_DESTINATARIO, LIDA, ID_CURSO, ID_ALUNO', False),
        ]:
            cur.execute('SELECT 1 FROM RDB$INDICES WHERE RDB$INDEX_NAME = ?', (nome,))
            if not cur.fetchone():
                cur.execute(f"CREATE {'UNIQUE ' if unico else ''}INDEX {nome} ON MENSAGENS_CHAT ({colunas})")
        cur.execute("SELECT 1 FROM RDB$INDICES WHERE RDB$INDEX_NAME = 'UQ_CHAT_ENVIO'")
        if not cur.fetchone():
            # Uma chave NULL precisa continuar permitindo as mensagens anteriores.
            cur.execute("""CREATE UNIQUE INDEX UQ_CHAT_ENVIO ON MENSAGENS_CHAT
                COMPUTED BY (CAST(ID_REMETENTE AS VARCHAR(20)) || ':' || CHAVE_ENVIO)""")
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        cur.close()
        con.close()
