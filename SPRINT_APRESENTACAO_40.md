<!-- Sprint item 40 - Explicar o funcionamento de cada item desenvolvido - Orienta a leitura dos blocos revisados e relaciona os arquivos de cada item -->
# Guia dos 40 itens da sprint

A numeração segue a lista de itens fornecida para a revisão. Cada bloco usa `Sprint item N - descrição - resumo do trecho` e `Fim item N`, junto ao código correspondente. Um item pode reaparecer em blocos separados e em vários arquivos. Os sufixos dos arquivos contêm a união dos itens identificados pelos comentários, em ordem crescente.

Os resumos descrevem a responsabilidade do bloco: cálculos, consultas, validações, ações de interface ou suporte específico ao item. Não significam que todo o requisito é implementado isoladamente naquele trecho. Código compartilhado e infraestrutura genérica não recebem todos os números dos seus consumidores.

Pontos de entrada e configurações reconhecidos pelas ferramentas conservam os nomes exigidos: `backend/app.py`, `backend/main.py`, `backend/server.py`, `frontend/src/main.jsx`, `frontend/vite.config.js`, `mobile/App.js` e `mobile/babel.config.js`. O ponto de entrada mobile reexporta a implementação numerada. O sufixo `.module.css` também é preservado.

Esta revisão reorganiza comentários, nomes e referências; não acrescenta funcionalidades. O saque (32) continua sujeito à análise e ao pagamento manual do administrador, sem transferência automática para a conta ARKHÉ. A recomendação (29) usa categorias e temas dos cursos vinculados ao aluno, sem um motor baseado em todo o histórico de buscas e compras. As proteções de tela na web (10 e 26) reagem somente aos eventos detectáveis pelo navegador.

## Item 1 — Implementar cadastro de alunos pelo aplicativo

O cadastro valida os dados, cria o aluno pendente e confirma o e-mail. O aplicativo usa essas rotas para obter a sessão.

Arquivos:

- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [backend/funcao_1_3.py](backend/funcao_1_3.py)
- [backend/templates/codigo_verificacao_1.html](backend/templates/codigo_verificacao_1.html)
- [backend/usuario_1_3_8_34.py](backend/usuario_1_3_8_34.py)
- [frontend/src/App_1_3_5_13_23_25.jsx](frontend/src/App_1_3_5_13_23_25.jsx)
- [frontend/src/pages/Cadastro/Cadastro_1.jsx](frontend/src/pages/Cadastro/Cadastro_1.jsx)
- [frontend/src/pages/VerificarEmail/VerificarEmail_1.jsx](frontend/src/pages/VerificarEmail/VerificarEmail_1.jsx)
- [frontend/src/utils/validarNome_1.js](frontend/src/utils/validarNome_1.js)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/screens/CadastroScreen_1_39.js](mobile/src/screens/CadastroScreen_1_39.js)
- [mobile/src/screens/VerificarEmailScreen_1_39.js](mobile/src/screens/VerificarEmailScreen_1_39.js)

## Item 2 — Integrar pagamentos pelo ARKHE

A API cria e consulta cobranças Pix na ARKHE e confirma o pagamento antes de liberar a assinatura.

Arquivos:

- [backend/config_2_3_15_37.py](backend/config_2_3_15_37.py)
- [backend/main.py](backend/main.py)
- [backend/pagamento_arkhe_2_32_33_34.py](backend/pagamento_arkhe_2_32_33_34.py)
- [backend/servicos/arkhe_2.py](backend/servicos/arkhe_2.py)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [mobile/src/screens/AssinaturaScreen_2_3_33_39.js](mobile/src/screens/AssinaturaScreen_2_3_33_39.js)
- [mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js](mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js)

## Item 3 — Sincronizar dados entre aplicativo e sistema web

Cada cliente recarrega os dados da API quando volta ao primeiro plano. Perfil, cursos, mensagens e financeiro passam a mostrar o estado salvo no servidor.

Arquivos:

