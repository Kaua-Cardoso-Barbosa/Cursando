import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../api/client_3_17';

export default function useConsulta(caminho, token) {
  const [revisao, setRevisao] = useState(0);
  const [estado, setEstado] = useState({ carregando: true });
  const atualizar = useCallback(() => setRevisao(n => n + 1), []);
  useEffect(() => {
    let ativo = true;
    setEstado({ carregando: true });
    if (!caminho) { setEstado({ carregando: false }); return; }
    apiRequest(caminho, {}, token, 15000).then(dados => {
      if (ativo) setEstado({ dados, carregando: false });
    }).catch(erro => { if (ativo) setEstado({ erro: erro.message, carregando: false }); });
    return () => { ativo = false; };
  }, [caminho, token, revisao]);
  return { ...estado, atualizar };
}
