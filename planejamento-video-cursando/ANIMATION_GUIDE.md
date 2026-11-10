# Plano de execução técnica — ainda não iniciado

## Motor escolhido para esta nova proposta

Rota A da skill: Canvas/SVG/HTML por tempo absoluto, Playwright e FFmpeg. Reutilizar os helpers de molas, morph, render, áudio e revisão do pacote. A produção terá fonte própria em diretório separado da instalação reutilizável. Não usar o projeto do vídeo anterior como base.

Na produção, revisar os scripts necessários antes de executá-los; instalar somente dependências desse motor a partir do lockfile da skill. Node/Playwright/FFmpeg sustentam a proposta 2D. Python e bibliotecas de beats só se a análise musical exigir. Three.js só mediante uma necessidade concreta de cena 3D.

## Contrato de animação

- Uma função `window.seek(t)` recompõe o frame completo para qualquer tempo, inclusive fora de ordem.
- Tempos em segundos, coordenadas na resolução de saída, sem relógio de parede nem estado acumulado entre frames.
- Fonte/asset carregados antes de desenhar. Arquivos locais e aleatoriedade com seed quando necessária.
- Uma tabela de estados controla posição, escala, largura, altura, raio e cor dos containers. Textos não sofrem deformação junto com a forma.
- Alvos de molas preservam continuidade. Texto sem overshoot visível; interface com assentamento discreto.
- Coordenadas dos cliques, scroll e destaques medidas nas capturas reais. O conteúdo da tela se move dentro do clip do dispositivo.

## Ordem proposta

1. Aprovar direção e texto, confirmar voz/CTA/custos.
2. Inventariar e capturar os materiais atuais do produto, com origem e direitos registrados.
3. Selecionar/gravar amostras de voz e decidir a interpretação.
4. Refinar storyboard e shotlist estruturado; medir a voz e, quando houver trilha, seus beats/downbeat.
5. Mostrar o plano temporal e os cues antes de escrever a animação.
6. Criar estados principais e stills; revisar leitura e continuidade.
7. Criar animatic econômico a 30 fps, meia resolução, sem blur temporal.
8. Desenvolver a animação completa; executar as três rodadas de revisão descritas em review_log.md.
9. Finalizar voz/mix, renderizar os formatos e verificar o MP4 codificado.

## Qualidade de saída proposta

- Master de acordo com a referência técnica da skill: 60 fps, quatro subframes temporais, H.264/yuv420p, CRF 16 e MP4 faststart.
- 9:16 em 1080×1920; 16:9 em 1920×1080. Exportar separadamente conforme memória disponível.
- Texto nítido em hold; inspecionar rastros de blur e bordas de máscaras em frames consecutivos.
- Legendas separadas e versão com legendas incorporadas, se confirmada como entrega desejada. Reservar espaço desde o storyboard.
- Verificar fontes/assets, duração, resolução, fps, áudio, picos, normalização e decodificação. Inspecionar o arquivo final a 360 px de largura e em tamanho de exibição.

## Estado das decisões

Motor e parâmetros são propostas para aprovação. Dependências de render não foram instaladas nesta etapa. Não há cronograma de render iniciado, master produzido, voz escolhida, gasto contratado ou nota estética atribuída.
