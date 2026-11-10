import { useState } from 'react';
import { Text, View } from 'react-native';
import useAdminDados from '../hooks/useAdminDados_39';
import useConsulta from '../hooks/useConsulta';
import { AdminBotao, AdminCampo, AdminMetricas, AdminPagina, AdminSecao, AdminSelect, AdminTabela, a } from '../components/Admin/AdminUI_39';
export default function AdminRelatoriosScreen({ token }) {
  const opcoes = useAdminDados(['/usuarios', '/relatorios/professor'], token);
  const [filtros, setFiltros] = useState({ inicio: '', fim: '', id_instrutor: '', id_curso: '' });
  const [consulta, setConsulta] = useState(null), [erroFormulario, setErroFormulario] = useState('');
  const relatorio = useConsulta(consulta, token);
  const dados = consulta ? relatorio.dados : opcoes.dados?.[1];
  const resumo = dados?.resumo || {};
  const cursos = opcoes.dados?.[1]?.cursos || [], instrutores = (opcoes.dados?.[0] || []).filter(u => Number(u.tipo_usuario ?? u.tipo) === 1);
  const mudar = (campo, valor) => setFiltros(f => ({ ...f, [campo]: valor }));
  function aplicar() {
    if ((filtros.inicio && !/^\d{4}-\d{2}-\d{2}$/.test(filtros.inicio)) || (filtros.fim && !/^\d{4}-\d{2}-\d{2}$/.test(filtros.fim)) || (filtros.inicio && filtros.fim && filtros.inicio > filtros.fim)) { setErroFormulario('Informe datas válidas em AAAA-MM-DD, com fim igual ou posterior ao início.'); return; }
    setErroFormulario('');
    const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v));
    const path = `/relatorios/professor?${params}`;
    if (consulta === path) relatorio.atualizar(); else setConsulta(path);
  }
  return <AdminPagina etiqueta="RELATÓRIOS" titulo="Relatórios da plataforma" descricao="Analise matrículas, conclusões e atividade por período, instrutor e curso." carregando={opcoes.carregando || relatorio.carregando} onRefresh={() => { opcoes.atualizar(); if (consulta) relatorio.atualizar(); }}>
    <AdminSecao titulo="Filtros do relatório"><Text style={a.texto}>O período considera a data de criação dos cursos.</Text>
      <AdminCampo label="Início do período" value={filtros.inicio} placeholder="AAAA-MM-DD" maxLength={10} onChangeText={v => mudar('inicio', v)} />
      <AdminCampo label="Fim do período" value={filtros.fim} placeholder="AAAA-MM-DD" maxLength={10} onChangeText={v => mudar('fim', v)} />
      <AdminSelect titulo="Instrutor" valor={filtros.id_instrutor} opcoes={[["", "Todos"], ...instrutores.map(i => [String(i.id), i.nome])]} onChange={v => mudar('id_instrutor', v)} />
      <AdminSelect titulo="Curso" valor={filtros.id_curso} opcoes={[["", "Todos"], ...cursos.map(c => [String(c.id_curso), `${c.curso} — ${c.instrutor}`])]} onChange={v => mudar('id_curso', v)} />
      <AdminBotao disabled={opcoes.carregando || relatorio.carregando} onPress={aplicar}>{relatorio.carregando ? 'Gerando...' : 'Aplicar filtros'}</AdminBotao>
      {!!(erroFormulario || opcoes.erro || relatorio.erro) && <Text style={a.erro}>{erroFormulario || opcoes.erro || relatorio.erro}</Text>}
      {dados && <><AdminMetricas itens={[
        ['Matrículas', resumo.alunos, 'users'], ['Cursos', resumo.cursos, 'graduation-cap'], ['Aulas concluídas', resumo.aulas_assistidas, 'play'], ['Cursos concluídos', resumo.conclusoes, 'check-circle'], ['Módulos concluídos', resumo.modulos, 'folder'], ['Horas assistidas', `${Number(resumo.horas_assistidas || 0).toFixed(2).replace('.', ',')} h`, 'clock']
      ].map(([titulo, valor, icone]) => ({ titulo, valor, icone }))} />
        <Text accessibilityRole="header" style={a.secaoTitulo}>Detalhamento por curso</Text>
        <AdminTabela colunas={['Curso', 'Instrutor', 'Matrículas', 'Aulas concluídas', 'Conclusões', 'Horas', 'Avaliação'].map(titulo => ({ titulo, largura: ['Curso', 'Instrutor'].includes(titulo) ? 210 : 135 }))} linhas={(dados.cursos || []).map(c => ({ id: c.id_curso, valores: [c.curso, c.instrutor, c.alunos, c.aulas_assistidas, c.conclusoes, Number(c.horas_assistidas || 0).toFixed(2).replace('.', ','), Number(c.avaliacao_media || 0).toFixed(2).replace('.', ',')] }))} vazio="Nenhum resultado para os filtros selecionados." />
      </>}
    </AdminSecao>
  </AdminPagina>;
}
