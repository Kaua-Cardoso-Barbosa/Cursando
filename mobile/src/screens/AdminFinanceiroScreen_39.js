import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { apiRequest } from '../api/client_3_17';
import useAdminDados from '../hooks/useAdminDados_39';
import { useFeedback } from '../components/FeedbackProvider_39';
import { AdminBotao, AdminCampo, AdminMetricas, AdminPagina, AdminSecao, AdminSelect, AdminTabela, a, dataBR, dinheiro } from '../components/Admin/AdminUI_39';

const filtrosVazios = { tipo: '', categoria: '', inicio: '', fim: '', status: '' };
const custoVazio = { descricao: '', id_categoria: '', valor: '', data_custo: '', data_inicio: '', data_fim: '' };
const numero = v => Number(String(v).replace(',', '.'));
const dataValida = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(`${v}T12:00:00`).toISOString().slice(0, 10) === v;
export default function AdminFinanceiroScreen({ token }) {
  const consulta = useAdminDados(['/financeiro/resumo', '/admin/categorias-custo', '/admin/financeiro/transacoes', '/admin/saques'], token);
  const [financeiro = {}, categorias = [], transacoes = [], saques = []] = consulta.dados || [];
  const [percentual, setPercentual] = useState(''), [categoria, setCategoria] = useState('');
  const [unico, setUnico] = useState({ ...custoVazio }), [mensal, setMensal] = useState({ ...custoVazio });
  const [analises, setAnalises] = useState({}), [filtros, setFiltros] = useState(filtrosVazios), [ocupado, setOcupado] = useState(false);
  const { mostrarAlerta, confirmar } = useFeedback();
  useEffect(() => { if (consulta.dados) setPercentual(String(financeiro.percentual_instrutores ?? '')); }, [financeiro.percentual_instrutores, !!consulta.dados]);
  async function executar(path, method, body, concluido) {
    if (ocupado) return;
    setOcupado(true);
    try {
      const dados = await apiRequest(path, { method, body: JSON.stringify(body) }, token, 20000, false);
      concluido?.();
      const atualizado = await consulta.atualizar();
      mostrarAlerta('Financeiro', atualizado ? dados?.mensagem?.descricao || 'Dados atualizados com sucesso.' : 'Operação salva. Não foi possível atualizar a listagem; atualize a página.', atualizado ? 'sucesso' : 'aviso');
    } catch (erro) { mostrarAlerta('Financeiro', erro.message, 'erro'); }
    finally { setOcupado(false); }
  }
  async function analisar(saque, acao) {
    const campo = acao === 'pago' ? 'comprovante' : 'motivo', texto = (analises[saque.id]?.[campo] || '').trim();
    if (texto.length < 5) { mostrarAlerta('Pagamento', acao === 'pago' ? 'Informe uma referência de pagamento com pelo menos 5 caracteres.' : 'Informe um motivo de recusa com pelo menos 5 caracteres.', 'erro'); return; }
    const sim = await confirmar({ titulo: acao === 'pago' ? 'Confirmar pagamento ao professor' : 'Recusar solicitação', descricao: acao === 'pago' ? `Confirme somente após transferir ${dinheiro(saque.valor)} para ${saque.professor}. Esta ação apenas registra o pagamento já realizado.` : `Recusar o pedido de ${saque.professor}?`, textoConfirmar: 'Confirmar' });
    if (sim) executar(`/admin/saques/${saque.id}`, 'PATCH', { acao, [campo]: texto });
  }
  function cadastrar(tipo) {
    const form = tipo === 'UNICO' ? unico : mensal;
    if (!form.descricao.trim() || !form.id_categoria || !Number.isFinite(numero(form.valor)) || numero(form.valor) <= 0 || (tipo === 'UNICO' ? !dataValida(form.data_custo) : !dataValida(form.data_inicio) || !dataValida(form.data_fim) || form.data_fim < form.data_inicio)) {
      mostrarAlerta('Custo', 'Preencha descrição, categoria, valor positivo e datas válidas (AAAA-MM-DD). O fim deve ser igual ou posterior ao início.', 'erro'); return;
    }
    const datas = tipo === 'UNICO' ? { data_custo: form.data_custo } : { data_inicio: form.data_inicio, data_fim: form.data_fim };
    executar('/admin/custos-plataforma', 'POST', { descricao: form.descricao.trim(), id_categoria: form.id_categoria, valor: numero(form.valor), tipo_custo: tipo, ...datas }, () => (tipo === 'UNICO' ? setUnico : setMensal)({ ...custoVazio }));
  }
  const filtro = (campo, valor) => setFiltros(f => ({ ...f, [campo]: valor }));
  const filtradas = transacoes.filter(t => (!filtros.tipo || t.tipo === filtros.tipo) && (!filtros.categoria || t.categoria === filtros.categoria) && (!filtros.status || t.status === filtros.status) && (!filtros.inicio || (t.data || '').slice(0, 10) >= filtros.inicio) && (!filtros.fim || (t.data || '').slice(0, 10) <= filtros.fim));
  return <AdminPagina etiqueta="FINANCEIRO" titulo="Visão financeira" descricao="Acompanhe arrecadação, repasses, custos e saldo da plataforma." carregando={consulta.carregando} onRefresh={consulta.atualizar}>
    {consulta.erro && <Text style={a.erro}>{consulta.erro}</Text>}
    {!consulta.dados ? <AdminBotao onPress={consulta.atualizar} disabled={consulta.carregando}>{consulta.carregando ? 'Carregando...' : 'Tentar novamente'}</AdminBotao> : <>
      <AdminMetricas itens={[
        ...[['Assinaturas pagas (total)', 'total_arrecadado', 'Soma das mensalidades confirmadas'], ['Professores pagos', 'total_repassado', 'Pagamentos confirmados pelo administrador'], ['Total do Revenue Pool (estimado)', 'total_repassado_estimado', 'Percentual aplicado sobre mensalidades pagas'], ['Despesas cadastradas', 'custos', 'Total de despesas registradas'], ['Disponível para saque (admin)', 'disponivel_saque_admin', 'Receita paga menos comissão dos instrutores e despesas'], ['Ticket médio por aluno', 'ticket_medio_aluno', `${financeiro.alunos_pagantes || 0} alunos com mensalidade paga`]].map(([titulo, chave, detalhe]) => ({ titulo, valor: dinheiro(financeiro[chave]), detalhe })),
        { titulo: 'Saúde financeira', valor: `${numero(financeiro.margem_caixa_percentual || 0).toFixed(2).replace('.', ',')}%`, detalhe: 'Margem histórica estimada após pool e custos', children: <Text style={a.apoio}>(Receita − reserva dos instrutores − custos) ÷ receita × 100{Number(financeiro.total_arrecadado) > 0 ? `\n(${dinheiro(financeiro.total_arrecadado)} − ${dinheiro(financeiro.total_repassado_estimado)} − ${dinheiro(financeiro.custos)}) ÷ ${dinheiro(financeiro.total_arrecadado)} × 100` : '\nSem receita, a margem é exibida como 0%.'}</Text> },
        { titulo: 'Pool dos instrutores', icone: 'graduation-cap', detalhe: 'Percentual da receita', valor: `${numero(financeiro.percentual_instrutores || 0).toFixed(2).replace('.', ',')}%`, children: <><AdminCampo label="Ajustar percentual" value={percentual} onChangeText={setPercentual} keyboardType="decimal-pad" /><AdminBotao disabled={ocupado} onPress={() => { const v = numero(percentual); if (!percentual.trim() || !Number.isFinite(v) || v < 0 || v > 100) { mostrarAlerta('Percentual', 'Informe um percentual entre 0 e 100.', 'erro'); return; } executar('/admin/financeiro/config', 'PATCH', { percentual_instrutores: v }); }}>Salvar percentual</AdminBotao></> }
      ]} />
      <AdminSecao titulo="Pagamentos aos professores"><Text style={a.apoio}>Confira a chave Pix e o valor. Faça o pagamento fora do Cursando e registre a referência somente depois de confirmar a transferência.</Text>
        {saques.map(saque => <View key={saque.id} style={[a.secao, { padding: 18 }]}><Text style={a.secaoTitulo}>{saque.professor}</Text><Text style={a.apoio}>Pedido #{saque.id} · {dataBR(saque.criado_em)}</Text><Text style={a.metricaValor}>{dinheiro(saque.valor)}</Text><Text style={a.texto}>Situação: {saque.status_nome}</Text><Text selectable style={a.texto}>Chave Pix: {saque.chave_pix || 'Não informada'}</Text>
          {Number(saque.status) === 1 && <Text style={a.texto}>Referência do pagamento: {saque.comprovante}</Text>}{Number(saque.status) === 2 && <Text style={a.texto}>Motivo da recusa: {saque.motivo_recusa}</Text>}
          {Number(saque.status) === 0 && <><AdminCampo label="Referência ou número do comprovante" placeholder="Informe após realizar o pagamento" maxLength={500} value={analises[saque.id]?.comprovante || ''} onChangeText={v => setAnalises(a => ({ ...a, [saque.id]: { ...a[saque.id], comprovante: v } }))} /><AdminBotao disabled={ocupado || !saque.chave_pix} onPress={() => analisar(saque, 'pago')}>Confirmar como pago</AdminBotao><AdminCampo label="Motivo da recusa" placeholder="Explique ao professor" maxLength={500} value={analises[saque.id]?.motivo || ''} onChangeText={v => setAnalises(a => ({ ...a, [saque.id]: { ...a[saque.id], motivo: v } }))} /><AdminBotao variante="perigo" disabled={ocupado} onPress={() => analisar(saque, 'recusado')}>Recusar solicitação</AdminBotao></>}
        </View>)}{!saques.length && <Text style={a.texto}>Nenhuma solicitação de pagamento registrada.</Text>}
      </AdminSecao>
      <AdminSecao titulo="Ticket por aluno"><AdminTabela colunas={['Aluno', 'Mensalidades pagas', 'Total pago', 'Média por mensalidade'].map(titulo => ({ titulo, largura: titulo === 'Aluno' ? 220 : 170 }))} linhas={(financeiro.ticket_alunos || []).map(aluno => ({ id: aluno.id_usuario, valores: [`${aluno.nome}\n${aluno.email}`, aluno.faturas_pagas, dinheiro(aluno.total_pago), dinheiro(aluno.ticket_medio)] }))} vazio={financeiro.total_alunos ? 'Nenhuma mensalidade paga encontrada para os alunos.' : 'Nenhum aluno cadastrado.'} /></AdminSecao>
      {[['UNICO', 'Pagamento Único', unico, setUnico], ['MENSAL', 'Pagamento mensal', mensal, setMensal]].map(([tipo, titulo, form, setForm]) => <AdminSecao key={tipo} titulo={titulo}>
        {tipo === 'MENSAL' && <Text style={a.apoio}>O valor será lançado em cada mês entre as datas escolhidas.</Text>}
        <AdminCampo label="Descrição" maxLength={200} value={form.descricao} onChangeText={v => setForm(f => ({ ...f, descricao: v }))} />
        <AdminSelect titulo="Categoria" valor={form.id_categoria} opcoes={[["", "Selecione"], ...categorias.map(c => [String(c.id), c.nome])]} onChange={v => setForm(f => ({ ...f, id_categoria: v }))} />
        <AdminCampo label={tipo === 'MENSAL' ? 'Valor mensal' : 'Valor'} keyboardType="decimal-pad" value={form.valor} onChangeText={v => setForm(f => ({ ...f, valor: v }))} />
        {(tipo === 'UNICO' ? [['data_custo', 'Data do pagamento']] : [['data_inicio', 'Data de início'], ['data_fim', 'Data de fim']]).map(([campo, label]) => <AdminCampo key={campo} label={label} placeholder="AAAA-MM-DD" maxLength={10} value={form[campo]} onChangeText={v => setForm(f => ({ ...f, [campo]: v }))} />)}
        <AdminBotao disabled={ocupado} onPress={() => cadastrar(tipo)}>{tipo === 'MENSAL' ? 'Cadastrar custo mensal' : 'Cadastrar pagamento único'}</AdminBotao>
      </AdminSecao>)}
      <AdminSecao titulo="Cadastrar categoria de custo"><AdminCampo label="Nome da categoria" maxLength={80} value={categoria} onChangeText={setCategoria} /><AdminBotao disabled={ocupado || !categoria.trim()} onPress={() => executar('/admin/categorias-custo', 'POST', { nome: categoria.trim() }, () => setCategoria(''))}>Cadastrar categoria</AdminBotao><Text style={a.apoio}>{categorias.length} categorias disponíveis para selecionar.</Text></AdminSecao>
      <AdminSecao titulo="Transações financeiras">
        <AdminSelect titulo="Tipo" valor={filtros.tipo} onChange={v => filtro('tipo', v)} opcoes={[["", "Todos"], ...['Assinatura', 'Despesa mensal', 'Pagamento Único', 'Pagamento ao professor'].map(v => [v, v])]} />
        <AdminSelect titulo="Categoria" valor={filtros.categoria} onChange={v => filtro('categoria', v)} opcoes={[["", "Todas"], ...categorias.map(c => [c.nome, c.nome])]} />
        <AdminCampo label="Data inicial" placeholder="AAAA-MM-DD" value={filtros.inicio} maxLength={10} onChangeText={v => filtro('inicio', v)} /><AdminCampo label="Data final" placeholder="AAAA-MM-DD" value={filtros.fim} maxLength={10} onChangeText={v => filtro('fim', v)} />
        <AdminSelect titulo="Status" valor={filtros.status} onChange={v => filtro('status', v)} opcoes={[["", "Todos"], ...['Paga', 'Pendente', 'Registrada', 'Programada', 'Concluído', 'Solicitado', 'Recusado'].map(v => [v, v])]} />
        <AdminBotao variante="secundario" onPress={() => setFiltros(filtrosVazios)}>Limpar filtros</AdminBotao>
        <AdminTabela colunas={['Data', 'Tipo', 'Categoria', 'Descrição', 'Status', 'Valor'].map(titulo => ({ titulo, largura: titulo === 'Descrição' ? 230 : 145 }))} linhas={filtradas.map(t => ({ id: t.id, valores: [dataBR(t.data), t.tipo, t.categoria || '—', t.descricao, t.status, <Text style={[a.texto, { color: t.direcao === 'saida' ? '#b33b3b' : '#087044' }]}>{t.direcao === 'saida' ? '− ' : t.direcao === 'entrada' ? '+ ' : ''}{dinheiro(t.valor)}</Text>] }))} vazio="Nenhuma transação encontrada para os filtros selecionados." />
      </AdminSecao>
    </>}
  </AdminPagina>;
}
