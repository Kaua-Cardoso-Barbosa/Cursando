import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PerfilUsuario from './PerfilUsuario_3.jsx';
import Alerts from '../Alerts/Alerts.jsx';
import popup from '../CadastroColaborador/CadastroColaborador_38.module.css';
import css from './EditarPerfilModal.module.css';

export default function EditarPerfilModal({ api, aoFechar, aoSalvar, setMensagem }) {
    const dialogo = useRef(null);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagemLocal] = useState(null);
    const avisar = useCallback((aviso) => {
        if (aviso?.tipo === 'sucesso') setMensagem?.(aviso);
        else setMensagemLocal({ ...aviso, id: Date.now() });
    }, [setMensagem]);
    useEffect(() => {
        const elemento = dialogo.current;
        const focoAnterior = document.activeElement;
        const overflowAnterior = document.body.style.overflow;
        elemento.showModal();
        document.body.style.overflow = 'hidden';
        return () => {
            elemento.close();
            document.body.style.overflow = overflowAnterior;
            focoAnterior?.focus();
        };
    }, []);
    return createPortal(<dialog ref={dialogo} className={`${popup.popup} ${css.dialogo}`}
        aria-labelledby="editar-perfil-titulo" onCancel={(e) => { e.preventDefault(); if (!salvando) aoFechar(); }}>
        <button type="button" className={popup.fechar} aria-label="Fechar edição do perfil" disabled={salvando} onClick={aoFechar}>×</button>
        <PerfilUsuario api={api} emModal onCancelar={aoFechar} onSalvando={setSalvando}
            setMensagem={avisar} onPerfilAtualizado={aoSalvar} />
        {mensagem && <Alerts key={mensagem.id} tipo={mensagem.tipo} descricao={mensagem.descricao}
            imagem={`/imagens_assets/${mensagem.tipo}.png`} fechar={() => setMensagemLocal(null)} />}
    </dialog>, document.body);
}
