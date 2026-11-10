"""Cria catálogo de áreas novas usando as rotas reais, sem alterar cursos existentes."""
import argparse
import json
import secrets
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from pathlib import Path

import seed_videos_cursos as videos

EMAIL = 'rafael.moreira@cursando.test'
CATALOGO = [
    dict(titulo='Cozinha do cotidiano: preparo de vegetais', categoria='Culinária', tema='Preparo de vegetais',
         descricao='Uma introdução visual à organização da bancada e ao preparo de vegetais. Observe a sequência do trabalho e pratique o planejamento dos ingredientes antes de iniciar uma receita simples.',
         chave='culinaria', fonte=(6544256,'6544256-hd_1920_1080_25fps.mp4','Domenico M'),
         modulos=[('Organização do preparo','Observe a bancada, a tábua e os ingredientes. Faça uma lista do que precisa ficar separado antes de preparar uma salada.'),
                  ('Sequência de cortes','Observe a sequência de preparo dos vegetais. Descreva os passos em ordem e explique por que organizar os ingredientes facilita seguir uma receita.')],
         perguntas=[('Qual atitude facilita o início de uma receita?','Separar os ingredientes e utensílios antes','Procurar os ingredientes somente no final','Misturar tudo sem ler a receita'),
                    ('Para que serve uma tábua no preparo de vegetais?','Oferecer uma superfície adequada para o corte','Substituir todos os utensílios','Medir a temperatura do forno'),
                    ('Por que planejar a sequência do preparo?','Para organizar as etapas e os ingredientes','Para dispensar todos os ingredientes','Para mudar a receita sem observar as etapas')]),
    dict(titulo='Marcenaria artesanal: acabamento de pequenas peças', categoria='Marcenaria', tema='Acabamento em madeira',
         descricao='Conheça visualmente uma etapa de acabamento da madeira. O curso trabalha observação da superfície, organização das etapas e avaliação do resultado em pequenas peças, com atividades descritivas para iniciantes.',
         chave='marcenaria', fonte=(6789910,'6789910-hd_1920_1080_25fps.mp4','Tima Miroshnichenko'),
         modulos=[('Conhecendo a superfície','Observe a textura da madeira e a etapa de lixamento mostrada no clipe. Descreva as diferenças entre uma superfície áspera e uma superfície mais uniforme. A filmagem é ilustrativa; não substitui treinamento para operar ferramentas.'),
                  ('Observação do acabamento','Observe o trabalho em passes sucessivos. Escreva uma lista de aspectos para avaliar no resultado, como uniformidade e marcas aparentes. A atividade é de observação, sem exigir o uso de máquinas.')],
         perguntas=[('Qual é uma finalidade do lixamento da madeira?','Reduzir asperezas da superfície','Aumentar as farpas','Transformar madeira em metal'),
                    ('Ao avaliar um acabamento, o que observar?','A uniformidade da superfície','Somente a cor da roupa de quem trabalhou','O nome do arquivo do vídeo'),
                    ('Uma atividade de observação do acabamento deve registrar o quê?','Textura e marcas aparentes','Apenas o preço de uma ferramenta','Somente o tamanho da tela usada')]),
    dict(titulo='Primeiros movimentos no violão', categoria='Música', tema='Introdução ao violão',
         descricao='Observe a posição do instrumento e a participação das duas mãos ao tocar violão. Uma introdução visual para reconhecer movimentos e organizar pequenas sequências de prática, sem exigir experiência musical.',
         chave='violao', fonte=(4553937,'4553937-hd_1920_1080_30fps.mp4','Pavel Danilyuk'),
         modulos=[('Instrumento e posição das mãos','Observe a posição do violão e das mãos. Identifique a mão que atua no braço e a mão que movimenta as cordas. O foco desta atividade é visual; o clipe preparado não possui narração ou áudio musical.'),
                  ('Movimentos e sequência de prática','Acompanhe visualmente os movimentos das mãos. Descreva uma sequência curta de observação e repetição lenta, com pausas para perceber a coordenação. Não é necessário reproduzir a música do vídeo.')],
         perguntas=[('Qual parte do violão contém as cordas que se pressionam para formar diferentes notas?','O braço do instrumento','A parte externa do estojo','A alça do estojo'),
                    ('Ao começar uma sequência de movimentos, qual estratégia facilita a prática?','Repetir devagar e observar a coordenação','Acelerar ao máximo desde a primeira tentativa','Ignorar o movimento das mãos'),
                    ('Na atividade visual do curso, o que deve ser observado?','A posição do instrumento e os movimentos das mãos','Apenas a decoração do ambiente','Somente a marca da roupa do músico')]),
]


