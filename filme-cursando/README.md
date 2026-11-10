# Cursando — Dê caminho à sua curiosidade

Produção nova baseada na skill [Motion Video Studio](https://github.com/igorcacerez/motion-video-studio-skill) e na identidade atual do site. O vídeo anterior em `../video/` foi preservado e não foi usado como base.

## Entregas

- `out/index.html`: apresentação local dos vídeos, após render e validação.
- `out/cursando-60s-horizontal-sem-locucao.mp4`: 1920 × 1080, 60 segundos.
- `out/cursando-60s-vertical-sem-locucao.mp4`: 1080 × 1920, 60 segundos.
- `out/cursando-15s-vertical-sem-locucao.mp4`: corte vertical de 15 segundos.
- `engine/assets/cursando/scene.mjs`: composição editável, com layouts próprios por formato.
- `docs/PRODUCAO.md` e `docs/review_log.md`: materiais, decisões, revisões e limites.

As entregas usam trilha e efeitos originais, sem a voz local anterior. A locução ElevenLabs está pendente: a chave foi validada, mas a voz brasileira selecionada recebeu HTTP 402 (`payment_required`). Nenhuma assinatura ou compra foi realizada. A conta consultada estava no plano Free, sem licença comercial de voz.

## Reproduzir

Node.js 22+, FFmpeg e FFprobe são necessários. Na pasta `engine`, `npm ci --ignore-scripts` e `npx playwright install chromium` preparam o motor. Configure `FFMPEG` e `FFPROBE` com os executáveis em `../../ferramentas/ffmpeg/bin/`. Não é necessário iniciar o backend para renderizar.

```powershell
node scripts/lint.mjs --input assets/cursando
npm test
node ../scripts/verify-composition.mjs
node scripts/render.mjs --page assets/cursando/index.html --format 16:9 --duration 60 --fps 60 --sub 4 --canvas-average --out ../out/nova-horizontal.mp4
```

Para vertical, use `--format 9:16`. Para o corte curto, acrescente `--config ../docs/short-config.json --duration 15`. O render não sobrescreve arquivos existentes.

`--canvas-average` desenha quatro instantes por quadro e calcula a média temporal antes de codificar o PNG. Mantém 60 fps e quatro subframes. As pausas são reutilizadas somente após as molas assentarem; sua igualdade de pixels é verificada por `verify-composition.mjs`.

Para incorporar uma locução, use o mixer da skill e `scripts/mux.mjs`, que troca o áudio sem recomprimir a imagem. Refaça a sincronização com a fala real, sem acelerar palavras para caber nos tempos atuais.

`.env.elevenlabs`, modelos, dependências, dados privados e saídas estão ignorados pelo Git. Não os inclua ao compartilhar a fonte. A chave não faz parte da página de apresentação ou das capturas.
