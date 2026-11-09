"""Regra única de liberação da avaliação, independente da prova final."""


def calcular_liberacao(total, concluidas, matriculado):
    necessarias = (3 * total + 3) // 4
    restantes = max(0, necessarias - concluidas)
    pode = bool(matriculado and total > 0 and restantes == 0)
    regra = "Assista e conclua pelo menos 75% das aulas para avaliar o curso."
    if not matriculado:
        mensagem = "Inscreva-se no curso. " + regra
    elif total == 0:
        mensagem = "A avaliação será liberada quando houver aulas publicadas e você concluir 75% delas."
    elif pode:
        mensagem = f"Avaliação liberada: você concluiu {concluidas} de {total} aulas. Não é necessário passar na prova para avaliar."
    else:
        mensagem = f"Você concluiu {concluidas} de {total} aulas. Faltam {restantes} para liberar sua avaliação."
    return dict(pode_avaliar=pode, minimo_percentual=75, total_aulas=total,
                aulas_concluidas=concluidas, aulas_necessarias=necessarias,
                aulas_restantes=restantes, mensagem=mensagem, regra=regra)


def consultar_liberacao(cursor, id_curso, id_aluno):
    cursor.execute("""
        SELECT FIRST 1 M.ID_CURSO FROM MATRICULAS M
        JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
        WHERE M.ID_CURSO = ? AND M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
          AND C.EXCLUIDO = 0 AND C.STATUS = 1
    """, (id_curso, id_aluno))
    matriculado = cursor.fetchone() is not None
    cursor.execute("""
        SELECT COUNT(DISTINCT V.ID_VIDEO), COUNT(DISTINCT PA.ID_VIDEO)
        FROM VIDEOS V
        LEFT JOIN PROGRESSO_AULAS PA ON PA.ID_VIDEO = V.ID_VIDEO AND PA.ID_USUARIO = ?
        WHERE V.ID_CURSO = ? AND V.EXCLUIDO = 0 AND V.STATUS = 1
          AND (V.ID_MODULO IS NULL OR EXISTS (
              SELECT 1 FROM MODULOS_CURSO MC WHERE MC.ID_MODULO = V.ID_MODULO AND MC.STATUS = 1
          ))
    """, (id_aluno, id_curso))
    total, concluidas = cursor.fetchone()
    return calcular_liberacao(total, concluidas, matriculado)
