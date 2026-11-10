"""Perfis de apresentação, sem dados de contato ou informações financeiras."""
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco_37 import get_db
from perfis_identidade import preparar_identidades
from professor_7 import de_blob_texto, thumb_aula_por_id
from utilitarios_backend_5_9_12_15_20_24_28_34 import resposta


@app.route('/perfis/<string:identificador>', methods=['GET'])
@jwt_required(optional=True)
def perfil_apresentacao(identificador):
    preparar_identidades()
    con = get_db()
    cur = con.cursor()
    try:
        campo = 'ARROBA' if identificador.startswith('@') else 'ID_PUBLICO'
        valor = identificador[1:].lower() if campo == 'ARROBA' else identificador
        cur.execute(f'SELECT NOME,TIPO_USUARIO,IMAGEM_PERFIL,ID_USUARIO,ID_PUBLICO,ARROBA FROM USUARIOS WHERE {campo}=?', (valor,))
        usuario = cur.fetchone()
        if not usuario or usuario[1] not in (1, 2):
            return resposta('Perfil não encontrado.', 404)
        id_usuario = usuario[3]
        proprio = str(get_jwt_identity()) == str(id_usuario)
        professor = usuario[1] == 1
        try:
            pagina = max(1, int(request.args.get('pagina', 1)))
            pagina_avaliacoes = max(1, int(request.args.get('pagina_avaliacoes', 1)))
            minimo = float(request.args.get('avaliacao_min') or 0)
            if not 0 <= minimo <= 5:
                raise ValueError()
            classificacoes = [(campo, int(request.args[campo])) for campo in ('categoria', 'tema') if request.args.get(campo)]
        except (ValueError, OverflowError):
            return resposta('Filtros ou paginação inválidos.', 400)
        tamanho = 9
        base = '''FROM CURSOS C
            LEFT JOIN CURSO_TAXONOMIA CT ON CT.ID_CURSO=C.ID_CURSO
            LEFT JOIN CATEGORIAS_CURSO CAT ON CAT.ID_CATEGORIA=CT.ID_CATEGORIA
            LEFT JOIN TEMAS_CURSO T ON T.ID_TEMA=CT.ID_TEMA
            WHERE C.EXCLUIDO=0 AND C.STATUS=1 AND '''
        base += ('''EXISTS (SELECT 1 FROM PROFESSORES_CURSO PC
                    WHERE PC.ID_CURSO=C.ID_CURSO AND PC.ID_USUARIO=?)''' if professor else
                 '''EXISTS (SELECT 1 FROM MATRICULAS M WHERE M.ID_CURSO=C.ID_CURSO
                    AND M.ID_USUARIO=? AND M.STATUS_MATRICULA=1)''')
        cur.execute('SELECT C.ID_CURSO,CT.ID_CATEGORIA,CAT.NOME,CT.ID_TEMA,T.NOME ' + base, (id_usuario,))
        todos = cur.fetchall()
        categorias = {r[1]: r[2] for r in todos if r[1] is not None}
        temas = {r[3]: r[4] for r in todos if r[3] is not None}
        resumo = dict(cursos=len(todos))
        params = [id_usuario]
        filtro = ''
        busca = request.args.get('busca', '').strip()[:150]
        if busca:
            filtro += ' AND C.TITULO CONTAINING ?'
            params.append(busca)
        for campo, valor in classificacoes:
            filtro += f' AND CT.{"ID_CATEGORIA" if campo == "categoria" else "ID_TEMA"}=?'
            params.append(valor)
        media = '(SELECT AVG(CAST(A.NOTA AS DOUBLE PRECISION)) FROM AVALIACOES_CURSO A WHERE A.ID_CURSO=C.ID_CURSO)'
        if minimo:
            filtro += f' AND COALESCE({media},0)>=?'
            params.append(minimo)
        ordens = {'recentes': 'C.CRIADO_EM DESC,C.ID_CURSO DESC', 'titulo': 'C.TITULO,C.ID_CURSO',
                  'avaliacao': '6 DESC,C.ID_CURSO DESC', 'inscritos': '7 DESC,C.ID_CURSO DESC'}
        ordem = request.args.get('ordem', 'recentes')
        if ordem not in ordens:
            return resposta('Ordenação inválida.', 400)
        cur.execute('SELECT COUNT(*) ' + base + filtro, params)
        total = cur.fetchone()[0]
        paginas = max(1, (total + tamanho - 1) // tamanho)
        pagina = min(pagina, paginas)
        # Progresso considera somente aulas publicadas, inclusive o estado do módulo.
        aulas_visiveis = '''FROM VIDEOS V WHERE V.ID_CURSO=C.ID_CURSO AND V.EXCLUIDO=0 AND V.STATUS=1
            AND (V.ID_MODULO IS NULL OR EXISTS (SELECT 1 FROM MODULOS_CURSO MO
                WHERE MO.ID_MODULO=V.ID_MODULO AND MO.STATUS=1))'''
        sql = f'''SELECT FIRST {tamanho} SKIP {(pagina-1)*tamanho}
            C.ID_CURSO,C.TITULO,C.DESCRICAO,C.IMAGEM_URL,CAT.NOME,COALESCE({media},0),
            (SELECT COUNT(DISTINCT M.ID_USUARIO) FROM MATRICULAS M WHERE M.ID_CURSO=C.ID_CURSO),
            (SELECT COUNT(*) {aulas_visiveis}),
            (SELECT COUNT(*) {aulas_visiveis} AND EXISTS (SELECT 1 FROM PROGRESSO_AULAS PA
                WHERE PA.ID_VIDEO=V.ID_VIDEO AND PA.ID_USUARIO=?)),
            CASE WHEN EXISTS (SELECT 1 FROM RESPOSTAS_PROVA R WHERE R.ID_CURSO=C.ID_CURSO
                AND R.ID_USUARIO=? AND R.STATUS=1) THEN 1 ELSE 0 END
            {base}{filtro} ORDER BY {ordens[ordem]}'''
        cur.execute(sql, [id_usuario, id_usuario, *params])
        cursos = []
        for r in cur.fetchall():
            curso = dict(id=r[0],titulo=r[1],descricao=de_blob_texto(r[2]),imagem=r[3],categoria=r[4],
                         avaliacao_media=round(float(r[5]),2),total_inscritos=r[6],total_aulas=r[7])
            if not professor:
                curso.update(aulas_concluidas=r[8],progresso=min(100,round(r[8]/r[7]*100)) if r[7] else 0,
                             aprovado=bool(r[9]))
            cursos.append(curso)
        aulas, avaliacoes = [], dict(itens=[],total=0,pagina=1,paginas=1)
        if professor:
            cur.execute('''SELECT FIRST 6 V.ID_VIDEO,V.TITULO,C.ID_CURSO,C.TITULO,MO.TITULO,V.DATA_UPLOAD
                FROM VIDEOS V JOIN CURSOS C ON C.ID_CURSO=V.ID_CURSO
                LEFT JOIN MODULOS_CURSO MO ON MO.ID_MODULO=V.ID_MODULO
                WHERE C.STATUS=1 AND C.EXCLUIDO=0 AND V.STATUS=1 AND V.EXCLUIDO=0
                  AND (V.ID_MODULO IS NULL OR MO.STATUS=1)
                  AND EXISTS (SELECT 1 FROM PROFESSORES_CURSO PC WHERE PC.ID_CURSO=C.ID_CURSO AND PC.ID_USUARIO=?)
                ORDER BY V.DATA_UPLOAD DESC,V.ID_VIDEO DESC''',(id_usuario,))
            aulas = [dict(id=r[0],titulo=r[1],id_curso=r[2],curso=r[3],modulo=r[4],thumb=thumb_aula_por_id(r[0]),
                          data=r[5].isoformat() if r[5] else None) for r in cur.fetchall()]
        else:
            origem = '''FROM AVALIACOES_CURSO A JOIN CURSOS C ON C.ID_CURSO=A.ID_CURSO
                WHERE A.ID_USUARIO=? AND C.EXCLUIDO=0 AND C.STATUS=1'''
            cur.execute('SELECT COUNT(*) '+origem,(id_usuario,))
            total_avaliacoes = cur.fetchone()[0]
            paginas_avaliacoes = max(1,(total_avaliacoes+8)//9)
            pagina_avaliacoes = min(pagina_avaliacoes,paginas_avaliacoes)
            cur.execute(f'''SELECT FIRST 9 SKIP {(pagina_avaliacoes-1)*9} A.ID_AVALIACAO,C.ID_CURSO,C.TITULO,
                A.NOTA,A.COMENTARIO,A.CRIADO_EM {origem} ORDER BY A.CRIADO_EM DESC,A.ID_AVALIACAO DESC''',(id_usuario,))
            avaliacoes = dict(itens=[dict(id=r[0],id_curso=r[1],curso=r[2],nota=r[3],comentario=de_blob_texto(r[4]),
                data=r[5].isoformat() if r[5] else None) for r in cur.fetchall()],total=total_avaliacoes,
                pagina=pagina_avaliacoes,paginas=paginas_avaliacoes)
            resumo['avaliacoes'] = total_avaliacoes
        retorno = jsonify(consulta=identificador,usuario=dict(id_publico=usuario[4],arroba=usuario[5],
            identificador='@'+usuario[5] if professor and usuario[5] else usuario[4],
            nome=usuario[0],tipo=usuario[1],imagem_perfil=usuario[2],proprio=proprio),
            resumo=resumo,cursos=dict(itens=cursos,total=total,pagina=pagina,paginas=paginas),aulas_recentes=aulas,
            avaliacoes=avaliacoes,categorias=[dict(id=k,nome=v) for k,v in sorted(categorias.items(),key=lambda x:x[1] or '')],
            temas=[dict(id=k,nome=v) for k,v in sorted(temas.items(),key=lambda x:x[1] or '')])
        retorno.headers['Cache-Control'] = 'private, no-store'
        return retorno
    except Exception:
        app.logger.exception('Erro ao carregar perfil de apresentação')
        return resposta('Não foi possível carregar este perfil.',500)
    finally:
        cur.close()
        con.close()
