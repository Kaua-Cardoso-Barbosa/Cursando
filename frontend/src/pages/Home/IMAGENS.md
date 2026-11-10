# Imagens da home

A repaginação já funciona com os arquivos atuais. Nenhuma imagem nova é obrigatória.

## Foto principal — substituição recomendada

- Atualmente: `vale-a-pena-fazer-um-curso-online 1.png`, reutilizada na abertura.
- Nova imagem sugerida: `frontend/public/imagens_assets/home-estudo.webp`.
- Conteúdo: pessoa adulta estudando pelo notebook em uma mesa, com caderno e fones, luz natural, cenário brasileiro e detalhes verdes discretos. Sem textos, logotipos ou selos na fotografia.
- Entrega: 1200 × 900 px (4:3), preferencialmente WebP com até 250 KB.
- Enquadramento: mantenha rosto, mãos e notebook na região central. No celular, a imagem é recortada para 16:9.
- Ao adicionar o arquivo, altere o `src` da imagem em `components/Hero/Hero.jsx` e ajuste o texto alternativo à imagem escolhida.
- Não sobrescreva a fotografia antiga: ela também pode ser utilizada em outras partes do projeto.

## Capas dos cursos

- As capas continuam vindo dos cursos cadastrados, em 16:9.
- Recomenda-se exportar cada capa em 1280 × 720 px, com o assunto em destaque e sem parágrafos ou letras pequenas.
- Mantenha iluminação, enquadramento e tratamento de cor semelhantes entre os cursos.
- O fallback usa a imagem padrão de curso do próprio site.

## Outras imagens

O antigo `banner.png` não é mais usado como fundo da home. Não precisa ser apagado.
Não é necessário adicionar imagens nas seções de etapas e assinatura: ícones e texto mantêm essas áreas simples e leves.
