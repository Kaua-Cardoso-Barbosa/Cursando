# Cursando — Seu próximo passo começa aqui

Projeto de motion design independente do site e do aplicativo. Vídeo principal de 60 segundos, adaptação vertical e corte vertical de 15 segundos. Os arquivos finais ficam em `out/`.

## Conteúdo

Oito cenas: vontade de aprender, apresentação da plataforma, catálogo, módulos, retomada/progresso, conversa com professor, aprovação/certificado e chamada para explorar os cursos. Identidade baseada em verde `#06a663`, verde escuro `#075132`, fundos claros, logo e imagens do projeto.

- Home e catálogo: capturas da versão local do site, com cursos públicos existentes. Nenhum login real ou dado privado é utilizado.
- Celular, módulos, chat e certificado: composições ilustrativas para motion design baseadas na linguagem visual do produto, não gravações de um aparelho. Conversa e percentuais são exemplos demonstrativos. O certificado é apresentado após aprovação na prova final.
- Locução sintética local: Microsoft Maria Desktop, pt-BR, disponibilizada pelo Windows. A voz pode ser substituída por uma gravação humana nos arquivos `public/audio/raw/`.
- Trilha e efeitos: síntese original gerada pelo script, sem músicas comerciais ou serviços pagos.
- Fontes: Segoe UI/Arial do sistema.
- Capas e logo: arquivos já existentes no repositório; a cópia não altera sua origem nem suas licenças. Os caminhos de origem estão em `public/catalog.json`. Créditos das capas devem ser mantidos conforme o acervo do projeto.

## Executar

```powershell
cd video
npm ci
npm run studio
```

O Remotion Studio permite revisar qualquer quadro e editar textos, ritmo e composição. O projeto não é uma dependência de produção do site ou do app.

```powershell
npm run check
npm run render
```

Para renderizar apenas uma versão:

```powershell
node scripts/render.mjs CursandoLandscape
node scripts/render.mjs CursandoVertical
node scripts/render.mjs CursandoShort
```

Os renders usam Chrome Headless Shell baixado pelo Remotion, H.264, AAC, 30 fps e dimensões de 1920×1080 ou 1080×1920. O navegador é preparado com `npx remotion browser ensure`.

## Atualizar materiais

`npm run assets` copia as capas e o logo e captura a home e o catálogo. Exige a API local já disponível em `127.0.0.1:5000` e o frontend em `127.0.0.1:5199`. O endereço do frontend pode ser definido em `CURSANDO_PREVIEW_URL`. O script não inicia nem altera o backend. Usa o Microsoft Edge instalado para as capturas.

`npm run audio` usa Windows System.Speech e o FFmpeg/FFprobe já existentes em `../ferramentas/ffmpeg/bin/`. Gera locução, trilha, mix estéreo e legenda SRT. A locução é sincronizada por cena, preservando todos os trechos. O corte curto de 15 segundos usa apenas a trilha.

## Entregas

- `out/cursando-60s-horizontal.mp4`
- `out/cursando-60s-vertical.mp4`
- `out/cursando-15s-vertical.mp4`
- `out/cursando-legendas.srt` — legenda separada dos vídeos de 60 segundos, que também possuem texto de apoio incorporado.
- `out/capa.png` e imagens de revisão das cenas.
- `out/index.html` — página local para assistir e baixar as três versões.
- `out/verificacao.json` — resolução, duração, codecs e confirmação de decodificação completa dos três arquivos. Pode ser atualizado com `npm run validate`.

Remotion e pacotes relacionados foram fixados na mesma versão. Consulte as condições oficiais do Remotion antes de distribuição comercial: https://www.remotion.dev/docs/license. Nenhuma assinatura, licença paga ou API de geração foi contratada por este projeto.
