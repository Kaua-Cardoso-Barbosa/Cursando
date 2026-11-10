// @ é válido em um segmento da URL e deve permanecer legível no endereço.
export function urlPerfil(identificador) {
    return `/perfil/${encodeURIComponent(identificador).replace(/^%40/i, '@')}`;
}
