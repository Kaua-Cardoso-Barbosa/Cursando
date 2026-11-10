// A mesma escala é usada nas médias dos cursos e nas avaliações individuais.
export function corAvaliacao(valor) {
    const nota = Math.max(0, Math.min(5, Number(valor) || 0));
    if (nota === 0) return '#6b7280';
    if (nota < 2) return '#c0392b';
    if (nota < 3) return '#c66a16';
    if (nota < 4) return '#9a6b00';
    if (nota < 5) return '#299447';
    return '#087044';
}
