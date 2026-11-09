# Sessão e chat sem WebSocket

## Sessão

O web compartilha os dados da sessão pelo `SessaoProvider`. A consulta inicial e
as atualizações ao voltar à aba usam a mesma requisição em andamento e um cache
em memória de 30 segundos. Login e confirmação de e-mail forçam uma consulta;
logout invalida respostas pendentes. A expiração recebida do servidor também
encerra o estado da sessão na interface.

`/verificar_token` valida o JWT, consulta o perfil, retorna `expira_em` e sempre
fecha cursor e conexão. Retorna 401 para sessão inválida e 503 para falha do banco.
As rotas protegidas continuam validando o JWT e suas próprias regras de acesso.
Nenhum token de atualização foi introduzido e os prazos do JWT são os existentes.

No aplicativo, leituras iguais compartilham a requisição em andamento e `/perfil`
tem cache de 30 segundos em memória. Gravações invalidam o cache. Um 401 de uma
requisição autenticada encerra a sessão. Retornos rápidos ao aplicativo não
recarregam todos os painéis antes de 30 segundos da última sincronização completa.

## Chat

Os dois clientes usam o mesmo algoritmo, mantido nos dois arquivos `useChat.js`:

- Primeiro lote: últimas 50 mensagens, em ordem cronológica.
- Histórico: botão para buscar o lote anterior, sem paginação por deslocamento.
- Novidades: consulta `depois_id` com o último ID recebido pela busca, sem saltar
  lotes após uma reconexão. A mensagem retornada por POST não avança esse cursor.
- Fila por conversa: evita sobreposição e descarta respostas de conversas antigas.
- Intervalo de mensagens: começa em 3 segundos e chega a 15 segundos sem atividade;
  falhas aumentam a espera até 30 segundos. A lista de conversas é buscada no
  máximo uma vez a cada 15 segundos durante a atualização automática.
- Consultas pausam quando a aba ou aplicativo ficam em segundo plano.
- Falhas temporárias preservam o histórico já exibido.
- Leitura confirmada separadamente quando o usuário está no final da conversa.
- Envios retornam a mensagem criada. A chave de envio permite repetir uma
  tentativa incerta sem duplicar a mensagem.

### Contrato HTTP

`GET /chat/cursos/<id>/mensagens?id_aluno=<aluno>&paginado=1&limite=50`
retorna `{mensagens, tem_mais, primeiro_id, ultimo_id}`. Os cursores opcionais são
`antes_id` e `depois_id`, mutuamente exclusivos. `depois_id=0` é válido para buscar
novidades depois de abrir uma conversa vazia. O limite máximo é 100.

`POST` na mesma rota recebe `{texto, chave_envio}` e retorna `{mensagem}` com 201,
ou 200 quando a mesma tentativa já foi registrada. O professor deve informar o
aluno na query ou corpo. Texto limitado a 10.000 caracteres.

`PATCH` recebe `{ate_id}` e confirma somente mensagens não lidas destinadas ao
usuário autenticado até o cursor informado. `GET` não modifica mensagens.

O servidor cria índices para conversa e mensagens não lidas, uma sequência de IDs
e um índice exclusivo por remetente/chave de envio. Mensagens anteriores são
preservadas. Um bloqueio de escrita por curso ordena os commits, permitindo que
o cursor por ID não perca mensagens em envios concorrentes. O bloqueio dura até
o commit do envio; cursos diferentes podem receber mensagens em paralelo.

## Outras melhorias e próximos candidatos

Os painéis web e a verificação de certificados usam carregamento sob demanda.
O chat do professor também deixa de buscar gráficos e indicadores da visão
inicial, incluindo ao voltar para a aba.
No build local, o JavaScript inicial passou de aproximadamente 1,59 MB para
358 KB antes da compressão. O player ainda concentra um arquivo grande no painel
do aluno e pode ser separado posteriormente para carregar somente ao abrir aula.

O aplicativo descobre a API usando `/health` antes da primeira gravação e evita
repetir gravações automaticamente em vários endereços. Consultas de leitura
continuam podendo procurar outro endereço em caso de falha de conexão.

O `main.py` também verifica a ocupação da porta antes de servir. No Windows,
duas instâncias do servidor de desenvolvimento podiam compartilhar a porta
5000 e devolver respostas de versões diferentes.

Para volumes maiores, os próximos candidatos são uma tabela de resumo de
conversas (evitando recalcular agregações do histórico), virtualização das
mensagens no aplicativo e carregamento dos dados de cada painel por demanda.
Essas mudanças exigem medição com volume representativo; não há teste de carga
nem garantia de capacidade por quantidade de usuários nesta alteração.

## Validação

`backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -v`
verifica os contratos de sessão, autorização, cursores e deduplicação com banco
simulado. A integração local também foi exercitada no Firebird com envios
simultâneos e paginação; as mensagens temporárias foram removidas.

No Chrome, a autenticação real foi conferida junto de respostas controladas do
chat: lote inicial de 50, histórico com 75, preservação da rolagem, envio com
mensagem concorrente, pausa em segundo plano e recuperação de uma falha 503.
Também foram conferidos o bloqueio de perfil e o redirecionamento sem sessão.

O build web usa `npm run build` em `frontend`; o bundle Android usa
`npx expo export --platform android --output-dir .expo/chat-export` em `mobile`.
O cliente HTTP móvel é verificado com `node --test tests/api-client.test.cjs`
na pasta `mobile`, incluindo cache, consultas simultâneas e falhas em envios.
O bundle Android não substitui uma conferência visual em aparelho físico.
