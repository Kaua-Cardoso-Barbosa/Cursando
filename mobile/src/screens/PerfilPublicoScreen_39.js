import Select from '../components/Select_39';
import BotaoVoltar from '../components/BotaoVoltar_39';
import { useEffect, useState } from 'react';
import { BackHandler, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { resolverUrlMidia } from '../api/client_3_17';
import useConsulta from '../hooks/useConsulta';
import EstadoConsulta from '../components/EstadoConsulta_39';
import CursoCard, { corAvaliacao } from '../components/CursoCard_39';
import CapaMidia from '../components/CapaMidia_39';
import ConquistaCurso from '../components/ConquistaCurso_39';
import EditarPerfilModal from '../components/EditarPerfilModal_39';
import Field from '../components/Field_39';
import { fonteImagemAula } from '../imagens_padrao_39';
import { colors, globalStyles as g } from '../styles_39';

export default function PerfilPublicoScreen({ identificador, token, perfil, onBack, onOpenCourse, onSave, salvando, onLogout }) {
  const [filtros, setFiltros] = useState({ busca: '', categoria: '', tema: '', avaliacao_min: '', ordem: 'recentes' });
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1), [paginaAvaliacoes, setPaginaAvaliacoes] = useState(1);
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(null), [maisAulas, setMaisAulas] = useState(false), [editar, setEditar] = useState(false);
  const params = new URLSearchParams({ ...filtros, pagina: String(pagina), pagina_avaliacoes: String(paginaAvaliacoes) });
  const consulta = useConsulta(identificador ? `/perfis/${encodeURIComponent(identificador)}?${params}` : null, token);
  useEffect(() => { const evento = BackHandler.addEventListener('hardwareBackPress', () => { if (onBack) { onBack(); return true; } return false; }); return () => evento.remove(); }, [onBack]);
  useEffect(() => { consulta.atualizar(); }, [perfil?.imagem_perfil, perfil?.nome, perfil?.identificador]);
  const mudar = (campo, valor) => { setFiltros(f => ({ ...f, [campo]: valor })); setPagina(1); };
  const botao = (texto, acao, ativo = false, disabled = false) => <Pressable disabled={disabled} onPress={acao} style={[g.secondaryButton, { marginVertical: 4, opacity: disabled ? .4 : 1 }, ativo && { backgroundColor: colors.mint }]}><Text style={g.secondaryText}>{texto}</Text></Pressable>;
  if (!consulta.dados) return <View style={{ flex: 1 }}>{onBack && <BotaoVoltar onPress={onBack} />}<EstadoConsulta consulta={consulta} /></View>;
  const dados = consulta.dados, user = dados.usuario, professor = user.tipo === 1, mostrar = filtrosVisiveis ?? professor;
  const paginacao = (atual, total, mudarPagina) => total > 1 && <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>{botao('Anterior', () => mudarPagina(atual - 1), false, atual <= 1)}<Text>{atual} / {total}</Text>{botao('Próxima', () => mudarPagina(atual + 1), false, atual >= total)}</View>;
  return <View style={{ flex: 1 }}><ScrollView contentContainerStyle={[g.page, { gap: 20 }]} refreshControl={<RefreshControl refreshing={consulta.carregando} onRefresh={consulta.atualizar} />}>
    {onBack && <BotaoVoltar onPress={onBack} />}
    <View style={[g.card, { padding: 20, gap: 12 }]}>
      {user.imagem_perfil ? <Image source={{ uri: resolverUrlMidia(user.imagem_perfil) }} style={{ width: 88, height: 88, borderRadius: 44 }} /> : <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 32, color: colors.darkGreen }}>{user.nome.slice(0, 1)}</Text></View>}
      <Text style={g.title}>{user.nome}</Text>{!!user.arroba && <Text>@{user.arroba}</Text>}<Text>{professor ? 'Professor(a)' : 'Aluno(a)'} · {dados.resumo.cursos} cursos</Text>
      {user.proprio && onSave && botao('Editar perfil', () => setEditar(true))}
    </View>
    <Text style={g.title}>{professor ? 'Cursos publicados' : 'Jornada de aprendizado'}</Text>
    {botao(mostrar ? 'Ocultar filtros' : 'Mostrar filtros', () => setFiltrosVisiveis(!mostrar))}
    {mostrar && <View style={[g.card, { padding: 14, gap: 10 }]}>
      <Field label="Pesquisar curso" value={busca} onChangeText={setBusca} onSubmitEditing={() => mudar('busca', busca)} />{botao('Pesquisar', () => mudar('busca', busca))}
      {[['categoria', 'Categoria', dados.categorias], ['tema', 'Tema', dados.temas], ['avaliacao_min', 'Avaliação mínima', [1, 2, 3, 4, 5].map(n => ({ id: n, nome: `${n} ★ ou mais` }))], ['ordem', 'Ordenar', [{ id: 'recentes', nome: 'Recentes' }, { id: 'titulo', nome: 'Título' }, { id: 'avaliacao', nome: 'Melhor avaliação' }, { id: 'inscritos', nome: 'Mais inscritos' }]]].map(([campo, titulo, opcoes]) => <Select key={campo} titulo={titulo} valor={filtros[campo]} opcoes={[...(campo === 'ordem' ? [] : [['', 'Todos']]), ...(opcoes || []).map(o => [String(o.id), o.nome])]} onChange={v => mudar(campo, v)} />)}
    </View>}
    {!dados.cursos.itens.length && <Text>Nenhum curso encontrado.</Text>}
    <View style={professor ? { gap: 18 } : { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>{dados.cursos.itens.map(c => professor ? <CursoCard key={c.id} curso={c} onOpen={onOpenCourse} /> : <ConquistaCurso key={c.id} curso={c} onOpen={onOpenCourse} />)}</View>
    {paginacao(dados.cursos.pagina, dados.cursos.paginas, setPagina)}
    {professor && <><Text style={g.title}>Aulas publicadas mais recentes</Text>{(maisAulas ? dados.aulas_recentes : dados.aulas_recentes.slice(0, 3)).map(a => <Pressable key={a.id} onPress={() => onOpenCourse?.({ id: a.id_curso, titulo: a.curso })} style={[g.card, { overflow: 'hidden' }]}><CapaMidia source={fonteImagemAula(a.thumb)} label={a.titulo} /><View style={{ padding: 14, gap: 8 }}><Text style={{ fontWeight: '700', color: colors.ink }}>{a.titulo}</Text><Text>{a.curso}</Text><Text style={{ color: colors.textMuted }}>{a.modulo || 'Sem módulo'}{a.data ? ` · ${new Date(a.data).toLocaleDateString('pt-BR')}` : ''}</Text></View></Pressable>)}{!dados.aulas_recentes.length && <Text>Nenhuma aula publicada.</Text>}{dados.aulas_recentes.length > 3 && botao(maisAulas ? 'Mostrar menos' : 'Ver mais aulas', () => setMaisAulas(!maisAulas))}</>}
    {!professor && <><Text style={g.title}>Avaliações publicadas</Text>{dados.avaliacoes.itens.map(a => <View key={a.id} style={[g.card, { padding: 16, gap: 10 }]}><Pressable onPress={() => onOpenCourse?.({ id: a.id_curso, titulo: a.curso })}><Text style={{ fontWeight: '700', color: colors.darkGreen }}>{a.curso}</Text></Pressable><Text style={{ color: corAvaliacao(a.nota) }}>{'★'.repeat(a.nota)}{'☆'.repeat(5 - a.nota)} {a.nota}/5</Text><Text>{a.comentario || 'Sem comentário escrito.'}</Text>{!!a.data && <Text>{new Date(a.data).toLocaleDateString('pt-BR')}</Text>}</View>)}{!dados.avaliacoes.itens.length && <Text>Nenhuma avaliação publicada.</Text>}{paginacao(dados.avaliacoes.pagina, dados.avaliacoes.paginas, setPaginaAvaliacoes)}</>}
    {user.proprio && onLogout && botao('Sair da conta', onLogout)}
  </ScrollView><EditarPerfilModal aberto={editar} perfil={perfil} onClose={() => setEditar(false)} salvando={salvando} onSave={async valores => { if (await onSave(valores)) { setEditar(false); consulta.atualizar(); } }} /></View>;
}