- [backend/config_2_3_15_37.py](backend/config_2_3_15_37.py)
- [backend/funcao_1_3.py](backend/funcao_1_3.py)
- [backend/usuario_1_3_8_34.py](backend/usuario_1_3_8_34.py)
- [frontend/src/App_1_3_5_13_23_25.jsx](frontend/src/App_1_3_5_13_23_25.jsx)
- [frontend/src/components/Header/Header_3.jsx](frontend/src/components/Header/Header_3.jsx)
- [frontend/src/components/MenuLateral/MenuLateralAdm_3_23_25.jsx](frontend/src/components/MenuLateral/MenuLateralAdm_3_23_25.jsx)
- [frontend/src/components/MenuLateral/MenuLateralAluno_3.jsx](frontend/src/components/MenuLateral/MenuLateralAluno_3.jsx)
- [frontend/src/components/MenuLateral/MenuLateralProf_3_23.jsx](frontend/src/components/MenuLateral/MenuLateralProf_3_23.jsx)
- [frontend/src/components/PerfilUsuario/PerfilUsuario_3.jsx](frontend/src/components/PerfilUsuario/PerfilUsuario_3.jsx)
- [frontend/src/components/RotaRestrita/RotaRestrita_3_34.jsx](frontend/src/components/RotaRestrita/RotaRestrita_3_34.jsx)
- [frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx](frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [frontend/src/pages/Login/Login_3.jsx](frontend/src/pages/Login/Login_3.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/api/client_3_17.js](mobile/src/api/client_3_17.js)
- [mobile/src/screens/AssinaturaScreen_2_3_33_39.js](mobile/src/screens/AssinaturaScreen_2_3_33_39.js)
- [mobile/src/screens/ChatScreen_3_19_39.js](mobile/src/screens/ChatScreen_3_19_39.js)
- [mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js](mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js)
- [mobile/src/screens/LoginScreen_3_39.js](mobile/src/screens/LoginScreen_3_39.js)

## Item 4 — Salvar o progresso das aulas para que o aluno continue de onde parou

Durante a reprodução e ao pausar, o player envia a posição em segundos. O backend grava por aluno e vídeo em `PROGRESSO_REPRODUCAO`; ao abrir a aula, a API devolve o valor e o player inicia naquele segundo. A posição é separada da conclusão.

Arquivos:

- [backend/aluno_4_6_34.py](backend/aluno_4_6_34.py)
- [backend/cursos_aluno_4_6_7_9_27_28_29_34.py](backend/cursos_aluno_4_6_7_9_27_28_29_34.py)
- [frontend/src/components/PlayerVideo/PlayerVideo_4_10_26.jsx](frontend/src/components/PlayerVideo/PlayerVideo_4_10_26.jsx)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js](mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js)
- [mobile/src/screens/PlayerAulaScreen_4_10_26_39.js](mobile/src/screens/PlayerAulaScreen_4_10_26_39.js)

## Item 5 — Gerar certificado ao concluir o curso

Após todas as aulas concluídas e a prova aprovada, a API emite um PDF com código único. Outra rota permite verificar publicamente o código.

Arquivos:

- [backend/certificados_5_20.py](backend/certificados_5_20.py)
- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [backend/utilitarios_backend_5_9_12_15_20_24_28_34.py](backend/utilitarios_backend_5_9_12_15_20_24_28_34.py)
- [frontend/src/App_1_3_5_13_23_25.jsx](frontend/src/App_1_3_5_13_23_25.jsx)
- [frontend/src/components/ProvasProfessor/ProvasProfessor_5_20.jsx](frontend/src/components/ProvasProfessor/ProvasProfessor_5_20.jsx)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [frontend/src/pages/VerificarCertificado/VerificarCertificado_5.jsx](frontend/src/pages/VerificarCertificado/VerificarCertificado_5.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js](mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js)

## Item 6 — Permitir que o instrutor divida o curso em módulos

O professor cria módulos, define capa e organiza aulas neles. O aluno consegue abrir a prévia da estrutura antes da inscrição; o vídeo exige acesso autorizado.

Arquivos:

- [backend/aluno_4_6_34.py](backend/aluno_4_6_34.py)
- [backend/curso_conteudo_6_11_20_21_28.py](backend/curso_conteudo_6_11_20_21_28.py)
- [backend/cursos_aluno_4_6_7_9_27_28_29_34.py](backend/cursos_aluno_4_6_7_9_27_28_29_34.py)
- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [frontend/src/components/DashboardProfessor/FormularioModalProfessor_6_28.jsx](frontend/src/components/DashboardProfessor/FormularioModalProfessor_6_28.jsx)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js](mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js)
- [mobile/src/screens/ModulosProfessorScreen_6_18_39.js](mobile/src/screens/ModulosProfessorScreen_6_18_39.js)

## Item 7 — Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas

O fim da aula marca a conclusão; os avanços reais do player acumulam tempo assistido. O painel do professor calcula aulas, módulos e cursos concluídos a partir desses registros.

Arquivos:

- [backend/cursos_aluno_4_6_7_9_27_28_29_34.py](backend/cursos_aluno_4_6_7_9_27_28_29_34.py)
- [backend/professor_7.py](backend/professor_7.py)
- [backend/relatorio_7_9_22_23.py](backend/relatorio_7_9_22_23.py)
- [frontend/src/components/DashboardProfessor/CardMetricaProfessor_7.jsx](frontend/src/components/DashboardProfessor/CardMetricaProfessor_7.jsx)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/src/screens/InicioScreen_7_39.js](mobile/src/screens/InicioScreen_7_39.js)
- [mobile/src/screens/RelatoriosProfessorScreen_7_22_23_39.js](mobile/src/screens/RelatoriosProfessorScreen_7_22_23_39.js)

