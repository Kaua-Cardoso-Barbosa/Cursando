import BotaoVoltar from '../../components/BotaoVoltar/BotaoVoltar.jsx';
import { useState } from 'react';
import { FaPlug } from 'react-icons/fa';
import Button from '../../components/Button/Button.jsx';
import css from './PaginaIndisponivel.module.css';

export default function PaginaIndisponivel({ aoTentarNovamente, aoVoltar }) {
    const [tentando, setTentando] = useState(false);

    async function reconectar() {
        if (tentando) return;
        setTentando(true);
        try { await aoTentarNovamente(); }
        catch { /* A tela continua disponível para uma nova tentativa. */ }
        finally { setTentando(false); }
    }

    return <main className={css.pagina}>
        <section className={css.painel} aria-labelledby="titulo-indisponivel" aria-busy={tentando}>
            <span className={css.icone}><FaPlug aria-hidden="true" /></span>
            <h1 id="titulo-indisponivel">Não foi possível conectar</h1>
            <p>O serviço está indisponível no momento. Verifique sua conexão e tente novamente em instantes.</p>
            <div className={css.acoes}>
                <Button tipo="button" tamanho="medio" fundoCor="verde_escuro"
                    className={css.botao} disabled={tentando} onClick={reconectar}
                    texto={tentando ? 'Reconectando...' : 'Tentar reconectar'} />
                <BotaoVoltar emLinha to={aoVoltar ? undefined : '/'} onClick={aoVoltar}>{aoVoltar ? 'Voltar' : 'Voltar ao início'}</BotaoVoltar>
            </div>
            <small role="status">{tentando ? 'Verificando a conexão com o serviço.' : 'Ao reconectar, você poderá continuar nesta página.'}</small>
        </section>
    </main>;
}
