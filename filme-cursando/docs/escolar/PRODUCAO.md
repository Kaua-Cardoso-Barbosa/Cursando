# Cursando — apresentação escolar, 16/11/2026

Produção autorizada pelo usuário, com os dois MP3 enviados. Este vídeo apresenta funcionalidades do projeto e não é uma campanha comercial.

## Conteúdo e dados

- Professor existente: Lucas Almeida (ID 35), responsável pela curadoria de demonstração.
- Curso principal novo: Blender: primeiros passos na criação 3D (ID 25); três módulos, quatro aulas por módulo, IDs 70–81.
- Cursos novos de apoio: Python: lógica e primeiros programas (26) e Fotografia: luz e composição (27). Somente apresentação de catálogo; não são cursos completos com videoaulas. As descrições informam conteúdo em preparação.
- Cada curso precisou de uma prova publicada para a rota permitir publicação. Foram cadastradas três questões introdutórias por curso. Apenas a prova de Blender entra na demonstração.
- Material de apoio real: Guia de prática - Criação 3D, PDF original cadastrado pela rota de complementos.
- Matrícula, progresso, conclusão das aulas e prova do curso novo foram preparados como dados de demonstração pelas rotas existentes, na conta ativa Diogo Lopes (8). Não foram alteradas notas diretamente nem registros dos cursos antigos.
- A tentativa da prova principal foi respondida pelas rotas e corrigida pelo sistema: três acertos em três questões, 100%, mínimo de 70%. O certificado foi emitido pelo endpoint após concluir as aulas e aprovar a tentativa.
- Publicação de cursos no script de preparação não disparou e-mails a terceiros. No chat apenas selecionamos o contato e digitamos uma dúvida como rascunho; nenhuma mensagem foi enviada.

Não se trata de prova de que uma pessoa concluiu uma formação profissional: é uma demonstração escolar dos fluxos. Não há avaliações, depoimentos, número de alunos ou resultados comerciais fabricados no vídeo.

## Materiais e créditos

Videoaulas: Blender Foundation / Blender Studio, Blender 2.8 Fundamentals. As páginas oficiais acessadas diretamente forneciam links de download e indicação CC-BY 4.0. Lista de títulos, URLs e duração em `engine/assets/escolar/creditos-aulas.json`. Conteúdo original em inglês; descrições e guia em português. A versão 2.8 é informada nas descrições.

Página da aula reproduzida: https://studio.blender.org/training/blender-2-8-fundamentals/extrude/
Licença: https://creativecommons.org/licenses/by/4.0/

Os arquivos completos foram convertidos para MP4 1280×720 e cadastrados pelas rotas de upload; não são clipes de banco repetidos. O vídeo do pitch aproveita um trecho da aula de extrusão. Sem mudar a autoria original. Aulas 11–12 tratam de configurações de renderização e saída de imagem, conforme o material efetivamente selecionado; não há promessa de uma aula de câmera que não foi cadastrada.

Capas Blender/Python: composições originais em HTML/SVG renderizadas por Playwright, seguindo a paleta do site. Capa de fotografia: foto existente de Vlado Krstevski, Pexels 7619784, em layout original. Créditos em `engine/assets/escolar/creditos-capas.json`. Logo: arquivo do Cursando já existente.

Música: síntese original feita com o helper da skill Motion Video Studio, arranjo `cursando`, 112 BPM. Efeitos originais do helper da skill. Não foi usada música do exemplo de referência.

Narração: dois MP3 fornecidos pelo usuário; originais preservados em `audio/narracao-recebida/`. Parte 1: 24,267688 s; parte 2: 32,391750 s. Edição: normalização de ganho por trecho, filtro de graves leve, pequena pausa na emenda, sem acelerar a interpretação. Nenhuma nova geração, clonagem ou chamada ao ElevenLabs.

## Telas

Site capturado no Chromium a partir da aplicação real, API local e sessão em memória; nenhum token foi colocado em arquivos de entrega. Reprodução validada: o player avançou de 45,201215 para 46,293073 segundos em aproximadamente um segundo. Geometria e resultado em `engine/assets/escolar/player-geometry.json` e `out/escolar-capture-check.json`.

O trecho em movimento é da mesma aula cadastrada. Frames foram extraídos do arquivo para permitir montagem determinística dentro da captura do player. Não é gravação contínua de toda a navegação.

No horizontal, o vídeo foi aproximado e a lista da página foi disposta ao lado; no vertical, aparece com um recorte da aula ativa abaixo. É uma composição de motion design com conteúdo e recortes reais, não um novo layout implementado no site.

