import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { apiRequest } from '../api/client_3_17';
import { AdminBotao, AdminCampo, AdminPagina, AdminSecao, AdminSelect, AdminTabela, a } from '../components/Admin/AdminUI_39';
import { alteracoesLog, tipoAcaoLog, objetoLog } from '../components/Admin/logsUtils_39';
const perfis = [['0', 'Administradores'], ['1', 'Professores'], ['2', 'Alunos']];
const eventos = {
  0: [['cadastro_professor', 'Cadastro de professor'], ['cadastro_aluno', 'Cadastro de aluno'], ['alterar_usuario', 'Alteração de conta'], ['registrar_custo', 'Registro de despesa'], ['alterar_configuracao', 'Alteração financeira'], ['aprovar_saque', 'Análise de saque']],
  1: [['criar_curso', 'Criação de curso'], ['editar_curso', 'Alteração de curso'], ['excluir_curso', 'Exclusão de curso'], ['criar_aula', 'Criação de aula'], ['editar_aula', 'Alteração de aula'], ['excluir_aula', 'Exclusão de aula'], ['criar_modulo', 'Criação de módulo'], ['criar_material', 'Inclusão de material'], ['criar_prova', 'Criação de prova'], ['corrigir_prova', 'Correção de prova'], ['solicitar_saque', 'Solicitação de saque'], ['mensagem_chat', 'Envio de mensagem']],
  2: [['inscricao_curso', 'Matrícula em curso'], ['assinar', 'Assinatura'], ['assistir_aula', 'Aula assistida'], ['avaliar_curso', 'Avaliação de curso'], ['enviar_prova', 'Envio de prova'], ['mensagem_chat', 'Envio de mensagem']]
};
const dataHora = v => v && !Number.isNaN(new Date(v).getTime()) ? new Date(v).toLocaleString('pt-BR') : 'Não informado';
export default function AdminAtividades({ token }) {
  const [filtros, setFiltros] = useState({ tipo: '0', busca: '', evento: '', inicio: '', fim: '' });
  const [logs, setLogs] = useState([]), [aberto, setAberto] = useState(null), [tecnico, setTecnico] = useState(null);
  const [carregando, setCarregando] = useState(false), [mais, setMais] = useState(false), [erro, setErro] = useState('');
  const versao = useRef(0);
  const carregar = useCallback(async (offset = 0) => {
    const atual = ++versao.current;
    setCarregando(true); setErro('');
    try {
      const params = new URLSearchParams({ ...filtros, limite: '100', offset: String(offset) });
      const dados = await apiRequest(`/admin/logs-gravacao?${params}`, {}, token);
      if (atual !== versao.current) return;
      setLogs(l => offset ? [...l, ...dados.slice(0, 100)] : dados.slice(0, 100)); setMais(dados.length > 100);
    } catch (e) { if (atual === versao.current) setErro(e.message); }
    finally { if (atual === versao.current) setCarregando(false); }
  }, [filtros, token]);
  useEffect(() => { setLogs([]); setAberto(null); const timer = setTimeout(() => carregar(), 250); return () => { clearTimeout(timer); versao.current++; }; }, [carregar]);
  const mudar = (campo, valor) => setFiltros(f => ({ ...f, [campo]: valor }));
  return <AdminPagina etiqueta="AUDITORIA" titulo="Atividade do sistema" descricao="Consulte eventos e filtre registros para acompanhar as operações da plataforma." carregando={carregando} onRefresh={() => carregar()}>
    <AdminSecao titulo="Histórico de atividades">
      <View style={a.acoes}>{perfis.map(([id, nome]) => <AdminBotao key={id} variante={filtros.tipo === id ? 'primario' : 'secundario'} onPress={() => setFiltros(f => ({ ...f, tipo: id, evento: '' }))}>{nome}</AdminBotao>)}</View>
      <AdminCampo label="Buscar por nome ou e-mail" value={filtros.busca} onChangeText={v => mudar('busca', v)} />
      <AdminSelect titulo="Atividade" valor={filtros.evento} opcoes={[["", "Todas as atividades"], ...eventos[filtros.tipo]]} onChange={v => mudar('evento', v)} />
      <AdminCampo label="Data inicial" placeholder="AAAA-MM-DD" maxLength={10} value={filtros.inicio} onChangeText={v => mudar('inicio', v)} /><AdminCampo label="Data final" placeholder="AAAA-MM-DD" maxLength={10} value={filtros.fim} onChangeText={v => mudar('fim', v)} />
      {!!erro && <Text style={a.erro}>{erro}</Text>}{!carregando && !logs.length && <Text style={a.texto}>Nenhuma atividade registrada.</Text>}
      {logs.map(log => { const campos = alteracoesLog(log), ator = log.nome || (log.id_usuario ? `Usuário #${log.id_usuario}` : 'Operação direta no banco'); return <View key={log.id} style={{ borderWidth: 1, borderColor: '#dfe9e3', borderRadius: 12, overflow: 'hidden' }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: aberto === log.id }} onPress={() => setAberto(aberto === log.id ? null : log.id)} style={{ padding: 16, gap: 8 }}>
          <Text style={[a.texto, { fontWeight: '700' }]}>{tipoAcaoLog(log.acao)} · {objetoLog(log)}</Text><Text style={a.apoio}>{dataHora(log.criado_em)}</Text><Text style={a.texto}>{ator} · {['Administrador', 'Professor', 'Aluno'][log.tipo_usuario] || ''}</Text>
          {!!campos.length && <Text style={a.apoio}>Campo: {campos[0].rotulo} · Antes: {campos[0].antes} · Depois: {campos[0].depois}{campos.length > 1 ? ` · mais ${campos.length - 1} campo(s)` : ''}</Text>}
          <Text style={a.apoio}>{aberto === log.id ? 'Ocultar detalhes' : 'Ver detalhes e valores alterados'}</Text>
        </Pressable>
        {aberto === log.id && <View style={{ padding: 18, gap: 12, backgroundColor: '#f4f8f6' }}>
          {[['Quem alterou', ator], ['Quando alterou', dataHora(log.criado_em)], ['Tipo de usuário', ['Administrador', 'Professor', 'Aluno'][log.tipo_usuario]], ['Registro afetado', objetoLog(log)], ['Ação realizada', tipoAcaoLog(log.acao)], ['O que foi alterado', campos.map(c => c.rotulo).join(', ') || 'Campos não registrados'], ['Conta utilizada', log.email], ['Curso relacionado', log.contexto?.curso], ['Prova relacionada', log.contexto?.prova], ['Professor relacionado', log.contexto?.professor?.nome]].filter(([, v]) => v).map(([t, v]) => <View key={t}><Text style={a.label}>{t}:</Text><Text selectable style={a.texto}>{v}</Text></View>)}
          <Text style={a.secaoTitulo}>Antes e depois de cada campo</Text><AdminTabela colunas={['Campo alterado', 'Valor anterior', 'Novo valor'].map(titulo => ({ titulo, largura: 180 }))} linhas={campos.map(c => ({ id: c.campo, valores: [c.rotulo, c.antes, c.depois] }))} vazio="Valores não registrados para esta atividade." />
          <AdminBotao variante="secundario" onPress={() => setTecnico(tecnico === log.id ? null : log.id)}>Dados técnicos do registro</AdminBotao>
          {tecnico === log.id && [['Origem', log.origem], ['Registro', log.id_registro], ['Rota', `${log.metodo || ''} ${log.rota || ''}`], ['IP', log.ip], ['ID da requisição', log.request_id]].map(([t, v]) => <Text key={t} selectable style={a.apoio}>{t}: {v || 'Não informado'}</Text>)}
        </View>}
      </View>; })}
      {(mais || erro) && <AdminBotao disabled={carregando} onPress={() => carregar(erro ? 0 : logs.length)}>{carregando ? 'Carregando...' : erro ? 'Tentar novamente' : 'Carregar mais registros'}</AdminBotao>}
    </AdminSecao>
  </AdminPagina>;
}
