"""Cadastra provas simples de três questões pelas rotas reais do sistema."""
import argparse
from datetime import timedelta


# Cada questão guarda enunciado, resposta correta e duas alternativas incorretas.
PERGUNTAS = {
    2: [
        ('No sistema decimal, dez unidades equivalem a quanto?', 'Uma dezena', 'Uma centena', 'Duas dezenas'),
        ('Como representar o número 23 em dezenas e unidades?', '2 dezenas e 3 unidades', '3 dezenas e 2 unidades', '2 centenas e 3 unidades'),
        ('Quanto é 7 + 5?', '12', '10', '15'),
    ],
    8: [
        ('Antes de planejar uma campanha digital, o que é importante definir?', 'O público e o objetivo da campanha', 'Somente a cor do anúncio', 'Somente o número de publicações'),
        ('Qual situação é um exemplo de conversão em uma campanha de vendas?', 'Uma pessoa realizar a compra desejada', 'Uma imagem carregar na tela', 'Uma pessoa apenas visualizar a página'),
        ('Por que acompanhar os resultados de uma campanha?', 'Para avaliar o objetivo e ajustar as ações', 'Para garantir que toda campanha tenha lucro', 'Para dispensar o planejamento das próximas ações'),
    ],
    9: [
        ('Quanto é 25 + 17?', '42', '32', '52'),
        ('Qual é a metade de 20?', '10', '5', '15'),
        ('Qual valor de x torna verdadeira a igualdade x + 4 = 10?', '6', '4', '14'),
    ],
    11: [
        ('Se a calopsita se afasta durante a aproximação, qual atitude respeita seu ritmo?', 'Parar e aumentar a distância', 'Continuar avançando até tocá-la', 'Segurá-la para impedir que se afaste'),
        ('No reforço positivo, quando oferecer a recompensa?', 'Logo após o comportamento voluntário desejado', 'Antes de qualquer comportamento, sem relação com ele', 'Apenas muito tempo depois da atividade'),
        ('Antes de começar uma interação, o que convém observar?', 'A postura e a distância que a ave aceita', 'Somente a cor das penas', 'Somente o tamanho do poleiro'),
    ],
    12: [
        ('Um grupo de 17 objetos pode ser organizado de qual forma?', '1 dezena e 7 unidades', '7 dezenas e 1 unidade', '1 centena e 7 unidades'),
        ('Quantas dezenas formam uma centena?', '10', '5', '100'),
        ('No número 36, qual algarismo ocupa a posição das unidades?', '6', '3', '9'),
    ],
    13: [
        ('Qual estratégia facilita calcular 48 + 19 mentalmente?', 'Somar 20 e depois subtrair 1', 'Somar 20 e depois somar 1', 'Subtrair 20 e depois somar 1'),
        ('Quanto é 60 - 28?', '32', '42', '38'),
        ('Qual decomposição corresponde ao número 47?', '40 + 7', '4 + 7', '40 + 70'),
    ],
    14: [
        ('Um produto custa R$ 100 e recebe desconto de 10%. Qual é o novo preço?', 'R$ 90', 'R$ 110', 'R$ 10'),
        ('Para comparar embalagens de tamanhos diferentes, qual medida ajuda mais?', 'O preço por unidade de medida, como quilo ou litro', 'Somente a cor da embalagem', 'Somente o preço total, ignorando a quantidade'),
        ('Uma quantia de R$ 100 tem um único acréscimo de 10%. Qual é o total?', 'R$ 110', 'R$ 101', 'R$ 90'),
    ],
    15: [
        ('Em um problema, o que é a incógnita?', 'Um valor que precisamos descobrir', 'Um valor que já foi informado', 'O título do exercício'),
        ('Qual é a solução de x + 3 = 8?', '5', '11', '3'),
        ('Como conferir se um valor resolve uma equação?', 'Substituir a incógnita pelo valor e verificar a igualdade', 'Escolher o maior número do enunciado', 'Somar todos os números sem verificar a igualdade'),
    ],
    16: [
        ('Uma página recebeu 100 visitantes e gerou 5 compras. Qual foi a taxa de conversão?', '5%', '50%', '95%'),
        ('Uma campanha custou R$ 100 e trouxe 10 novos clientes. Qual foi o custo por aquisição?', 'R$ 10 por cliente', 'R$ 100 por cliente', 'R$ 1 por cliente'),
        ('Qual indicador conta uma venda, em vez de apenas uma visita?', 'Número de compras concluídas', 'Número de páginas abertas', 'Número de impressões do anúncio'),
    ],
    17: [
        ('Qual frase apresenta uma chamada para ação clara?', 'Inscreva-se no curso', 'Talvez alguma coisa aconteça', 'Esta página contém palavras'),
        ('Por que conhecer o público antes de escrever um anúncio?', 'Para relacionar a mensagem às necessidades das pessoas', 'Para usar sempre o maior número de palavras', 'Para evitar explicar o produto'),
        ('Uma proposta de valor deve destacar principalmente o quê?', 'O benefício que a oferta entrega ao público', 'Somente o nome da fonte usada', 'Uma promessa impossível de comprovar'),
    ],
    18: [
        ('Qual registro descreve algo que pode ser observado diretamente?', 'A ave se afastou quando a mão se aproximou', 'A ave pensou que a pessoa estava atrasada', 'A ave decidiu que amanhã não vai brincar'),
        ('Se a ave evita uma interação, qual atitude respeita seu comportamento?', 'Dar espaço e fazer uma pausa', 'Impedir que ela se afaste', 'Repetir a aproximação cada vez mais rápido'),
        ('O planejamento da rotina deve considerar quais momentos?', 'Descanso, alimentação e interação', 'Somente os momentos de brincadeira', 'Somente o horário disponível do tutor, sem observar a ave'),
    ],
    19: [
        ('Qual é uma finalidade do enriquecimento ambiental?', 'Oferecer oportunidades de exploração e atividades', 'Eliminar todas as oportunidades de movimento', 'Forçar a ave a participar de qualquer atividade'),
        ('Ao apresentar uma atividade nova, o que é útil registrar?', 'Como a ave se aproxima, explora ou se afasta', 'Somente o preço do objeto', 'Somente a cor preferida do tutor'),
        ('Por que observar as preferências da ave ao planejar atividades?', 'Para adaptar as propostas à participação dela', 'Para garantir que toda ave goste do mesmo objeto', 'Para dispensar a observação nas próximas atividades'),
    ],
    20: [
        ('Antes de fazer um retrato, o que observar sobre a luz?', 'A direção de onde ela vem', 'Somente a marca da câmera', 'Somente a quantidade de fotos no cartão'),
        ('Qual escolha ajuda a destacar a pessoa em um retrato?', 'Um fundo que não dispute a atenção com o rosto', 'Um fundo sempre mais chamativo que a pessoa', 'Deixar o rosto fora de todo enquadramento'),
        ('O enquadramento define principalmente o quê?', 'O que entra na imagem e como os elementos se organizam', 'O nome do arquivo depois de salvar', 'A velocidade da internet usada para enviar a foto'),
    ],
    21: [
        ('Linhas presentes na arquitetura podem ajudar em qual aspecto da composição?', 'Guiar o olhar pela imagem', 'Alterar a marca da câmera', 'Aumentar a quantidade de memória disponível'),
        ('O que pode mudar ao fotografar a mesma cena de um ponto mais baixo?', 'A perspectiva e a relação entre os elementos', 'O horário em que a cena aconteceu', 'O local físico onde a cena aconteceu'),
        ('O que ajuda uma sequência de fotos a construir uma narrativa?', 'Uma relação visual ou temática entre as imagens', 'Fotos sem qualquer relação entre si', 'Usar obrigatoriamente a mesma distância em todas as fotos'),
    ],
}


