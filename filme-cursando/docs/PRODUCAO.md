# Produção — 10/11/2026

## Direção

A curiosidade vira busca, curso, módulo, aula, retomada, conversa e reconhecimento. São 20 cenas em 60 segundos e um corte vertical de 15 segundos, com composição própria por formato.

Identidade extraída de `frontend/src/pages/Home/Home_38.module.css` e `frontend/src/index_38.css`: fundo `#f5f9f6`, texto `#173f2e`, verde principal `#02693e`, apoio `#06a663`, verde profundo `#075132`. Tipografia Segoe UI, seguindo a família de sistema do site, com Manrope como alternativa redistribuível. Bordas claras, cantos discretos e CTA com geometria de botão. As capturas preservam a proporção.

O sublinhado vira busca, a busca assume a forma do primeiro card e o verde do card revela a marca. As outras cenas combinam máscaras tipográficas, cortes, aproximações e adaptação de container entre site e aplicativo. Não é gravação contínua de navegação.

## Materiais

| Material | Origem e uso |
| --- | --- |
| Logo e capas | Arquivos já usados pelo Cursando. Direitos das fotografias originais não foram auditados nesta produção. |
| Site | Capturas da interface existente com dados de demonstração lidos da API. Nome do aluno substituído por “Aluno”. |
| Aplicativo | Componentes reais de `mobile/src` renderizados com React Native Web e adaptadores de ícones/Expo. Não é uma gravação de aparelho físico nem o site responsivo. |
| Cursos | Domador de Calopsita, Matemática Fundamental e Marketing Digital, existentes no catálogo. Sem números de vendas ou depoimentos inventados. |
| Chat | Contato da professora do curso, sem conversa privada ou mensagens fabricadas. |
| Prova e certificado | Estado existente de aluno aprovado, sem alterar respostas ou notas. O certificado é explicado em uma cartela gráfica; nenhum documento novo foi emitido. |
| Player | Capa real em 16:9, símbolo de reprodução e barra ilustrativa. Não é reprodução de uma aula nova. |
| Fonte | Manrope, Google Fonts, SIL OFL incluída em `engine/assets/cursando/OFL.txt`. Segoe UI não foi copiada. |
| Música | Síntese original pelo helper da skill, arranjo `cursando`: 112 BPM, baixo, percussão leve, teclas e acordes. |
| Efeitos | 21 eventos sintetizados pelo helper da skill, posicionados nas ações/transições. |
| Referência | Skill e exemplo usados para estudar máscaras, ritmo e continuidade. Nenhum trecho, logo ou música do exemplo entra na entrega. |

## Narração

ElevenLabs foi escolhido pelo usuário. A chave local foi validada sem exibir seu valor. A conta retornou plano Free e 10.000 créditos disponíveis. A voz selecionada foi “Alice - Brazilian Creator”, com sotaque brasileiro. A tentativa de sintetizar 636 caracteres no Multilingual v2 recebeu HTTP 402 `payment_required`.

Não houve nova tentativa automática, contratação ou substituição silenciosa por Kokoro. Os áudios locais anteriores são referências de trabalho e não entram nos arquivos `sem-locucao`.

Para a locução definitiva, resolver a disponibilidade da voz e a licença comercial, gerar a fala, conferir pronúncia por escuta e ajustar o timing da imagem. Os créditos gratuitos não incluem licença comercial.

## Verificações

- H.264, `yuv420p`, CRF 16, 60 fps e quatro amostras temporais por quadro.
- Layouts 1920 × 1080 e 1080 × 1920; animação por `window.seek(t)`.
- Render local com rede externa bloqueada; sem iniciar o backend.
- 14 testes da skill aprovados depois de completar a cópia dos templates de teste.
- Lint da composição: zero erros e zero avisos.
- Seek fora de ordem produz os mesmos pixels. As 21 pausas nas versões longas e seis na curta foram verificadas como idênticas.
- Metadata, decodificação e loudness são verificados nos MP4 entregues; relatórios em `out/qa-*.json`.
- Entregas aprovadas: longos com 3.600 frames, curto com 900; 60 fps, AAC 48 kHz. Loudness −14,60 LUFS / pico −3,10 dBTP nos longos e −14,62 LUFS / −3,47 dBTP no curto.
- A apresentação local foi verificada no Chromium em 1.440 e 375 px: três vídeos carregados, sem erros ou overflow. Relatório e hashes em `out/delivery-check.json`.

Foram inspecionados stills, folhas de contato e sequências de frames. Não houve escuta crítica humana da trilha/efeitos. Loudness não certifica qualidade artística. A URL pública não foi inventada: o CTA é “Explore nossos cursos”. Nenhum vídeo foi publicado.