## Item 8 — Criar dashboard com gráficos para administrador e instrutor

Os painéis abrem com indicadores e ações agrupados por assunto; as seções de cursos, financeiro e relatórios têm uma hierarquia visual consistente.

Arquivos:

- [backend/usuario_1_3_8_34.py](backend/usuario_1_3_8_34.py)
- [frontend/src/components/GoogleChart/GoogleChart_8.jsx](frontend/src/components/GoogleChart/GoogleChart_8.jsx)
- [frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx](frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)

## Item 9 — Exibir acessos aos cursos, compras realizadas e taxa de conversão

A abertura de curso registra visita única no mês; a matrícula registra conversão. O professor vê os números por curso e no mês vigente.

Arquivos:

- [backend/cursos_aluno_4_6_7_9_27_28_29_34.py](backend/cursos_aluno_4_6_7_9_27_28_29_34.py)
- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [backend/relatorio_7_9_22_23.py](backend/relatorio_7_9_22_23.py)
- [backend/utilitarios_backend_5_9_12_15_20_24_28_34.py](backend/utilitarios_backend_5_9_12_15_20_24_28_34.py)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)

## Item 10 — Bloquear captura de tela durante o curso

O site oculta o player em eventos de captura detectáveis e dificulta download pelo menu; o app usa a proteção nativa da tela. São barreiras de interface, não garantia contra toda gravação.

Arquivos:

- [frontend/src/components/PlayerVideo/PlayerVideo_4_10_26.jsx](frontend/src/components/PlayerVideo/PlayerVideo_4_10_26.jsx)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [mobile/src/screens/PlayerAulaScreen_4_10_26_39.js](mobile/src/screens/PlayerAulaScreen_4_10_26_39.js)

## Item 11 — Enviar e-mail aos alunos que já compraram cursos do instrutor quando um novo curso for cadastrado

Ao publicar curso novo, o servidor seleciona alunos ativos de outros cursos do professor e envia avisos após confirmar a publicação. Falha no e-mail não desfaz o curso.

Arquivos:

- [backend/chat_cursos_11_19_20.py](backend/chat_cursos_11_19_20.py)
- [backend/curso_conteudo_6_11_20_21_28.py](backend/curso_conteudo_6_11_20_21_28.py)

## Item 12 — Exibir valores recebidos, disponíveis para saque e já sacados pelo instrutor

O painel resume receita recebida, saldo disponível e saques anteriores. O servidor calcula os valores, e site e app mostram o mesmo resultado.

Arquivos:

- [backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py](backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py)
- [backend/utilitarios_backend_5_9_12_15_20_24_28_34.py](backend/utilitarios_backend_5_9_12_15_20_24_28_34.py)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js](mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js)

## Item 13 — Criar gestão financeira do sistema

O administrador reúne mensalidades, despesas e saques em uma visão de transações, com estado e valores de cada movimento.

Arquivos:

- [backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py](backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py)
- [frontend/src/App_1_3_5_13_23_25.jsx](frontend/src/App_1_3_5_13_23_25.jsx)
- [frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx](frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx)

## Item 14 — Exibir total arrecadado e total repassado aos instrutores

O resumo administrativo calcula arrecadação e repasses pagos e estimados a partir das mensalidades e dos saques.

Arquivos:

- [backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py](backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py)
- [frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx](frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx)

## Item 15 — Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo

A configuração já define assinatura padrão de R$ 500. O caixa administrativo desconta o fundo reservado aos instrutores e os custos. O saldo do instrutor considera sua participação e os saques. Nenhuma regra financeira foi alterada nesta organização.

Arquivos:

- [backend/config_2_3_15_37.py](backend/config_2_3_15_37.py)
- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py](backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py)
- [backend/utilitarios_backend_5_9_12_15_20_24_28_34.py](backend/utilitarios_backend_5_9_12_15_20_24_28_34.py)
- [frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx](frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js](mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js)

## Item 16 — Exibir indicadores da saúde financeira da empresa

A margem histórica considera receita recebida, comissão dos instrutores e despesas registradas. É apresentada no painel administrativo.

Arquivos:

- [backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py](backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py)
- [frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx](frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx)

## Item 17 — Integrar o aplicativo com a API

O aplicativo centraliza requisições autenticadas e reaproveita o endereço da API que responde. As telas recebem os mesmos dados usados pelo site.

