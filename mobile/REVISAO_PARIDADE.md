# Revisão de paridade — 10/11/2026

Implementado no aplicativo:

- Entrada dedicada a login e cadastro, sem home pública ou atalhos para ela; recuperação de senha por código enviado por e-mail.
- Cards de cursos compartilhados entre catálogo, cursos, perfis e início do professor.
- Início do aluno com últimas aulas assistidas; início do professor com cursos recentes em carrossel.
- Perfil de apresentação por identificador ou @, com filtros e paginação; professor com cursos e aulas recentes; aluno com conquistas e avaliações.
- Conquistas: iniciante de 1 a 33%, intermediário de 34 a 66%, avançado a partir de 67%; conclusão exige todas as aulas e aprovação na prova.
- Editor do perfil em modal, seleção de foto com prévia e envio multipart. Administrador mantém o editor em tela.
- Resumo e abas de gestão do curso para o professor, incluindo avaliações paginadas.
- Consulta de perfis privados pelo administrador, acesso ao perfil público e cadastro de professor com @ opcional.
- Nome do autor da avaliação abre o perfil tanto no site quanto no aplicativo.
- Bloqueio pelo administrador exige motivo em confirmação própria, liberada após 1,5 segundo. O motivo aparece apenas no perfil administrativo.
- Módulo aberto usa a largura da tela, com aulas numeradas e miniaturas compactas em 16:9. Medalhas reproduzem em SVG os contornos, cores, símbolos e fitas do site.
- Cores, tipografia, bordas e escalas de botões alinhadas às dashboards do site. Formulários e telas financeiras usam o mesmo padrão de cards e campos do app.
- `BotaoVoltar_39` padroniza os retornos; `Abas_39` limita a altura de Módulos/Complementos e mantém a altura estável ao trocar de seção.
- `TelaApp_39` reserva espaço para a navegação inferior nas telas autenticadas. A barra ocupa a largura do app no fluxo do layout, sem margens flutuantes nem sobreposição ao conteúdo.
- Menu completo com os acessos por tipo de usuário. A abertura do chat mostra contatos; selecionar um abre a conversa, e Voltar retorna à lista. Envio, histórico, paginação e leitura continuam usando o mesmo serviço existente.
- A seleção da navegação inferior colore todo o botão, incluindo a área do ícone e do texto. A opção Provas do aluno abre o histórico existente.
- Dropdown compartilhado em Descobrir, filtros do perfil, taxonomias do editor de curso, relatórios, logs, seleção de curso/prova/tipo e filtros do histórico de provas e tipo de complemento. A lista abre junto ao campo, permite rolagem e fecha sem alterar o valor ao tocar fora. Abas e respostas de múltipla escolha mantêm seus papéis.

## Dashboard do aluno

| Área | Conferência e ajustes |
| --- | --- |
| Início | Últimas aulas, indicador de conclusão, tempo assistido e barra proporcional. |
| Meus cursos | Card compartilhado, capa 16:9 e progresso. |
| Descobrir | Card compartilhado; busca, categoria, tema, nota e recomendação continuam usando a API existente. |
| Curso e módulos | Módulos numerados, conteúdo sem descrição nos cards de aula, acesso ao perfil dos professores e preservação do módulo selecionado no mobile. |
| Aula | Playlist por módulo; aula atual verde; barra proporcional e tempo assistido. Retorno preserva a origem no aplicativo. |
| Avaliações | Regra de 75% explícita; estrelas por cor; autores clicáveis; médias preservam casas decimais. |
| Provas e histórico | Revisados os fluxos existentes de envio, aprovação/reprovação e consulta de provas arquivadas. |
| Perfil | Jornada com filtros recolhíveis, conquistas por nível, avaliações e edição com foto. |
| Chat | Revisadas integração existente, mensagens, paginação e tratamento de erro. |
| Financeiro/assinatura | Revisados componentes existentes de cobrança, QR Code e histórico de faturas. |

O progresso do catálogo e do perfil agora considera apenas aulas disponíveis em módulos publicados. Perfis de apresentação não retornam CPF, e-mail, senha ou valores financeiros; administrador não possui perfil público.

## Verificação

- Build do site e exportação Android concluídos.
- Navegador: autor da avaliação → perfil; prévia e envio multipart da foto.
- Componentes móveis com serviços simulados: filtros, paginação, expansão de aulas, modal/cancelamento, foto, navegação do aluno, conquistas, avaliações do professor e perfis/cadastro pelo administrador.
- API com consultas ao banco: perfil público sem dados privados, controle de acesso às avaliações, médias e progresso consistentes.
- Arquivos temporários: armazenamento de foto, formatos aceitos e limite de 5 MB.

Esta revisão não substitui um teste completo em aparelho. Galeria/permissões do sistema, teclado, aparência nativa, reprodução e comportamento do botão físico precisam de conferência no dispositivo. Reinicie a API para carregar as rotas alteradas e recarregue o Expo. O esquema `cursando://perfil/...` requer um novo build nativo para registro no sistema.

## Administrador no aplicativo

- Início com os quatro indicadores e gráfico da plataforma.
- Financeiro com resumo, pool, análise manual de pagamentos, ticket por aluno, custos únicos/mensais, categorias e transações filtradas.
- Relatórios por período, instrutor e curso, com totais e tabela detalhada.
- Usuários em três listas, com pesquisa, cadastro de professor/administrador, edição, bloqueio com motivo e perfis privados.
- Histórico de atividades com traduções de auditoria iguais ao site, valores antes/depois, dados técnicos e paginação.
- Perfil administrativo usa o editor existente com foto.
- A pedido do usuário, mantido o menu inferior padrão do app; o menu superior responsivo do site não é utilizado.
- Exportação Android e fluxos administrativos com API simulada validados. A equivalência visual exata em aparelho ainda não foi verificada; seleção de arquivo, teclado, fontes e controles nativos mantêm o comportamento do aplicativo.
