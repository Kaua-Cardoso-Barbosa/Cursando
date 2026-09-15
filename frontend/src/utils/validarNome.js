const nomesInvalidos = new Set(["teste", "test", "nome", "asdf", "abc"]);

export default function validarNome(valor) {
    const nomeNormalizado = (valor || "").trim().normalize("NFC");
    const partes = nomeNormalizado.split(/\s+/);
    const padraoNome = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;
    const letras = Array.from(nomeNormalizado).filter(
        (caractere) => caractere.toLocaleUpperCase() !== caractere.toLocaleLowerCase()
    );

    if (nomeNormalizado.length < 2 || nomeNormalizado.length > 100) {
        return false;
    }

    if (nomesInvalidos.has(nomeNormalizado.toLocaleLowerCase())) {
        return false;
    }

    return partes.every((parte) => parte.length > 0)
        && padraoNome.test(nomeNormalizado)
        && new Set(letras.map((letra) => letra.toLocaleLowerCase())).size > 1;
}