Arquivos:

- [mobile/src/api/client_3_17.js](mobile/src/api/client_3_17.js)

## Item 18 — Integrar recursos nativos: biometria, câmera, vibração e notificações

O app usa biometria ao restaurar sessão, câmera para capas, vibração e notificações locais após autenticação.

Arquivos:

- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/screens/EditarCursoScreen_18_28_39.js](mobile/src/screens/EditarCursoScreen_18_28_39.js)
- [mobile/src/screens/ModulosProfessorScreen_6_18_39.js](mobile/src/screens/ModulosProfessorScreen_6_18_39.js)

## Item 19 — Implementar chat entre instrutor e aluno no aplicativo e no sistema web

Aluno e professor conversam por curso. O aluno pode enviar a primeira mensagem; o professor também pode escolher um aluno na lista de matriculados e abrir um chat vazio para escrever. A conversa só entra na caixa de entrada após a primeira mensagem. A API valida matrícula e vínculo do professor, salva mensagens e devolve nome e avatar; o app atualiza a conversa.

Arquivos:

- [backend/chat_cursos_11_19_20.py](backend/chat_cursos_11_19_20.py)
- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [frontend/src/components/ChatCurso/ChatCurso_19.jsx](frontend/src/components/ChatCurso/ChatCurso_19.jsx)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/components/BottomNav_19_23_25_28_39.js](mobile/src/components/BottomNav_19_23_25_28_39.js)
- [mobile/src/screens/ChatScreen_3_19_39.js](mobile/src/screens/ChatScreen_3_19_39.js)

## Item 20 — Permitir que o instrutor cadastre provas para validar a conclusão do curso

O professor cria questões, alternativas e gabarito; publica, edita ou exclui a prova. A API valida antes de salvar e apaga tentativas ao trocar questões. Após concluir as aulas, o aluno responde; objetivas são pontuadas na hora e dissertativas aguardam correção individual. A nota mínima é 70; uma reprovação permite nova tentativa após um dia.

Arquivos:

- [backend/certificados_5_20.py](backend/certificados_5_20.py)
- [backend/chat_cursos_11_19_20.py](backend/chat_cursos_11_19_20.py)
- [backend/curso_conteudo_6_11_20_21_28.py](backend/curso_conteudo_6_11_20_21_28.py)
- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [backend/provas_cursos_20.py](backend/provas_cursos_20.py)
- [backend/utilitarios_backend_5_9_12_15_20_24_28_34.py](backend/utilitarios_backend_5_9_12_15_20_24_28_34.py)
- [frontend/src/components/ProvasProfessor/ProvasProfessor_5_20.jsx](frontend/src/components/ProvasProfessor/ProvasProfessor_5_20.jsx)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js](mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js)
- [mobile/src/screens/ProvaAlunoScreen_20_39.js](mobile/src/screens/ProvaAlunoScreen_20_39.js)
- [mobile/src/screens/ProvasProfessorScreen_20_39.js](mobile/src/screens/ProvasProfessorScreen_20_39.js)

## Item 21 — Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos

O professor cadastra link ou arquivo e pode removê-lo. A prévia mostra os dados; a API exige matrícula e assinatura ativa para revelar links ou baixar arquivo privado.

Arquivos:

- [backend/curso_conteudo_6_11_20_21_28.py](backend/curso_conteudo_6_11_20_21_28.py)
- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [frontend/src/components/MateriaisProfessor/MateriaisProfessor_21.jsx](frontend/src/components/MateriaisProfessor/MateriaisProfessor_21.jsx)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js](mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js)
- [mobile/src/screens/MateriaisProfessorScreen_21_39.js](mobile/src/screens/MateriaisProfessorScreen_21_39.js)

## Item 22 — Criar relatórios com filtros por período, instrutor e curso

Administrador filtra por período, instrutor e curso; professor só consulta os próprios cursos. O servidor aplica a restrição antes de agregar os dados.

Arquivos:

- [backend/relatorio_7_9_22_23.py](backend/relatorio_7_9_22_23.py)
- [frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx](frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/src/screens/RelatoriosProfessorScreen_7_22_23_39.js](mobile/src/screens/RelatoriosProfessorScreen_7_22_23_39.js)

## Item 23 — Exibir relatórios de alunos, cursos, módulos e horas assistidas

O tempo assistido é salvo também por competência mensal. Os relatórios agrupam alunos, cursos, módulos e horas por mês para preservar o histórico.

Arquivos:

