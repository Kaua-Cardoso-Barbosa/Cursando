# Provas e histórico por curso

O professor gerencia as provas na área de provas do curso, tanto no site quanto no aplicativo.

- **Rascunho:** permite edição e exclusão, desde que não tenha tentativas.
- **Vigente:** aceita novos envios dos alunos habilitados. Conteúdo e percentual ficam fixos.
- **Arquivada:** mantém as tentativas e permite concluir correções pendentes. Não recebe novos envios.

Publicar um rascunho arquiva a prova vigente do curso na mesma transação. Para alterar uma prova publicada, use **Criar versão a partir desta**. É preciso salvar o rascunho antes de publicar.

O percentual mínimo é inteiro, entre **50% e 100%**. A aprovação compara o número real de acertos com o percentual escolhido. Uma nota exibida com arredondamento não aumenta o percentual real do aluno. O resultado final é exclusivamente **Aprovado** ou **Reprovado**. Enquanto houver questões dissertativas sem correção, a tentativa aguarda correção, sem publicar nota ou quantidade de acertos. Ao concluir todas as correções, a nota e o resultado final são disponibilizados.

Cada tentativa mantém uma cópia do conteúdo respondido e do critério de aprovação. A correção posterior usa essa cópia. A aprovação continua válida após arquivar ou substituir a prova, inclusive para emissão de certificado e avaliação do curso.

## Histórico

O histórico do professor está dentro da gestão de provas de cada curso. A pesquisa por aluno ignora diferenças de maiúsculas e acentos. Os filtros de situação se referem à **prova**, não à tentativa. A ordenação por nota mantém resultados pendentes no final.

O aluno acessa o histórico pela área de provas do curso. Também há acesso independente em **Histórico de provas** no menu do site e em **Meus cursos → Meu histórico de provas** no aplicativo, disponível mesmo com assinatura vencida. Cada aluno só pode consultar as próprias tentativas. O gabarito não é enviado à API do aluno.

## Dados de demonstração

Na raiz do repositório, execute:

```powershell
.\backend\.venv\Scripts\python.exe backend/seed_provas_teste.py --recriar-provas-de-teste
```

Esse comando apaga provas, questões, tentativas e certificados dos cursos que tinham provas. Em seguida, cadastra versões de demonstração nos cursos existentes e tentativas para seus alunos matriculados. Usuários, matrículas, cursos e videoaulas são mantidos.

Os exemplos incluem rascunhos com mínimo de 50%, provas vigentes com 75%, arquivadas com 60%, reprovação seguida de aprovação e correções pendentes. Não são enviados e-mails ao cadastrar esses exemplos.

## Verificação das regras

```powershell
.\backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
```

As rotas antigas de gravação e exclusão por curso retornam conflito e não removem respostas. É necessário reiniciar o backend e atualizar o site/aplicativo ao instalar esta versão.
