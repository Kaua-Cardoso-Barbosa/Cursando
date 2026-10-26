# Guia para apresentar os itens da sprint

Este guia complementa os comentários próximos ao código. No backend, uma rota
`@app.route` recebe a requisição, verifica a identidade do usuário, executa
consultas com `cursor.execute` e devolve JSON. `commit` confirma as alterações;
`rollback` desfaz a transação quando há erro. O site e o aplicativo consomem a
mesma API, por isso as regras de acesso e as validações ficam no servidor.

| Item | O que demonstrar e como funciona |
| --- | --- |
| 1 — Arkhé e Pix | Criar ou recuperar uma cobrança, consultar o pagamento na Arkhé e só então atualizar a assinatura. Para saque, o servidor confere saldo e envia a solicitação; o cliente evita repetir pedidos em caso de espera. Código: `backend/pagamento_arkhe.py` e `backend/servicos/arkhe.py`. |
| 2 — financeiro do aluno | A API devolve total gasto, total em aberto e quantidade de faturas; a rota de mensalidades fornece o histórico de pagamentos. O painel combina esses dados para o aluno entender quanto pagou e o que ainda precisa quitar. Código: `backend/financeiro.py` e `backend/pagamento_arkhe.py`. |
| 3 — sincronização entre site e app | Cada cliente recarrega os dados da API quando volta ao primeiro plano. Perfil, cursos, mensagens e financeiro passam a mostrar o estado salvo no servidor. Código: `frontend/src/App.jsx` e telas mobile. |
| 4 — retomada da videoaula | Durante a reprodução e ao pausar, o player envia a posição em segundos. O backend grava por aluno e vídeo em `PROGRESSO_REPRODUCAO`; ao abrir a aula, a API devolve o valor e o player inicia naquele segundo. A posição é separada da conclusão. Código: `backend/cursos_aluno.py`, `backend/aluno.py` e os dois players. |
| 5 — certificado | Após todas as aulas concluídas e a prova aprovada, a API emite um PDF com código único. Outra rota permite verificar publicamente o código. Código: `backend/certificados.py`. |
| 6 — módulos | O professor cria módulos, define capa e organiza aulas neles. O aluno consegue abrir a prévia da estrutura antes da inscrição; o vídeo exige acesso autorizado. Código: `backend/curso_conteudo.py` e telas de módulos. |
| 7 — progresso e métricas | O fim da aula marca a conclusão; os avanços reais do player acumulam tempo assistido. O painel do professor calcula aulas, módulos e cursos concluídos a partir desses registros. Código: `backend/cursos_aluno.py` e `backend/relatorio.py`. |
| 8 — organização dos painéis | Os painéis abrem com indicadores e ações agrupados por assunto; as seções de cursos, financeiro e relatórios têm uma hierarquia visual consistente. Código: dashboards do site. |
| 9 — acesso e conversão | A abertura de curso registra visita única no mês; a matrícula registra conversão. O professor vê os números por curso e no mês vigente. Código: `backend/relatorio.py` e dashboards. |
| 10 — proteção de vídeo | O site oculta o player em eventos de captura detectáveis e dificulta download pelo menu; o app usa a proteção nativa da tela. São barreiras de interface, não garantia contra toda gravação. Código: players do site e app. |
| 11 — avisos por e-mail | Ao publicar curso novo, o servidor seleciona alunos ativos de outros cursos do professor e envia avisos após confirmar a publicação. Falha no e-mail não desfaz o curso. Código: `backend/curso_conteudo.py` e `backend/chat_cursos.py`. |
| 12 — financeiro do instrutor | O painel resume receita recebida, saldo disponível e saques anteriores. O servidor calcula os valores, e site e app mostram o mesmo resultado. Código: `backend/financeiro.py`. |
| 13 — financeiro administrativo | O administrador reúne mensalidades, despesas e saques em uma visão de transações, com estado e valores de cada movimento. Código: `backend/financeiro.py` e Dashboard Adm. |
| 14 — configuração do fundo | O administrador define a porcentagem da receita paga que compõe o fundo dos instrutores. Esse percentual entra no cálculo do resumo financeiro. Código: `backend/financeiro.py`. |
| 15 — saldos e saque | O servidor reserva comissão e despesas antes de apresentar o caixa administrativo e calcula o saldo do instrutor disponível para solicitação. A solicitação é conferida novamente pela API. Código: `backend/financeiro.py` e `backend/pagamento_arkhe.py`. |
| 16 — margem da empresa | A margem histórica considera receita recebida, comissão dos instrutores e despesas registradas. É apresentada no painel administrativo. Código: `backend/financeiro.py`. |
| 17 — API no celular | O aplicativo centraliza requisições autenticadas e reaproveita o endereço da API que responde. As telas recebem os mesmos dados usados pelo site. Código: `mobile/src/api/client.js`. |
| 18 — recursos nativos | O professor pode capturar foto com a câmera para a capa do curso ou módulo no app, após a permissão do sistema. Código: telas de edição e módulos mobile. |
| 19 — chat | Aluno e professor conversam por curso. A API valida matrícula e vínculo do professor, salva mensagens e devolve nome e avatar; o app atualiza a conversa. Código: `backend/chat_cursos.py`. |
| 20 — prova final | O professor cria questões, alternativas e gabarito; publica, edita ou exclui a prova. A API valida antes de salvar e apaga tentativas ao trocar questões. Após concluir as aulas, o aluno responde; objetivas são pontuadas na hora e dissertativas aguardam correção individual. A nota mínima é 70; uma reprovação permite nova tentativa após um dia. Código: `backend/provas_cursos.py` e telas de provas. |
| 21 — complementos | O professor cadastra link ou arquivo e pode removê-lo. A prévia mostra os dados; a API exige matrícula e assinatura ativa para revelar links ou baixar arquivo privado. Código: `backend/curso_conteudo.py` e componentes de materiais. |
| 22 — relatórios com filtros | Administrador filtra por período, instrutor e curso; professor só consulta os próprios cursos. O servidor aplica a restrição antes de agregar os dados. Código: `backend/relatorio.py`. |
| 23 — relatórios mensais | O tempo assistido é salvo também por competência mensal. Os relatórios agrupam alunos, cursos, módulos e horas por mês para preservar o histórico. Código: `backend/cursos_aluno.py` e `backend/relatorio.py`. |
| 24 — auditoria | Ações relevantes são registradas com usuário, perfil e contexto, inclusive aula. O administrador pode abrir um registro para entender os campos alterados. Código: `backend/auditoria.py` e logs. |
| 25 — filtros dos logs | O administrador pesquisa por usuário e intervalo de datas; a lista é paginada para percorrer o histórico. Código: `backend/gravacao_log.py` e telas de logs. |
| 26 — bloqueio de captura | Ao abrir o player, o app ativa a proteção nativa contra captura; ao sair, encerra essa proteção. No navegador, só é possível reagir a eventos detectáveis. Código: `mobile/src/screens/PlayerAulaScreen.js` e Dashboard Aluno. |
| 27 — avaliação do curso | O aluno informa estrelas e comentário depois de concluir as aulas e ser aprovado na prova. A API revalida as condições e publica a avaliação no detalhe do curso. Código: `backend/avaliacoes_cursos.py`. |
| 28 — categorias e temas | O professor escolhe categoria e tema existentes ou cadastra novos; o servidor evita nomes duplicados. O aluno filtra a descoberta por esses campos e por nota mínima. Código: `backend/curso_conteudo.py` e catálogos. |
| 29 — recomendações | A API relaciona categorias e temas dos cursos do aluno, dá prioridade aos assuntos mais frequentes e sugere cursos públicos ainda não inscritos. Código: `backend/cursos_aluno.py`. |
| 30 — valor por aula | O fundo de receita é distribuído segundo aulas concluídas; antes da primeira conclusão há uma estimativa baseada nas matrículas ativas. Código: `backend/financeiro.py`. |
| 31 — receita por curso | O resumo do instrutor soma a receita estimada de cada curso e ordena do maior para o menor valor. Código: `backend/financeiro.py`. |
| 32 — solicitação de saque | O professor envia a chave Pix e o valor; o servidor valida saldo, registra a referência da Arkhé e acompanha análise e resposta. Código: `backend/pagamento_arkhe.py`. |
| 33 — histórico pago | Mensalidade paga continua na receita e no total gasto mesmo depois do vencimento da assinatura. O histórico separa pagamento de validade do acesso. Código: `backend/financeiro.py`. |
| 34 — faturas em aberto | Ao vencer a assinatura, a API registra a próxima mensalidade em aberto. O aluno pode consultar, renovar Pix e pagar a fatura escolhida pelo painel ou app. Código: `backend/pagamento_arkhe.py` e Dashboard Aluno. |
| 35 — ticket do aluno | O administrador vê gasto total, mensalidades pagas, média mensal, cursos ativos e aulas concluídas por aluno. A contagem usa alunos pagantes, não número de faturas. Código: `backend/financeiro.py`. |
| 36 — custos e livro financeiro | O administrador cadastra categorias, gastos únicos ou recorrentes e consulta as transações por período, tipo, categoria e estado. Despesa futura aparece programada e entra no caixa no mês devido. Código: `backend/financeiro.py`. |

Para apresentar um fluxo, mostre primeiro a tela, depois a rota da API e por
fim a tabela alterada. Nos itens 4 e 20, explique a diferença entre dados
temporários (posição ou rascunho) e estados finais (aula concluída ou prova
corrigida), pois são esses estados que liberam etapas seguintes.
