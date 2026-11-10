# Revisões — 10/11/2026

## Preparação

Skill completa instalada; referência take por take, efeitos, produção e scripts consultados. Frames do exemplo em `refs/analise/`; folhas detail-01, detail-03 e detail-05 inspecionadas. A música/cenas do exemplo e o vídeo Remotion anterior não foram usados como base.

## Rodada 1 — composição e escala

Evidências: `out/revisao-1/`, `out/contato-1.jpg`; correção em `out/revisao-2/`, `out/contato-2.jpg`.

1. Em 1,6–58,5 s, coordenadas finais no preview reduzido cortavam elementos. Corrigido com sistema de coordenadas canônico e transformação por resolução de saída.
2. Em 18–21, 30–33 e 42–45 s, telefones completos tornavam a informação pequena. O retrato passou a ampliar as áreas de aulas, retomada e prova.
3. Em 27–30 e 33–36 s, telefones saíam da área útil no horizontal. Dimensões recompostas por formato.

Keyframes posteriores: `out/revisao-3-horizontal/` e `out/revisao-3-vertical/`. Essa rodada foi triagem de composição; não houve avaliação de áudio a partir de stills.

## Rodada 2 — identidade e leitura

Evidência: três estados por take, 60 frames por formato em `out/revisao-site-*`; três folhas de contato de cada formato em `out/contato-site-*`, abertas e inspecionadas.

1. Em 12–15 e 24–27 s, capturas esticadas achatavam a interface. Corrigido com escala uniforme e título/produto lado a lado no horizontal.
2. Em 42–45 s, o telefone sobrepunha a segunda linha do título. A prova foi ampliada à direita e o título reorganizado à esquerda.
3. Em 54–57 s, verde profundo perdia contraste sobre o fundo verde do site. A frase passou a usar branco e verde claro.

Também corrigidos: paleta pelos tokens do site, Segoe UI, bordas/raios discretos, CTA como botão, pergunta inicial em caixa normal, busca vetorial, cursor no curso que abre a transição. As métricas/datas de teste saíram do telefone em 27–30 s.

## Rodada 3 — continuidade e render

Evidência de animatic: `out/animatic-horizontal.mp4` e `out/animatic-vertical.mp4`, 30 fps e meia resolução. Revisão posterior: `out/revisao-final-*`, especialmente 13,5, 19,5, 28,9, 43,5 e 55,5 s, inspecionados individualmente.

1. Em 2,7–3,4 s, o sublinhado desaparecia antes de a busca surgir em outro lugar. Agora a forma se move e aumenta; o campo também passa ao primeiro card em 6 s.
2. Em 5,6–6 s, estado herdado do contexto alterava pixels após seek fora de ordem. Reinicialização do contexto corrigiu o problema. A verificação passou nos três layouts.
3. Em 27–30 s, a base do telefone encostava na legenda vertical. O aparelho foi movido para cima antes do master.

O renderer calcula a média dos quatro subframes em canvas auxiliar e reutiliza apenas pausas verificadas como idênticas. A suite da skill passou: 14/14 testes.

## Conferência do MP4

`review` gera folhas de toda a duração, redução para 360 px, faixa de transição e poster em `out/review-*`. `out/qa-*.json` registra metadata, decodificação e áudio de cada entrega. A revisão final deve se referir a esses arquivos, além dos stills da fonte.

Conferência realizada: folhas 001–003 do horizontal, folha 004 do vertical, páginas 002–003 a 360 px do vertical, folha integral do corte curto e strip do horizontal foram abertas e inspecionadas. Os enquadramentos ampliados e o contraste corrigido permanecem no MP4 codificado. A faixa da transição mostra a passagem gradual da pergunta para a busca.

Os três MP4 passaram no QA: longos com 3.600 quadros e 60 s; curto com 900 quadros e 15 s. Todos têm H.264/yuv420p, 60 fps e AAC a 48 kHz. Loudness: −14,60 LUFS / −3,10 dBTP nos longos; −14,62 LUFS / −3,47 dBTP no curto. Relatórios em `out/qa-horizontal.json`, `out/qa-vertical.json` e `out/qa-curto.json`.

A apresentação `out/index.html` carregou os três vídeos com dimensões e durações corretas. Reprodução verificada no Chromium; sem erros JavaScript ou overflow em 1.440 e 375 px. Evidências em `out/delivery-check.json` e `out/apresentacao-*.png`. A voz permanece pendente; não houve escuta crítica da trilha.

## Avaliação por evidência

| Critério | Avaliação | Evidência / limite |
| --- | --- | --- |
| Gancho | 8/10 | Pergunta completa legível em 1,5 s. |
| Leitura principal | 8/10 | Stills finais dos dois formatos; detalhes secundários das capturas são menores. |
| Composição | 8/10 | Prova e módulos ampliados, sem sobreposição dos títulos nos estados inspecionados. |
| Marca | 9/10 | Logo original, paleta do site, home real e CTA consistente. |
| Variedade | 8/10 | Tipografia, busca, cards, marca, site, app e reconhecimento em 20 takes. |
| Fluidez percebida | Não pontuada | Frames e determinismo não substituem assistir continuamente ao MP4. |
| Sincronismo / escuta | Não pontuado | Efeitos posicionados; sem escuta crítica humana. |
| Narração | Pendente | ElevenLabs retornou HTTP 402; entregas com música/efeitos, sem voz. |

As notas não certificam qualidade profissional. O usuário deve assistir e ouvir o arquivo antes de publicação.