def preparar(item):
    chave=item['chave']
    videos.FONTES[chave]=item['fonte']
    _, fonte=videos.preparar_fonte(chave)
    trechos=[]
    duracao=min(10,fonte['duracao']/2)
    for indice in range(2):
        arquivo=videos.PASTA/f'{chave}-modulo-{indice+1}.mp4'
        thumb=arquivo.with_suffix('.jpg')
        if not arquivo.exists():
            videos.executar([videos.FFMPEG,'-hide_banner','-loglevel','error','-nostdin','-y',
                '-ss',str(indice*duracao),'-i',fonte['arquivo'],'-t',str(duracao),
                '-c:v','libx264','-preset','fast','-crf','24','-c:a','aac','-movflags','+faststart',arquivo])
        videos.medir(arquivo)
        if not thumb.exists():
            videos.executar([videos.FFMPEG,'-hide_banner','-loglevel','error','-nostdin','-y',
                '-ss','1','-i',arquivo,'-frames:v','1',thumb])
        trechos.append(dict(arquivo=str(arquivo),thumb=str(thumb)))
    return chave,dict(**fonte,trechos=trechos)


def cadastrar():
    from app import app
    from banco_37 import get_db
    from flask_jwt_extended import JWTManager,create_access_token,decode_token
    import usuario_1_3_8_34
    import aluno_4_6_34
    import curso_conteudo_6_11_20_21_28
    import provas_cursos_20
    import chat_cursos_11_19_20

    JWTManager(app)
    videos.PASTA.mkdir(parents=True,exist_ok=True)
    with ThreadPoolExecutor(max_workers=3) as executor:
        fontes=dict(executor.map(preparar,CATALOGO))
    with app.app_context():
        # Apenas leituras diretas: cadastro e alterações passam pelas rotas.
        con=get_db();cur=con.cursor()
        try:
            cur.execute('SELECT FIRST 1 ID_USUARIO FROM USUARIOS WHERE TIPO_USUARIO=0 ORDER BY ID_USUARIO')
            admin=cur.fetchone()[0]
            cur.execute('SELECT ID_USUARIO FROM USUARIOS WHERE EMAIL=? AND TIPO_USUARIO=1',(EMAIL,))
            existente=cur.fetchone()
            while True:
                digitos=[secrets.randbelow(10) for _ in range(9)]
                for tamanho in (9,10):
                    resto=sum(n*p for n,p in zip(digitos,range(tamanho+1,1,-1)))%11
                    digitos.append(0 if resto<2 else 11-resto)
                cpf=''.join(map(str,digitos))
                cur.execute('SELECT 1 FROM USUARIOS WHERE CPF=?',(cpf,))
                if not cur.fetchone():break
        finally:
            cur.close();con.close()

        def sessao(usuario,tipo):
            client=app.test_client()
            token=create_access_token(identity=str(usuario),additional_claims={'tipo':tipo},expires_delta=timedelta(hours=1))
            client.set_cookie(app.config.get('JWT_ACCESS_COOKIE_NAME','access_token_cookie'),token)
            headers={'Authorization':f'Bearer {token}'}
            if csrf:=decode_token(token).get('csrf'):
                headers[app.config.get('JWT_ACCESS_CSRF_HEADER_NAME','X-CSRF-TOKEN')]=csrf
            def chamar(metodo,rota,**parametros):
                resposta=client.open(rota,method=metodo,headers=headers,**parametros)
                if not 200<=resposta.status_code<300:
                    raise RuntimeError(f'{metodo} {rota}: {resposta.status_code} {resposta.get_json()}')
                return resposta.get_json()
            return chamar

        if existente:
            professor=existente[0]
        else:
            senha='Aa!'+secrets.token_urlsafe(20)+'7'
            professor=sessao(admin,0)('POST','/cadastrar_colaborador',json=dict(nome='Rafael Moreira',
                email=EMAIL,cpf=cpf,senha=senha,confirmar_senha=senha,tipo=1))['id_usuario']
        chamar=sessao(professor,1)
        cursos=chamar('GET','/professor/cursos')
        resultados=[]
        for item in CATALOGO:
            fonte=fontes[item['chave']]
            curso_existente=next((c for c in cursos if c['titulo']==item['titulo']),None)
            if curso_existente:
                curso=curso_existente['id']
            else:
                with open(fonte['trechos'][0]['thumb'],'rb') as capa:
                    curso=chamar('POST','/professor/cursos',data=dict(titulo=item['titulo'],descricao=item['descricao'],
                        imagem=(capa,'capa.jpg')),content_type='multipart/form-data')['id_curso']
            classificacao={}
            for tipo,nome in [('categorias',item['categoria']),('temas',item['tema'])]:
                taxonomias=chamar('GET',f'/taxonomias/{tipo}')
                tax=next((t for t in taxonomias if t['nome']==nome),None)
                classificacao['id_categoria' if tipo=='categorias' else 'id_tema']=tax['id'] if tax else chamar('POST',f'/taxonomias/{tipo}',json={'nome':nome})['id']
            chamar('PUT',f'/professor/cursos/{curso}/taxonomia',json=classificacao)
            modulos=chamar('GET',f'/professor/cursos/{curso}/modulos')
            aulas_criadas=[]
            for indice,(titulo,atividade) in enumerate(item['modulos']):
                modulo=next((m for m in modulos if m['titulo']==titulo),None)
                if not modulo:
                    chamar('POST',f'/professor/cursos/{curso}/modulos',json=dict(titulo=titulo,descricao=atividade,ordem=indice))
                    modulos=chamar('GET',f'/professor/cursos/{curso}/modulos')
                    modulo=next(m for m in modulos if m['titulo']==titulo)
                titulo_aula=f'{titulo}: observação e prática'
                aulas=chamar('GET',f'/professor/cursos/{curso}/aulas?id_modulo={modulo["id"]}')
                aula=next((a for a in aulas if a['titulo']==titulo_aula),None)
                if aula:
                    video=aula['id']
                else:
                    trecho=fonte['trechos'][indice]
                    descricao=f'{atividade}\n\nClipe ilustrativo curto, sem narração. Fonte: {fonte["autor"]}, Pexels: {fonte["fonte"]}'
                    with open(trecho['arquivo'],'rb') as arquivo,open(trecho['thumb'],'rb') as thumb:
                        video=chamar('POST',f'/professor/cursos/{curso}/aulas',data=dict(id_modulo=str(modulo['id']),
                            titulo=titulo_aula,descricao=descricao,video=(arquivo,'aula.mp4'),thumb=(thumb,'thumb.jpg')),
                            content_type='multipart/form-data')['id_aula']
                chamar('PATCH',f'/professor/aulas/{video}/status',json={'status':1})
                aulas_criadas.append(video)
            provas=chamar('GET',f'/professor/cursos/{curso}/provas')['provas']
            if not any(p['estado']=='vigente' for p in provas):
                questoes=[]
                for indice,(enunciado,correta,*incorretas) in enumerate(item['perguntas']):
                    alternativas=[correta,*incorretas]
                    alternativas=alternativas[indice:]+alternativas[:indice]
                    questoes.append(dict(enunciado=enunciado,tipo='objetiva',alternativas=alternativas,resposta_esperada=correta))
                prova=chamar('POST',f'/professor/cursos/{curso}/provas',json=dict(titulo=f'Avaliação: {item["titulo"]}',nota_minima=60,questoes=questoes))['id_prova']
                chamar('PATCH',f'/professor/provas/{prova}/publicar')
            chamar('PATCH',f'/professor/cursos/{curso}/status',json={'status':1})
            resultados.append(dict(curso=curso,titulo=item['titulo'],aulas=aulas_criadas,fonte=fonte))
            print(f'Publicado: {curso} - {item["titulo"]} (2 módulos, 2 aulas)',flush=True)
        (videos.PASTA/'novas_areas.json').write_text(json.dumps(dict(professor=professor,cursos=resultados),ensure_ascii=False,indent=2),encoding='utf-8')
        print('Concluído: 3 cursos, 6 módulos, 6 aulas e 3 provas.',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cadastrar',action='store_true',required=True)
    parser.parse_args()
    cadastrar()