Aplicativo: componentes reais de `mobile/src`, capturados com React Native Web usando snapshots lidos das rotas. É uma visualização dos componentes do app; não uma gravação de aparelho físico. Não foi usado o site responsivo como se fosse o aplicativo.

Somente os cursos novos aparecem nos enquadramentos finais. A home é mostrada em recorte do hero; o chat é recortado para a conversa selecionada do curso novo. Cursos antigos que estavam fora desses recortes não foram renomeados sem necessidade.

## Ritmo e fonte editável

Fonte: `engine/assets/escolar/scene.mjs`. Identidade baseada nos tokens e componentes do site: Segoe UI, fundo claro, verde `#02693e`, texto `#173f2e`, bordas discretas. A fonte Manrope acompanha a produção com licença OFL como fallback.

O roteiro original gravado foi mantido. Faster Whisper local foi usado para localizar palavras; erros de reconhecimento evidentes como “tornaram” no gancho e a grafia de Cursando foram corrigidos conforme o roteiro fornecido. O alinhamento guia os blocos em `timeline.json`; legendas usam grupos curtos de palavras. A revisão por escuta do usuário ainda é necessária.

Auditoria da shotlist: os avisos de blocos maiores que quatro segundos foram avaliados pela ação. A aula tem movimento real contínuo; a jornada revela três etapas sucessivamente; catálogo e abertura mantêm pausas de leitura. A fala determina os cortes, sem cortar palavras para alinhar ao beat da trilha.

## Verificação e limites

Entrega concluída: `out/escolar/index.html`, com MP4 horizontal 1920×1080 e vertical 1080×1920. Ambos têm 60 s, 60 fps, quatro amostras temporais por quadro e narração fornecida pelo usuário, além de música/efeitos e legendas incorporadas. SRT e VTT acompanham os arquivos.

Os dois MP4 passaram na decodificação e QA: H.264/yuv420p, 3.600 quadros, áudio AAC 48 kHz; −14,16 LUFS e pico verdadeiro −3,41 dBTP. A apresentação local foi testada em 1.440 e 375 px, com reprodução e seek nos dois players, sem erros JavaScript ou overflow. Relatórios em `out/escolar/qa-*.json` e `delivery-check.json`.

Antes do render: verificação de sintaxe, lint da skill e revisão de stills. Depois: animatic, revisões por formato, MP4 H.264/yuv420p 60 fps com quatro amostras temporais por quadro, AAC, medição de loudness e inspeção dos frames codificados.

Os 14 testes da skill passaram. A composição escolar foi verificada após seek fora de ordem nos dois formatos; 28 pausas estáticas respeitam os limites de cada legenda. Não foram encontrados erros JavaScript na captura da página da aula. Metadata e leitura das telas não substituem escuta crítica humana.

## Reproduzir a composição

Na raiz do repositório, com Node e as dependências do motor instaladas, regenere os frames temporários (ignorados pelo Git) a partir de `engine/assets/escolar/extrude-pitch.mp4`, usando FFmpeg: oito segundos, 30 fps, escala 960×540, qualidade JPEG 4, nomes `frames/%04d.jpg`. Esse trecho contém a partir do segundo 45 da fonte original.

Na pasta `filme-cursando/engine`, configure `FFMPEG` e `FFPROBE` para os executáveis disponíveis e execute `node scripts/render.mjs --page assets/escolar/index.html --format 16:9 --duration 60 --fps 60 --sub 4 --canvas-average --out ../out/escolar/novo-horizontal.mp4`. Troque para `9:16` no vertical. O motor não sobrescreve saídas existentes. Para áudio, use o mixer e o mux da skill. A produção com os áudios do usuário está em `scripts/escolar-audio.py` e `scripts/escolar-finalizar.mjs`.

Os scripts de cadastro não são necessários para assistir ao MP4 e não devem ser executados automaticamente durante a reprodução. Capturas já incluídas tornam a composição independente de servidor em execução.

Revisões e resultados finais ficam em `REVIEW.md` e `out/escolar/`. Não afirmar escuta crítica humana ou teste em aparelho físico: as inspeções disponíveis foram de frames, metadata e execução no Chromium. O usuário deve assistir/ouvir o arquivo antes de apresentar.

Nenhum vídeo foi publicado ou enviado a terceiros. A API e o Vite foram iniciados localmente com autorização do usuário; logs em `out/` não são parte da entrega pública. Os MP4 finais e seus créditos devem acompanhar o projeto no repositório; credenciais, snapshots privados e downloads temporários continuam ignorados.
