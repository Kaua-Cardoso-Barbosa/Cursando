import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api/client_3_17';

// As páginas administrativas carregam seus conjuntos de dados em paralelo.
export default function useAdminDados(caminhos, token) {
  const chave = JSON.stringify(caminhos);
  const versao = useRef(0);
  const [estado, setEstado] = useState({ carregando: true });
  const atualizar = useCallback(async () => {
    const atual = ++versao.current;
    setEstado(e => ({ ...e, carregando: true, erro: null }));
    try {
      const dados = await Promise.all(JSON.parse(chave).map(path => apiRequest(path, {}, token)));
      if (atual === versao.current) setEstado({ dados, carregando: false });
      return dados;
    } catch (erro) {
      if (atual === versao.current) setEstado(e => ({ ...e, carregando: false, erro: erro.message }));
      throw erro;
    }
  }, [chave, token]);
  useEffect(() => { atualizar().catch(() => {}); return () => { versao.current++; }; }, [atualizar]);
  return { ...estado, atualizar: () => atualizar().catch(() => null) };
}