def cadastrar():
    from app import app
    from banco_37 import get_db
    from flask_jwt_extended import JWTManager, create_access_token, decode_token
    import provas_cursos_20

    JWTManager(app)
    with app.app_context():
        con = get_db()
        cur = con.cursor()
        try:
            # Consulta somente os dados necessários para autenticar o dono correto.
            cur.execute('''SELECT C.ID_CURSO,C.TITULO,MIN(PC.ID_USUARIO) FROM CURSOS C
                JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO=C.ID_CURSO
                WHERE C.EXCLUIDO=0 GROUP BY C.ID_CURSO,C.TITULO ORDER BY C.ID_CURSO''')
            cursos = cur.fetchall()
        finally:
            cur.close()
            con.close()
        total = 0
        for curso, nome, professor in cursos:
            if curso not in PERGUNTAS:
                continue
            client = app.test_client()
            token = create_access_token(identity=str(professor), additional_claims={'tipo':1}, expires_delta=timedelta(hours=1))
            client.set_cookie(app.config.get('JWT_ACCESS_COOKIE_NAME','access_token_cookie'),token)
            headers = {'Authorization':f'Bearer {token}'}
            if csrf := decode_token(token).get('csrf'):
                headers[app.config.get('JWT_ACCESS_CSRF_HEADER_NAME','X-CSRF-TOKEN')] = csrf

            def chamar(metodo, rota, **parametros):
                resposta = client.open(rota,method=metodo,headers=headers,**parametros)
                if not 200 <= resposta.status_code < 300:
                    raise RuntimeError(f'{metodo} {rota}: {resposta.status_code} {resposta.get_json()}')
                return resposta.get_json()

            titulo = f'Avaliação: {nome}'[:150]
            provas = chamar('GET',f'/professor/cursos/{curso}/provas')['provas']
            existente = next((p for p in provas if p['titulo']==titulo and p['estado'] in ('vigente','rascunho')),None)
            if existente:
                prova = existente['id']
            else:
                questoes = []
                for indice, (enunciado, correta, *incorretas) in enumerate(PERGUNTAS[curso]):
                    alternativas = [correta,*incorretas]
                    deslocamento = (curso+indice)%3
                    alternativas = alternativas[deslocamento:]+alternativas[:deslocamento]
                    questoes.append(dict(enunciado=enunciado,tipo='objetiva',alternativas=alternativas,resposta_esperada=correta))
                prova = chamar('POST',f'/professor/cursos/{curso}/provas',json={
                    'titulo':titulo,'nota_minima':60,'questoes':questoes})['id_prova']
                total += 1
            if not existente or existente['estado']=='rascunho':
                chamar('PATCH',f'/professor/provas/{prova}/publicar')
            dados = chamar('GET',f'/professor/provas/{prova}')
            if len(dados['questoes']) != 3:
                raise ValueError(f'A prova {prova} não possui exatamente três questões.')
            print(f'Curso {curso}: prova {prova}, 3 questões objetivas, mínimo 60%.',flush=True)
        print(f'Concluído: {total} novas provas cadastradas e publicadas pelas rotas.',flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cadastrar',action='store_true',required=True)
    parser.parse_args()
    cadastrar()
