import Abas from '../components/Abas_39';
import BotaoVoltar from '../components/BotaoVoltar_39';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import useConsulta from '../hooks/useConsulta';
import EstadoConsulta from '../components/EstadoConsulta_39';
import CursoCard from '../components/CursoCard_39';
import AvaliacoesCurso from '../components/AvaliacoesCurso_39';
import ModulosProfessorScreen from './ModulosProfessorScreen_6_18_39';
import MateriaisProfessorScreen from './MateriaisProfessorScreen_21_39';
import ProvasProfessorScreen from './ProvasProfessorScreen_20_39';
import AlunosCursoScreen from './AlunosCursoScreen_39';
import { globalStyles as g } from '../styles_39';

function AvaliacoesProfessor({ token, idCurso, onOpenProfile }) {
  const [pagina, setPagina] = useState(1);
  const consulta = useConsulta(`/professor/cursos/${idCurso}/avaliacoes?pagina=${pagina}`, token);
  if (!consulta.dados) return <EstadoConsulta consulta={consulta} />;
  return <ScrollView contentContainerStyle={[g.page, { paddingTop: 16 }]}><AvaliacoesCurso {...consulta.dados} onPagina={setPagina} onOpenProfile={onOpenProfile} /></ScrollView>;
}
export default function CursoProfessorScreen({ curso, token, onBack, onEdit, onOpenProfile, onOpenChat }) {
  const [aba, setAba] = useState('resumo');
  const consulta = useConsulta(`/professor/cursos/${curso.id}`, token);
  const botao = (texto, acao) => <Pressable style={g.secondaryButton} onPress={acao}><Text style={g.secondaryText}>{texto}</Text></Pressable>;
  return <View style={{ flex: 1 }}>
    <View style={{ padding: 16, gap: 10 }}>{<BotaoVoltar onPress={onBack}>Voltar aos cursos</BotaoVoltar>}<Text style={g.title}>{curso.titulo}</Text>
      <Abas valor={aba} onChange={setAba} rotulo="Gestão do curso" opcoes={[["resumo", "Resumo"], ["modulos", "Módulos"], ["materiais", "Complementos"], ["provas", "Provas"], ["alunos", "Alunos"], ["avaliacoes", "Avaliações"]]} />
    </View>
    {aba === 'resumo' && (!consulta.dados ? <EstadoConsulta consulta={consulta} /> : <ScrollView contentContainerStyle={[g.page, { gap: 18, paddingTop: 8 }]}>
      <CursoCard curso={consulta.dados} />
      <View style={[g.card, { padding: 16, gap: 12 }]}>{[['Professores', consulta.dados.professores.join(', ')], ['Categoria', consulta.dados.categoria], ['Tema', consulta.dados.tema], ['Situação', consulta.dados.status_nome], ['Módulos publicados', `${consulta.dados.modulos_publicados} de ${consulta.dados.total_modulos}`], ['Aulas publicadas', `${consulta.dados.aulas_publicadas} de ${consulta.dados.total_aulas}`], ['Inscritos ativos', consulta.dados.total_inscritos], ['Avaliações', `${consulta.dados.avaliacao_media}/5 · ${consulta.dados.total_avaliacoes} avaliações`]].map(([titulo, valor]) => <View key={titulo}><Text style={{ fontSize: 12, color: '#53645c' }}>{titulo}</Text><Text>{valor || 'Não definido'}</Text></View>)}</View>
      {botao('Editar curso', () => onEdit(consulta.dados))}{botao('Atualizar resumo', consulta.atualizar)}
    </ScrollView>)}
    {aba === 'modulos' && <ModulosProfessorScreen curso={curso} token={token} onBack={() => { setAba('resumo'); consulta.atualizar(); }} />}
    {aba === 'materiais' && <MateriaisProfessorScreen curso={curso} token={token} onBack={() => setAba('resumo')} />}
    {aba === 'provas' && <ProvasProfessorScreen curso={curso} token={token} onBack={() => setAba('resumo')} />}
    {aba === 'alunos' && <AlunosCursoScreen curso={curso} token={token} onOpenChat={onOpenChat} onBack={() => setAba('resumo')} />}
    {aba === 'avaliacoes' && <AvaliacoesProfessor token={token} idCurso={curso.id} onOpenProfile={onOpenProfile} />}
  </View>;
}
