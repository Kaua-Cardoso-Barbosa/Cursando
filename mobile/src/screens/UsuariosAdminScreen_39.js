import { AdminBotao, AdminCampo, AdminPagina, AdminSecao, a, dataBR, dinheiro } from '../components/Admin/AdminUI_39';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import useConsulta from '../hooks/useConsulta';
import EstadoConsulta from '../components/EstadoConsulta_39';
import EditarPerfilModal from '../components/EditarPerfilModal_39';
import { apiRequest } from '../api/client_3_17';
import { useFeedback } from '../components/FeedbackProvider_39';
import { globalStyles as g } from '../styles_39';

function PerfilPrivado({ usuario, token, onPublico }) {
  const consulta = useConsulta(Number(usuario.tipo) === 2 ? `/admin/alunos/${usuario.id}/financeiro` : null, token);
  return <View style={{ gap: 14 }}><Text style={g.title}>Perfil {Number(usuario.tipo) === 1 ? 'do professor' : 'do aluno'}</Text><Text>Informações visíveis apenas ao administrador</Text>
    {[['Nome', usuario.nome], ['E-mail', usuario.email], ['CPF', usuario.cpf], ['Situação', usuario.bloqueado ? 'Bloqueado' : 'Ativo']].map(([nome, valor]) => <View key={nome}><Text style={{ fontWeight: '700' }}>{nome}</Text><Text>{valor || 'Não informado'}</Text></View>)}
    {!!usuario.identificador && <Pressable style={g.primaryButton} onPress={() => onPublico(usuario.identificador)}><Text style={g.buttonText}>Ver Perfil Público</Text></Pressable>}
    {usuario.bloqueado && <View style={{ padding: 14, backgroundColor: '#fff2f2', borderRadius: 10, gap: 8 }}><Text style={{ fontWeight: '700', color: '#842b2b' }}>Motivo do bloqueio</Text><Text>{usuario.motivo_bloqueio || 'Motivo não informado (bloqueio anterior).'}</Text></View>}
    {Number(usuario.tipo) === 2 && (!consulta.dados ? <EstadoConsulta consulta={consulta} /> : <>
      <Text style={a.secaoTitulo}>Resumo financeiro</Text>
      <View style={a.grade}>{[['Total pago', dinheiro(consulta.dados.total_pago)], ['Ticket médio mensal', dinheiro(consulta.dados.ticket_medio)], ['Faturas pagas', consulta.dados.faturas_pagas || 0], ['Em aberto', dinheiro(consulta.dados.total_aberto)], ['Aulas concluídas', consulta.dados.aulas_concluidas || 0]].map(([nome, valor]) => <View key={nome} style={[a.metrica, { width: '48%', minHeight: 126, padding: 17 }]}><Text style={a.apoio}>{nome}</Text><Text style={[a.metricaValor, { fontSize: 21 }]}>{valor}</Text></View>)}</View>
      <AdminSecao titulo="Cursos inscritos">{(consulta.dados.cursos || []).map(c => <View key={c.id} style={a.linha}><Text style={a.texto}>{c.titulo}</Text><Text style={a.apoio}>Inscrição: {dataBR(c.data_inscricao)}</Text><Text style={a.texto}>{c.progresso}% concluído</Text></View>)}{!consulta.dados.cursos?.length && <Text style={a.apoio}>Nenhum curso inscrito.</Text>}</AdminSecao>
      <AdminSecao titulo="Histórico de mensalidades">{(consulta.dados.faturas || []).map(f => <View style={a.linha} key={f.id}><Text style={a.texto}>Mensalidade #{f.id} · {f.status_label || f.status_nome}</Text><Text style={a.apoio}>{f.data_pagamento ? `Pagamento: ${dataBR(f.data_pagamento)}` : `Vencimento: ${dataBR(f.data_vencimento || f.criado_em)}`}</Text>{!!f.acesso_label && <Text style={a.apoio}>{f.acesso_label} {dataBR(f.data_expiracao)}</Text>}<Text style={a.texto}>{dinheiro(f.valor)}</Text></View>)}{!consulta.dados.faturas?.length && <Text style={a.apoio}>Nenhuma mensalidade registrada.</Text>}</AdminSecao>
    </>)}
  </View>;
}
export default function UsuariosAdminScreen({ token, onOpenProfile, usuarioAtual }) {
  const consulta = useConsulta('/usuarios', token);
  const [buscas, setBuscas] = useState({}), [editando, setEditando] = useState(null), [selecionado, setSelecionado] = useState(null);
  const [cadastrando, setCadastrando] = useState(false), [salvando, setSalvando] = useState(false);
  const { mostrarAlerta, confirmar } = useFeedback();
  const [alterando, setAlterando] = useState(false);
  async function alterarBloqueio(usuario) {
    if (alterando) return;
    const resultado = await confirmar({ titulo: usuario.bloqueado ? 'Desbloquear usuário' : 'Bloquear usuário', descricao: `${usuario.bloqueado ? 'Desbloquear' : 'Bloquear'} ${usuario.nome}?`, textoConfirmar: usuario.bloqueado ? 'Desbloquear' : 'Bloquear', ...(!usuario.bloqueado ? { campoTexto: 'Motivo do bloqueio' } : {}) });
    if (!resultado) return;
    setAlterando(true);
    try {
      await apiRequest(`/usuarios/${usuario.id}/status`, { method: 'PATCH', body: JSON.stringify({ bloqueado: !usuario.bloqueado, motivo: resultado.texto || '' }) }, token);
      consulta.atualizar(); mostrarAlerta('Usuário', usuario.bloqueado ? 'Usuário desbloqueado.' : 'Usuário bloqueado.', 'sucesso');
    } catch (erro) { mostrarAlerta('Bloqueio', erro.message, 'erro'); }
    finally { setAlterando(false); }
  }
  async function cadastrarProfessor(dados) {
    setSalvando(true);
    try {
      await apiRequest(editando ? `/usuarios/${editando.id}` : '/cadastrar_colaborador', { method: editando ? 'PUT' : 'POST', body: JSON.stringify({ ...dados, tipo: cadastrando }) }, token, 15000);
      setCadastrando(false); setEditando(null); consulta.atualizar(); mostrarAlerta('Usuário', 'Cadastro salvo com sucesso.', 'sucesso'); return true;
    } catch (erro) { mostrarAlerta('Cadastro', erro.message, 'erro'); return false; }
    finally { setSalvando(false); }
  }
  return <AdminPagina titulo="Gerenciar usuários" descricao="Pesquise alunos, professores e administradores, atualize cadastros e controle o acesso." onRefresh={consulta.atualizar} carregando={consulta.carregando}>
    {!consulta.dados && <EstadoConsulta consulta={consulta} />}
    <EditarPerfilModal aberto={cadastrando !== false || !!editando} administrativo perfil={editando || { tipo: cadastrando }} titulo={editando ? 'Editar usuário' : Number(cadastrando) === 0 ? 'Cadastrar administrador' : 'Cadastrar professor'} permitirImagem={false} onClose={() => { setCadastrando(false); setEditando(null); }} onSave={cadastrarProfessor} salvando={salvando} />
    {[[2, 'Alunos'], [1, 'Professores'], [0, 'Administradores']].map(([tipo, titulo]) => <AdminSecao key={tipo}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Text style={[a.secaoTitulo, { flex: 1 }]}>Lista de {titulo}:</Text>{tipo !== 2 && <AdminBotao accessibilityLabel={tipo === 0 ? 'Cadastrar administrador' : 'Cadastrar professor'} onPress={() => setCadastrando(tipo)}>+</AdminBotao>}</View>
      <AdminCampo label={`Pesquisar em ${titulo}`} placeholder={`Pesquisar em ${titulo}`} value={buscas[tipo] || ''} onChangeText={v => setBuscas(b => ({ ...b, [tipo]: v }))} />
      {(consulta.dados || []).filter(u => Number(u.tipo) === tipo && `${u.nome} ${u.email}`.toLocaleLowerCase().includes((buscas[tipo] || '').toLocaleLowerCase())).map(u => <View style={a.linha} key={u.id}>
        <Text style={[a.texto, { fontWeight: '700' }]}>{u.nome}</Text><Text style={a.apoio}>{u.email}</Text>
        {Number(u.id) === Number(usuarioAtual?.id_usuario ?? usuarioAtual?.id) ? <Text style={a.apoio}>Use o Perfil para editar sua conta</Text> : <View style={a.acoes}>
          {tipo !== 0 && <AdminBotao style={{ flex: 1 }} variante="secundario" onPress={() => setSelecionado(u)}>Ver perfil</AdminBotao>}
          <AdminBotao style={{ flex: 1 }} variante={u.bloqueado ? 'secundario' : 'perigo'} disabled={alterando} onPress={() => alterarBloqueio(u)}>{u.bloqueado ? 'Desbloquear' : 'Bloquear'}</AdminBotao>
          <AdminBotao style={{ flex: 1 }} onPress={() => setEditando(u)}>Editar</AdminBotao>
        </View>}
      </View>)}
      {!(consulta.dados || []).some(u => Number(u.tipo) === tipo && `${u.nome} ${u.email}`.toLocaleLowerCase().includes((buscas[tipo] || '').toLocaleLowerCase())) && <Text style={a.apoio}>Nenhum usuário encontrado.</Text>}
    </AdminSecao>)}
    <Modal visible={!!selecionado} transparent animationType="fade" onRequestClose={() => setSelecionado(null)}><View style={a.overlay}><View style={a.modal}><Pressable accessibilityLabel="Fechar perfil" onPress={() => setSelecionado(null)}><Text style={{ fontSize: 28, textAlign: 'right' }}>×</Text></Pressable><ScrollView>{selecionado && <PerfilPrivado usuario={selecionado} token={token} onPublico={id => { setSelecionado(null); onOpenProfile(id); }} />}</ScrollView></View></View></Modal>
  </AdminPagina>;
}
