# Revisões do pitch escolar — 16/11/2026

## Preparação

Skill Motion Video Studio consultada: SKILL.md, production.md e effects.md; estudo e análise da referência existentes preservados em `refs/analise/`. A nova montagem usa a identidade do site e o roteiro efetivamente gravado, sem cenas ou áudio do exemplo da skill.

Timing por transcrição local da voz recebida: abertura 0,65 s; catálogo 12,11 s; exemplo 16,51 s; aula 25,14 s; progresso 31,44 s; chat 37,30 s; prova 41,38 s; aprovação 44,28 s; fechamento 55,86 s. Duração de entrega: 60 s. Nenhuma mudança na velocidade da voz.

## Rodada 1 — enquadramento e hierarquia

Evidências: `out/escolar/revisao-1-horizontal/` e `revisao-1-vertical/`, 48 estados por formato (três por take); folhas em `contatos-1-*`.

Três problemas encontrados e corrigidos:

1. 25,14–31,44 s: o horizontal continha grandes margens brancas e o vídeo ficava pequeno. O player passou a ocupar a área dominante e a lista real de aulas foi ampliada ao lado.
2. No mesmo trecho, o retrato sobrepunha uma captura inteira com outro quadro de vídeo, duplicando regiões da interface. A composição foi separada em vídeo e recorte da aula ativa, sem duplicar texto.
3. 34,24–37,30 s: o título se sobrepunha ao aparelho no horizontal. Título à esquerda e aparelho à direita; o retrato mantém composição própria.

## Rodada 2 — leitura e dados visíveis

Evidências: `out/escolar/revisao-2-*`. Foram inspecionados individualmente 21,074 s no vertical, 28,288 s nos dois formatos, 35,768 s e 42,828 s no horizontal.

Três problemas encontrados e corrigidos:

1. 19,51–22,64 s: o recorte dos módulos incluía o formulário de avaliação e cortava parte do primeiro módulo. A captura foi reposicionada e o recorte passou a mostrar as três etapas.
2. 25,14–31,44 s: a segunda linha do título encostava no vídeo horizontal. Título reposicionado e reduzido; área do vídeo separada com respiro.
3. 41,38–46,78 s: a prova web reduzida era difícil de ler em retrato. A questão passou a usar o componente real do aplicativo, com snapshot da resposta da API anterior ao envio; o resultado vertical destaca apenas os números da tentativa efetivamente registrada, acompanhado do recorte real.

Verificação de determinismo: os dois formatos retornaram os mesmos pixels após seek fora de ordem. Um intervalo de cache começou antes de o sublinhado inicial assentar; ajustado para 2 s. As demais 28 pausas foram verificadas como estáticas, respeitando cada troca de legenda.

## Rodada 3 — animatic e saída codificada

Animatics em `out/escolar/animatic-*.mp4`, 30 fps e meia resolução. Folhas e strips serão confrontados com o master codificado. Conferir especialmente o fim da fala sobre a aula, a passagem ao app, a questão e a leitura do certificado.

Foram abertas as folhas de toda a duração dos dois animatics e a faixa de 12 frames em 25,05 s. As correções de escala, sobreposição e recorte da rodada 2 permanecem no vídeo codificado. A faixa mostra a saída da lista e o início da aula com a entrada do título por máscara. O vídeo de aula usa os frames em sua cadência original de 30 fps, sem acelerar seu conteúdo.

Nesta conferência não foram identificados três novos problemas materiais; não inventamos achados para preencher a revisão. Permanecem três limites concretos: detalhes secundários da interface ficam pequenos; o chat mostra apenas rascunho porque não há conversa enviada; o certificado e a aprovação são dados preparados para demonstração escolar. Os recortes e os textos principais sustentam a leitura sem depender dos detalhes pequenos.

Verificações técnicas concluídas antes do master: sintaxe válida, lint sem erros/avisos, 14/14 testes da skill e igualdade de pixels nas 28 pausas verificadas, nos dois formatos.

Não pontuar escuta crítica ou fluidez contínua com base apenas em stills. Não foram enviados os áudios a um serviço de voz. As legendas seguem palavras reconhecidas localmente, com revisão de grafias pelo roteiro.

## Critérios

## Conferência final concluída

Os dois masters foram codificados e muxados com a mesma mixagem. QA aprovado nos dois: 60 s, 3.600 frames a 60 fps, H.264/yuv420p, AAC 48 kHz mono; −14,16 LUFS integrados e −3,41 dBTP de pico verdadeiro. Os arquivos decodificaram sem erros.

Foram inspecionados no MP4 codificado: folha 002 do horizontal (curso, módulos e aula), folha 003 do vertical (aula, progresso, app, chat, prova e resultado) e faixa de 12 frames em 25,05 s. As correções da fonte permanecem no vídeo e a transição temporal mantém a entrada do título legível. As outras etapas aparecem nas folhas completas dos animatics e nos stills por take; não foi afirmada escuta crítica humana.

Página de entrega verificada no Chromium em 1.440 e 375 px: dois players com duração e dimensões corretas, reprodução iniciada e seek funcionando; nenhum erro JavaScript ou overflow. Evidências: `out/escolar/delivery-check.json` e `apresentacao-*.png`. Hashes dos MP4 constam do relatório.

### Avaliação visual

Gancho 8/10, leitura principal 8/10, variedade 8/10, composição 8/10 e marca 9/10, com base nos stills, folhas e strips inspecionados. Fluidez contínua e escuta não foram pontuadas: não são certificadas pelo QA técnico. Os recortes de UI secundários são contexto; textos principais e a técnica em execução são o foco.

| Critério | Evidência atual |
| --- | --- |
| Gancho | Pergunta da voz e título curtos, legíveis no primeiro take. |
| Leitura | Aulas e questão ampliadas por formato; detalhes secundários não carregam a narrativa. |
| Marca | Cores, fonte, logo e geometria compatíveis com o site. |
| Conteúdo | Três cursos novos, aula real, prova corrigida e certificado emitido. |
| Som | Voz original preservada, música e efeitos em camadas; loudness medido no arquivo final. Escuta humana ainda necessária. |
| Limites | App representado por componentes React Native Web; não é gravação de aparelho físico. Chat mostra rascunho, não mensagem enviada. |

## Revisão pontual da logo — 16/11/2026

O usuário identificou que o filtro `brightness(0) invert(1)` eliminava as cores e os detalhes da logo nos takes de marca (3,70–7,10 s e 55,86–60 s). Removido somente esse filtro: o PNG é idêntico ao utilizado no site. A avaliação anterior da marca não havia detectado esse problema.

Os blocos de codificação que incluem esses takes foram renderizados novamente em ambos os formatos. O miolo entre 7,10 e 55,8667 s foi copiado do MP4 anterior, com comparação dos 2.926 hashes de quadros decodificados. O áudio foi copiado sem recodificação e comparado pacote a pacote. Os arquivos anteriores ficam em `out/escolar/logo-corrigida/original-*.mp4` para recuperação local. Script: `scripts/escolar-corrigir-logo.mjs`.
