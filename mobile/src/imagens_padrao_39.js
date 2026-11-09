import { resolverUrlMidia } from './api/client_3_17';

// As mesmas imagens do site, incluídas no pacote para uso sem conexão externa.
export const imagemPadraoCurso = require('../assets/placeholders/curso.png');
export const imagemPadraoAula = require('../assets/placeholders/aula.png');

export function fonteImagemCurso(caminho) {
  return !caminho || caminho.endsWith('/imagens_banner_curso/Placholder.png')
    ? imagemPadraoCurso : { uri: resolverUrlMidia(caminho) };
}

export function fonteImagemAula(caminho) {
  return !caminho || caminho.endsWith('/imagens_thumb_video/Placeholder.png')
    ? imagemPadraoAula : { uri: resolverUrlMidia(caminho) };
}