- [backend/relatorio_7_9_22_23.py](backend/relatorio_7_9_22_23.py)
- [frontend/src/App_1_3_5_13_23_25.jsx](frontend/src/App_1_3_5_13_23_25.jsx)
- [frontend/src/components/MenuLateral/MenuLateralAdm_3_23_25.jsx](frontend/src/components/MenuLateral/MenuLateralAdm_3_23_25.jsx)
- [frontend/src/components/MenuLateral/MenuLateralProf_3_23.jsx](frontend/src/components/MenuLateral/MenuLateralProf_3_23.jsx)
- [frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx](frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/components/BottomNav_19_23_25_28_39.js](mobile/src/components/BottomNav_19_23_25_28_39.js)
- [mobile/src/screens/RelatoriosProfessorScreen_7_22_23_39.js](mobile/src/screens/RelatoriosProfessorScreen_7_22_23_39.js)

## Item 24 — Registrar as ações realizadas pelos usuários no sistema

Triggers do Firebird comparam OLD e NEW e gravam no banco separado o autor, a ação, o registro e os valores permitidos antes/depois. Os eventos antigos de `LOG_ACOES` também são consultados nesse banco; o principal não contém tabelas de log. O Admin vê cada campo em três colunas: campo alterado, valor anterior e novo valor. Dados sensíveis ou não guardados aparecem como “Valor não registrado”; registros antigos não podem ser reconstruídos.

Arquivos:

- [backend/auditoria_24_37.py](backend/auditoria_24_37.py)
- [backend/utilitarios_backend_5_9_12_15_20_24_28_34.py](backend/utilitarios_backend_5_9_12_15_20_24_28_34.py)

## Item 25 — Permitir acesso e relatórios dos logs somente para o administrador por data e usuário

O administrador pesquisa por usuário e intervalo de datas; a lista é paginada para percorrer o histórico.

Arquivos:

- [backend/gravacao_log_25.py](backend/gravacao_log_25.py)
- [frontend/src/App_1_3_5_13_23_25.jsx](frontend/src/App_1_3_5_13_23_25.jsx)
- [frontend/src/components/MenuLateral/MenuLateralAdm_3_23_25.jsx](frontend/src/components/MenuLateral/MenuLateralAdm_3_23_25.jsx)
- [frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx](frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/components/BottomNav_19_23_25_28_39.js](mobile/src/components/BottomNav_19_23_25_28_39.js)
- [mobile/src/screens/LogsAdminScreen_25_39.js](mobile/src/screens/LogsAdminScreen_25_39.js)

## Item 26 — Bloquear gravação de tela durante o curso

Ao abrir o player, o app ativa a proteção nativa contra captura; ao sair, encerra essa proteção. No navegador, só é possível reagir a eventos detectáveis.

Arquivos:

- [frontend/src/components/PlayerVideo/PlayerVideo_4_10_26.jsx](frontend/src/components/PlayerVideo/PlayerVideo_4_10_26.jsx)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [mobile/src/screens/PlayerAulaScreen_4_10_26_39.js](mobile/src/screens/PlayerAulaScreen_4_10_26_39.js)

## Item 27 — Permitir que o aluno avalie o curso após a conclusão

O aluno informa estrelas e comentário depois de concluir as aulas e ser aprovado na prova. A API revalida as condições e publica a avaliação no detalhe do curso.

Arquivos:

- [backend/avaliacoes_cursos_27.py](backend/avaliacoes_cursos_27.py)
- [backend/cursos_aluno_4_6_7_9_27_28_29_34.py](backend/cursos_aluno_4_6_7_9_27_28_29_34.py)
- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js](mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js)

## Item 28 — Permitir filtro de cursos por tema, categoria e avaliação

O professor escolhe categoria e tema existentes ou cadastra novos; o servidor evita nomes duplicados. O aluno filtra a descoberta por esses campos e por nota mínima.

Arquivos:

- [backend/curso_conteudo_6_11_20_21_28.py](backend/curso_conteudo_6_11_20_21_28.py)
- [backend/cursos_aluno_4_6_7_9_27_28_29_34.py](backend/cursos_aluno_4_6_7_9_27_28_29_34.py)
- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [backend/utilitarios_backend_5_9_12_15_20_24_28_34.py](backend/utilitarios_backend_5_9_12_15_20_24_28_34.py)
- [frontend/src/components/DashboardProfessor/FormularioModalProfessor_6_28.jsx](frontend/src/components/DashboardProfessor/FormularioModalProfessor_6_28.jsx)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/components/BottomNav_19_23_25_28_39.js](mobile/src/components/BottomNav_19_23_25_28_39.js)
- [mobile/src/screens/DescobrirCursosScreen_28_29_39.js](mobile/src/screens/DescobrirCursosScreen_28_29_39.js)
- [mobile/src/screens/EditarCursoScreen_18_28_39.js](mobile/src/screens/EditarCursoScreen_18_28_39.js)

