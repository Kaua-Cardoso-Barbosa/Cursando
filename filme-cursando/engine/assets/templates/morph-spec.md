# Spec de UI morph (um objeto, nunca corta)

Estrutura de especificação para filmes de produto em que um container muda de estado. Preencha, mostre a lista de estados sobre o grid de beats e só então escreva código.

<inputs>
Produto + URL; 8 a 12 estados de UI que contam a história; dado real em cada estado; cores/fontes da marca + um acento; música (arquivo ou sintetizar, ~120 BPM); formatos.
</inputs>

<direction>
Um container que nunca corta: cada estado é o mesmo elemento mudando tamanho, raio e preenchimento enquanto o conteúdo troca atrás de um blur curto. O cursor dirige cada mudança com cliques reais. O último frame iguala o primeiro (posição e velocidade do cursor incluídas) se for loop.
</direction>

<structure>
Estado 1 … Estado N: tempo (em beat), container (w, h, raio, cor), conteúdo, ação do cursor, SFX.
</structure>

<build>
1. `window.seek(t)`, sem transições CSS, timers nem estado carregado.
2. Molas fechadas; valor com vários alvos = `track()`.
3. Texto em container em morph entra depois do início do morph e sai antes do próximo.
4. Indicadores de aba: borda líder e borda seguidora em molas diferentes.
5. Grid de beats medido; começar em downbeat confirmado.
6. 60 fps, 4 subframes, H.264 yuv420p CRF 16.
</build>

<gotchas>
Sem will-change em algo escalado pela câmera. Teste a emenda se for loop.
</gotchas>

<start>
Peça as entradas faltantes, mostre a lista de estados no grid de beats e aguarde a aprovação real do usuário.
</start>
