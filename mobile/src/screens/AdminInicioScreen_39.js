import { Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { useState } from 'react';
import { AdminCabecalho, AdminMetricas, AdminPagina, AdminSecao, a } from '../components/Admin/AdminUI_39';

export default function AdminInicioScreen({ usuario, dashboard, carregando, onRefresh }) {
  const dados = dashboard?.metricas || dashboard || {};
  const [largura, setLargura] = useState(300);
  const valores = [dados.total_professores, dados.total_alunos, dados.aulas_publicadas, dados.cursos].map(v => Number(v || 0));
  const nomes = ['Professores', 'Alunos', 'Aulas', 'Cursos'];
  const max = Math.max(1, ...valores);
  return <AdminPagina carregando={carregando} onRefresh={onRefresh}>
    <View style={{ borderLeftWidth: 4, borderColor: '#06a663', paddingLeft: 14, paddingVertical: 2 }}><Text style={{ fontSize: 25, lineHeight: 32, fontWeight: '600', color: '#173e2c' }}>Olá {usuario?.nome}</Text><Text style={[a.apoio, { marginTop: 5 }]}>Administrador</Text></View>
    <AdminCabecalho titulo="Visão geral" descricao="Acompanhe os principais indicadores de cursos e usuários da plataforma." />
    <AdminSecao titulo="Indicadores da plataforma" style={{ paddingHorizontal: 12 }}>
      <View onLayout={e => setLargura(e.nativeEvent.layout.width)} accessibilityLabel={`Indicadores: ${nomes.map((n, i) => `${n}: ${valores[i]}`).join(', ')}`}>
        <Svg width="100%" height={260} viewBox={`0 0 ${largura} 260`}>
          {[0, 1, 2, 3, 4].map(i => <ViewLinha key={i} x={largura} y={216 - i * 48} texto={Math.round(max * i / 4)} />)}
          {valores.map((v, i) => { const passo = (largura - 42) / 4, x = 42 + i * passo; return <Rect key={i} x={x + passo * .18} y={216 - v / max * 192} width={passo * .64} height={v / max * 192} fill="#139a58" />; })}
          {nomes.map((n, i) => <SvgText key={n} x={42 + (i + .5) * (largura - 42) / 4} y={240} textAnchor="middle" fontSize={10} fill="#4c5b53">{n}</SvgText>)}
        </Svg>
      </View>
    </AdminSecao>
    <AdminMetricas itens={[
      { titulo: 'Total de professores', detalhe: 'Total real cadastrado', valor: dados.total_professores, icone: 'graduation-cap' },
      { titulo: 'Total de alunos', detalhe: 'Total real cadastrado', valor: dados.total_alunos, icone: 'user' },
      { titulo: 'Aulas publicadas', detalhe: `${dados.aulas_mes || 0} video-aulas esse mês`, valor: dados.aulas_publicadas, icone: 'play' },
      { titulo: 'Cursos', detalhe: `+${dados.cursos_mes || 0} cursos criados esse mês`, valor: dados.cursos, icone: 'folder' }
    ]} />
  </AdminPagina>;
}
function ViewLinha({ x, y, texto }) { return <><Line x1={42} x2={x} y1={y} y2={y} stroke="#e4e9e6" /><SvgText x={34} y={y + 4} textAnchor="end" fontSize={11} fill="#4c5b53">{texto}</SvgText></>; }