## Item 29 — Criar recomendação inteligente de cursos com base nas buscas e compras recentes do aluno

A API relaciona categorias e temas dos cursos do aluno, dá prioridade aos assuntos mais frequentes e sugere cursos públicos ainda não inscritos.

Arquivos:

- [backend/cursos_aluno_4_6_7_9_27_28_29_34.py](backend/cursos_aluno_4_6_7_9_27_28_29_34.py)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [mobile/src/screens/DescobrirCursosScreen_28_29_39.js](mobile/src/screens/DescobrirCursosScreen_28_29_39.js)

## Item 30 — Criar gestão financeira do instrutor

O fundo de receita é distribuído segundo aulas concluídas; antes da primeira conclusão há uma estimativa baseada nas matrículas ativas.

Arquivos:

- [backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py](backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js](mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js)

## Item 31 — Exibir cursos que mais geraram receita para o instrutor

O resumo do instrutor soma a receita estimada de cada curso e ordena do maior para o menor valor.

Arquivos:

- [backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py](backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js](mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js)

## Item 32 — Permitir solicitação de saque para a conta ARKHE

O professor envia chave Pix e valor; o servidor recalcula o saldo e registra pedido pendente. O administrador paga fora do sistema e registra a referência do pagamento ou o motivo da recusa.

Arquivos:

- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py](backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py)
- [backend/pagamento_arkhe_2_32_33_34.py](backend/pagamento_arkhe_2_32_33_34.py)
- [frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx](frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx](frontend/src/pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx)
- [mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js](mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js)

## Item 33 — Exibir total gasto e histórico de faturas do aluno

Mensalidade paga continua na receita e no total gasto mesmo depois do vencimento da assinatura. O histórico separa pagamento de validade do acesso.

Arquivos:

- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py](backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py)
- [backend/pagamento_arkhe_2_32_33_34.py](backend/pagamento_arkhe_2_32_33_34.py)
- [frontend/src/pages/DashboardAdm/GerenciamentoUsuarios_33_35.jsx](frontend/src/pages/DashboardAdm/GerenciamentoUsuarios_33_35.jsx)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/components/HistoricoFaturasAluno_33_39.js](mobile/src/components/HistoricoFaturasAluno_33_39.js)
- [mobile/src/screens/AssinaturaScreen_2_3_33_39.js](mobile/src/screens/AssinaturaScreen_2_3_33_39.js)
- [mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js](mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js)

## Item 34 — Exibir faturas em aberto

Ao vencer a assinatura, a API registra a próxima mensalidade em aberto. O aluno pode consultar, renovar Pix e pagar a fatura escolhida pelo painel ou app.

Arquivos:

- [backend/aluno_4_6_34.py](backend/aluno_4_6_34.py)
- [backend/cursos_aluno_4_6_7_9_27_28_29_34.py](backend/cursos_aluno_4_6_7_9_27_28_29_34.py)
- [backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py](backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py)
- [backend/pagamento_arkhe_2_32_33_34.py](backend/pagamento_arkhe_2_32_33_34.py)
- [backend/usuario_1_3_8_34.py](backend/usuario_1_3_8_34.py)
- [backend/utilitarios_backend_5_9_12_15_20_24_28_34.py](backend/utilitarios_backend_5_9_12_15_20_24_28_34.py)
- [frontend/src/components/RotaRestrita/RotaRestrita_3_34.jsx](frontend/src/components/RotaRestrita/RotaRestrita_3_34.jsx)
- [frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx](frontend/src/pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx)
- [frontend/src/pages/DashboardAluno/ResumoAssinatura_34.jsx](frontend/src/pages/DashboardAluno/ResumoAssinatura_34.jsx)
- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js](mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js)

## Item 35 — Calcular ticket médio por aluno

O administrador vê gasto total, mensalidades pagas, média mensal, cursos ativos e aulas concluídas por aluno. O perfil também informa CPF, situação da conta, confirmação do e-mail e data de cadastro quando registrada. Mensalidades mostram separadamente pagamento e validade do acesso. A contagem usa alunos pagantes, não número de faturas.

Arquivos:

- [backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py](backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py)
- [frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx](frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx)
- [frontend/src/pages/DashboardAdm/GerenciamentoUsuarios_33_35.jsx](frontend/src/pages/DashboardAdm/GerenciamentoUsuarios_33_35.jsx)

## Item 36 — Permitir cadastro e acompanhamento dos custos da plataforma

O administrador cadastra categorias, gastos únicos ou recorrentes e consulta as transações por período, tipo, categoria e estado. Despesa futura aparece programada e entra no caixa no mês devido.

