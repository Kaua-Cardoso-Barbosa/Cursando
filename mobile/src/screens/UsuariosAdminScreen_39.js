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
      <Text style={g.title}>Resumo financeiro</Text>{[['Total pago', consulta.dados.total_pago], ['Em aberto', consulta.dados.total_aberto], ['Ticket médio', consulta.dados.ticket_medio]].map(([nome, valor]) => <Text key={nome}>{nome}: {Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>)}
      <Text>Aulas concluídas: {consulta.dados.aulas_concluidas || 0}</Text><Text style={g.title}>Cursos inscritos</Text>{(consulta.dados.cursos || []).map(c => <Text key={c.id}>{c.titulo} · {c.progresso}% concluído</Text>)}
      <Text style={g.title}>Faturas</Text>{(consulta.dados.faturas || []).map(f => <Text key={f.id}>{f.descricao || `Fatura ${f.id}`} · R$ {Number(f.valor || 0).toFixed(2)} · {f.status_nome || f.status}</Text>)}
    </>)}
  </View>;
}
export default function UsuariosAdminScreen({ token, onOpenProfile }) {
  const consulta = useConsulta('/usuarios', token);
  const [busca, setBusca] = useState(''), [tipo, setTipo] = useState(1), [selecionado, setSelecionado] = useState(null);
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
      await apiRequest('/cadastrar_colaborador', { method: 'POST', body: JSON.stringify({ ...dados, tipo: 1 }) }, token, 15000);
      setCadastrando(false); consulta.atualizar(); mostrarAlerta('Professor', 'Professor cadastrado com sucesso.', 'sucesso'); return true;
    } catch (erro) { mostrarAlerta('Cadastro', erro.message, 'erro'); return false; }
    finally { setSalvando(false); }
  }
  if (!consulta.dados) return <EstadoConsulta consulta={consulta} />;
  return <ScrollView contentContainerStyle={[g.page, { gap: 16 }]}><Text style={g.title}>Usuários</Text>
    <Pressable style={g.primaryButton} onPress={() => setCadastrando(true)}><Text style={g.buttonText}>Cadastrar professor</Text></Pressable>
    <EditarPerfilModal aberto={cadastrando} perfil={{ tipo: 1 }} titulo="Cadastrar professor" permitirImagem={false} onClose={() => setCadastrando(false)} onSave={cadastrarProfessor} salvando={salvando} />
    <TextInput placeholder="Pesquisar pelo nome" value={busca} onChangeText={setBusca} style={[g.card, { padding: 12 }]} />
    <View style={{ flexDirection: 'row', gap: 10 }}>{[[1, 'Professores'], [2, 'Alunos']].map(([id, nome]) => <Pressable key={id} accessibilityState={{ selected: tipo === id }} style={tipo === id ? g.primaryButton : g.secondaryButton} onPress={() => setTipo(id)}><Text style={tipo === id ? g.buttonText : g.secondaryText}>{nome}</Text></Pressable>)}</View>
    {consulta.dados.filter(u => Number(u.tipo) === tipo && u.nome.toLocaleLowerCase().includes(busca.toLocaleLowerCase())).map(u => <View style={[g.card, { padding: 16, gap: 12 }]} key={u.id}><Text style={{ fontWeight: '700' }}>{u.nome}</Text><Text>{u.email}</Text><Pressable style={g.secondaryButton} onPress={() => setSelecionado(u)}><Text style={g.secondaryText}>Ver perfil</Text></Pressable><Pressable disabled={alterando} style={u.bloqueado ? g.secondaryButton : g.dangerButton} onPress={() => alterarBloqueio(u)}><Text style={u.bloqueado ? g.secondaryText : g.buttonText}>{u.bloqueado ? "Desbloquear" : "Bloquear"}</Text></Pressable></View>)}
    <Modal visible={!!selecionado} transparent animationType="fade" onRequestClose={() => setSelecionado(null)}><View style={{ flex: 1, backgroundColor: '#0008', padding: 20, justifyContent: 'center' }}><View style={{ backgroundColor: 'white', borderRadius: 16, maxHeight: '90%', padding: 16 }}><Pressable accessibilityLabel="Fechar perfil" onPress={() => setSelecionado(null)}><Text style={{ fontSize: 28, textAlign: 'right' }}>×</Text></Pressable><ScrollView>{selecionado && <PerfilPrivado usuario={selecionado} token={token} onPublico={id => { setSelecionado(null); onOpenProfile(id); }} />}</ScrollView></View></View></Modal>
  </ScrollView>;
}