Arquivos:

- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py](backend/financeiro_12_13_14_15_16_30_31_32_33_34_35_36.py)
- [frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx](frontend/src/pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx)

## Item 37 — Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado

As rotinas de auditoria instalam triggers e gravam operações e alterações em um banco Firebird separado.

Arquivos:

- [backend/auditoria_24_37.py](backend/auditoria_24_37.py)
- [backend/banco_37.py](backend/banco_37.py)
- [backend/config_2_3_15_37.py](backend/config_2_3_15_37.py)
- [backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py](backend/estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37.py)
- [backend/log_banco_37.py](backend/log_banco_37.py)

## Item 38 — Tornar todas as telas do sistema web responsivas

Os estilos do site incluem regras de layout e media queries. Os arquivos CSS estão identificados com o item 38; esta revisão não certifica visualmente cada resolução.

Arquivos:

- [frontend/src/App_38.css](frontend/src/App_38.css)
- [frontend/src/components/Alerts/Alerts_38.module.css](frontend/src/components/Alerts/Alerts_38.module.css)
- [frontend/src/components/Button/Button_38.module.css](frontend/src/components/Button/Button_38.module.css)
- [frontend/src/components/CadastroColaborador/CadastroColaborador_38.module.css](frontend/src/components/CadastroColaborador/CadastroColaborador_38.module.css)
- [frontend/src/components/ChatCurso/ChatCurso_38.module.css](frontend/src/components/ChatCurso/ChatCurso_38.module.css)
- [frontend/src/components/ConfirmAlert/ConfirmAlert_38.module.css](frontend/src/components/ConfirmAlert/ConfirmAlert_38.module.css)
- [frontend/src/components/CursoCard/CursoCard_38.module.css](frontend/src/components/CursoCard/CursoCard_38.module.css)
- [frontend/src/components/GoogleChart/GoogleChart_38.module.css](frontend/src/components/GoogleChart/GoogleChart_38.module.css)
- [frontend/src/components/Header/Header_38.module.css](frontend/src/components/Header/Header_38.module.css)
- [frontend/src/components/MateriaisProfessor/MateriaisProfessor_38.module.css](frontend/src/components/MateriaisProfessor/MateriaisProfessor_38.module.css)
- [frontend/src/components/MenuLateral/MenuLateralAdm_38.module.css](frontend/src/components/MenuLateral/MenuLateralAdm_38.module.css)
- [frontend/src/components/MenuLateral/MenuLateralAluno_38.module.css](frontend/src/components/MenuLateral/MenuLateralAluno_38.module.css)
- [frontend/src/components/MenuLateral/MenuLateralProf_38.module.css](frontend/src/components/MenuLateral/MenuLateralProf_38.module.css)
- [frontend/src/components/PerfilUsuario/PerfilUsuario_38.module.css](frontend/src/components/PerfilUsuario/PerfilUsuario_38.module.css)
- [frontend/src/components/PlayerVideo/PlayerVideo_38.module.css](frontend/src/components/PlayerVideo/PlayerVideo_38.module.css)
- [frontend/src/components/ProvasProfessor/ProvasProfessor_38.module.css](frontend/src/components/ProvasProfessor/ProvasProfessor_38.module.css)
- [frontend/src/components/Rodape/Rodape_38.module.css](frontend/src/components/Rodape/Rodape_38.module.css)
- [frontend/src/index_38.css](frontend/src/index_38.css)
- [frontend/src/pages/Cadastro/Cadastro_38.module.css](frontend/src/pages/Cadastro/Cadastro_38.module.css)
- [frontend/src/pages/DashboardAdm/DashboardAdm_38.module.css](frontend/src/pages/DashboardAdm/DashboardAdm_38.module.css)
- [frontend/src/pages/DashboardAdm/GerenciamentoUsuarios_38.module.css](frontend/src/pages/DashboardAdm/GerenciamentoUsuarios_38.module.css)
- [frontend/src/pages/DashboardAluno/DashboardAluno_38.module.css](frontend/src/pages/DashboardAluno/DashboardAluno_38.module.css)
- [frontend/src/pages/DashboardAluno/ResumoAssinatura_38.module.css](frontend/src/pages/DashboardAluno/ResumoAssinatura_38.module.css)
- [frontend/src/pages/DashboardProfessor/DashboardProfessor_38.module.css](frontend/src/pages/DashboardProfessor/DashboardProfessor_38.module.css)
- [frontend/src/pages/Home/Home_38.module.css](frontend/src/pages/Home/Home_38.module.css)
- [frontend/src/pages/Login/Login_38.module.css](frontend/src/pages/Login/Login_38.module.css)
- [frontend/src/pages/Pagina404/Pagina404_38.module.css](frontend/src/pages/Pagina404/Pagina404_38.module.css)
- [frontend/src/pages/VerificarCertificado/VerificarCertificado_38.module.css](frontend/src/pages/VerificarCertificado/VerificarCertificado_38.module.css)
- [frontend/src/pages/VerificarEmail/VerificarEmail_38.module.css](frontend/src/pages/VerificarEmail/VerificarEmail_38.module.css)

## Item 39 — Desenvolver todas as telas do aplicativo

As telas e componentes React Native implementam navegação, cadastro, cursos, aulas, provas, materiais, chat, financeiro e relatórios.

Arquivos:

- [mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js](mobile/App_1_3_4_5_6_18_19_20_21_23_25_27_28_30_33_34_39.js)
- [mobile/src/components/AppIcon_39.js](mobile/src/components/AppIcon_39.js)
- [mobile/src/components/BottomNav_19_23_25_28_39.js](mobile/src/components/BottomNav_19_23_25_28_39.js)
- [mobile/src/components/BrandLogo_39.js](mobile/src/components/BrandLogo_39.js)
- [mobile/src/components/FeedbackProvider_39.js](mobile/src/components/FeedbackProvider_39.js)
- [mobile/src/components/Field_39.js](mobile/src/components/Field_39.js)
- [mobile/src/components/HistoricoFaturasAluno_33_39.js](mobile/src/components/HistoricoFaturasAluno_33_39.js)
- [mobile/src/screens/AlunosCursoScreen_39.js](mobile/src/screens/AlunosCursoScreen_39.js)
- [mobile/src/screens/AssinaturaScreen_2_3_33_39.js](mobile/src/screens/AssinaturaScreen_2_3_33_39.js)
- [mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js](mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39.js)
- [mobile/src/screens/CadastroScreen_1_39.js](mobile/src/screens/CadastroScreen_1_39.js)
- [mobile/src/screens/ChatScreen_3_19_39.js](mobile/src/screens/ChatScreen_3_19_39.js)
- [mobile/src/screens/CursosScreen_39.js](mobile/src/screens/CursosScreen_39.js)
- [mobile/src/screens/DescobrirCursosScreen_28_29_39.js](mobile/src/screens/DescobrirCursosScreen_28_29_39.js)
- [mobile/src/screens/EditarCursoScreen_18_28_39.js](mobile/src/screens/EditarCursoScreen_18_28_39.js)
- [mobile/src/screens/EditarPerfilScreen_39.js](mobile/src/screens/EditarPerfilScreen_39.js)
- [mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js](mobile/src/screens/FinanceiroScreen_2_3_12_15_30_31_32_33_34_39.js)
- [mobile/src/screens/InicioScreen_7_39.js](mobile/src/screens/InicioScreen_7_39.js)
- [mobile/src/screens/LoginScreen_3_39.js](mobile/src/screens/LoginScreen_3_39.js)
- [mobile/src/screens/LogsAdminScreen_25_39.js](mobile/src/screens/LogsAdminScreen_25_39.js)
- [mobile/src/screens/MateriaisProfessorScreen_21_39.js](mobile/src/screens/MateriaisProfessorScreen_21_39.js)
- [mobile/src/screens/ModulosProfessorScreen_6_18_39.js](mobile/src/screens/ModulosProfessorScreen_6_18_39.js)
- [mobile/src/screens/PerfilScreen_39.js](mobile/src/screens/PerfilScreen_39.js)
- [mobile/src/screens/PlayerAulaScreen_4_10_26_39.js](mobile/src/screens/PlayerAulaScreen_4_10_26_39.js)
- [mobile/src/screens/ProvaAlunoScreen_20_39.js](mobile/src/screens/ProvaAlunoScreen_20_39.js)
- [mobile/src/screens/ProvasProfessorScreen_20_39.js](mobile/src/screens/ProvasProfessorScreen_20_39.js)
- [mobile/src/screens/RelatoriosProfessorScreen_7_22_23_39.js](mobile/src/screens/RelatoriosProfessorScreen_7_22_23_39.js)
- [mobile/src/screens/VerificarEmailScreen_1_39.js](mobile/src/screens/VerificarEmailScreen_1_39.js)
- [mobile/src/styles_39.js](mobile/src/styles_39.js)

## Item 40 — Explicar o funcionamento de cada item desenvolvido

Este guia explica os itens e aponta todos os arquivos identificados. Os comentários de início e fim delimitam funções, callbacks e blocos relacionados.

Arquivos:

- [SPRINT_APRESENTACAO_40.md](SPRINT_APRESENTACAO_40.md)

<!-- Fim item 40 -->
