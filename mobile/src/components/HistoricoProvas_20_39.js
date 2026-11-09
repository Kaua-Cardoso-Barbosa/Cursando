import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../api/client_3_17';
import { colors, globalStyles } from '../styles_39';

export const resultadoProva = (s) => ['Aguardando correção', 'Aprovado', 'Reprovado'][s] || 'Indisponível';
export const corResultado = (s) => s === 1 ? '#076438' : s === 2 ? '#ac2027' : '#68501c';
export function OpcoesProva({ titulo, valor, opcoes, onChange }) {
    return <View style={styles.grupo}><Text style={styles.label}>{titulo}</Text><View style={styles.linha}>{opcoes.map(([v, texto]) => <Pressable key={v} onPress={() => onChange(v)} style={[styles.opcao, valor === v && styles.selecionada]}><Text style={valor === v ? styles.textoSelecionado : styles.label}>{texto}</Text></Pressable>)}</View></View>;
}
export default function HistoricoProvas({ token, idCurso, professor = false, atualizar = 0 }) {
    const perfil = professor ? 'professor' : 'aluno';
    const [filtros, setFiltros] = useState({ busca: '', ordem: 'recentes', estado: 'todas', resultado: 'todos' });
    const [pagina, setPagina] = useState(1);
    const [dados, setDados] = useState({ itens: [], total: 0, paginas: 1 });
    const [detalhe, setDetalhe] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [erro, setErro] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [corrigindo, setCorrigindo] = useState(false);
    const [revisao, setRevisao] = useState(0);
    const filtro = (campo, valor) => { setFiltros((f) => ({ ...f, [campo]: valor })); setPagina(1); };
    useEffect(() => {
        let ativo = true; setOcupado(true); setErro('');
        const timer = setTimeout(() => {
            apiRequest(`/${perfil}/cursos/${idCurso}/provas/historico?${new URLSearchParams({ ...filtros, pagina })}`, {}, token)
                .then((d) => { if (ativo) setDados(d); }).catch((e) => { if (ativo) setErro(e.message); })
                .finally(() => { if (ativo) setOcupado(false); });
        }, 250);
        return () => { ativo = false; clearTimeout(timer); };
    }, [idCurso, token, perfil, pagina, filtros, atualizar, revisao]);
    useEffect(() => { setPagina(1); setDetalhe(null); setDados({ itens: [], total: 0, paginas: 1 }); }, [idCurso]);
    async function abrir(id) {
        try { const d = await apiRequest(`/${perfil}/provas/tentativas/${id}`, {}, token); setDetalhe(d); setFeedback(d.feedback || ''); }
        catch (e) { setErro(e.message); }
    }
    async function corrigir(q, correta) {
        setCorrigindo(true);
        try {
            await apiRequest(`/professor/provas/respostas/${detalhe.id}/questoes/${q.id}`, { method: 'PATCH', body: JSON.stringify({ correta, feedback }) }, token);
            await abrir(detalhe.id); setRevisao((n) => n + 1);
        } catch (e) { setErro(e.message); }
        finally { setCorrigindo(false); }
    }
    return <View style={[globalStyles.card, styles.card]}>
        <Text style={styles.titulo}>{professor ? 'Histórico de respostas do curso' : 'Meu histórico de provas'}</Text>
        {professor && <TextInput accessibilityLabel="Nome do aluno" style={globalStyles.input} placeholder="Pesquisar nome do aluno" value={filtros.busca} onChangeText={(v) => filtro('busca', v)} />}
        <OpcoesProva titulo="Ordenar" valor={filtros.ordem} opcoes={[["recentes", "Recentes"], ["nota_asc", "Menor nota"], ["nota_desc", "Maior nota"]]} onChange={(v) => filtro('ordem', v)} />
        <OpcoesProva titulo="Situação da prova" valor={filtros.estado} opcoes={[["todas", "Todas"], ["vigente", "Vigentes"], ["arquivada", "Arquivadas"]]} onChange={(v) => filtro('estado', v)} />
        <OpcoesProva titulo="Resultado" valor={filtros.resultado} opcoes={[["todos", "Todos"], ["1", "Aprovados"], ["2", "Reprovados"], ["0", "Pendentes"]]} onChange={(v) => filtro('resultado', v)} />
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
        {ocupado ? <ActivityIndicator color={colors.darkGreen} /> : <>
            <Text>{dados.total} tentativa(s) encontrada(s).</Text>
            {dados.itens.map((item) => <View key={item.id} style={styles.registro}>
                <Text style={[styles.label, { color: corResultado(item.status) }]}>{professor ? `${item.aluno} · ` : ''}{item.prova} · v{item.versao}</Text>
                <Text>Prova {item.estado_prova} · tentativa {item.tentativa}</Text>
                <Text style={{ color: corResultado(item.status) }}>{resultadoProva(item.status)}{item.status !== 0 && item.nota != null ? ` · ${item.nota}%` : ''} · mínimo {item.nota_minima}%</Text>
                <Text>Envio: {new Date(item.criado_em).toLocaleString('pt-BR')}</Text>
                <Text>Correção: {item.corrigido_em ? new Date(item.corrigido_em).toLocaleString('pt-BR') : 'Pendente'}</Text>
                <Pressable style={globalStyles.secondaryButton} onPress={() => detalhe?.id === item.id ? setDetalhe(null) : abrir(item.id)}><Text style={globalStyles.secondaryText}>{detalhe?.id === item.id ? 'Fechar detalhes' : 'Ver respostas'}</Text></Pressable>
                {detalhe?.id === item.id && <View style={styles.grupo}>
                    {detalhe.questoes.map((q, i) => <View key={q.id} style={styles.registro}>
                        <Text style={styles.label}>{i + 1}. {q.enunciado}</Text>
                        {q.alternativas?.length > 0 && <Text>Alternativas: {q.alternativas.join(' · ')}</Text>}
                        <Text>Resposta: {detalhe.respostas[String(q.id)]}</Text>
                        {professor && q.tipo === 'objetiva' && <Text>Gabarito: {q.resposta_esperada}</Text>}
                        {q.tipo === 'dissertativa' && <Text>{detalhe.correcoes_dissertativas[String(q.id)] === undefined ? 'Aguardando correção' : detalhe.correcoes_dissertativas[String(q.id)] ? 'Correta' : 'Incorreta'}</Text>}
                        {professor && detalhe.status === 0 && q.tipo === 'dissertativa' && <View style={styles.linha}>
                            <Pressable disabled={corrigindo} style={styles.opcao} onPress={() => corrigir(q, true)}><Text>Correta</Text></Pressable><Pressable disabled={corrigindo} style={styles.opcao} onPress={() => corrigir(q, false)}><Text>Incorreta</Text></Pressable>
                        </View>}
                    </View>)}
                    {professor && detalhe.status === 0 ? <TextInput style={globalStyles.input} multiline placeholder="Feedback enviado com a correção" value={feedback} onChangeText={setFeedback} /> : <Text>Feedback: {detalhe.feedback || 'Não informado.'}</Text>}
                </View>}
            </View>)}
            <View style={styles.linha}><Pressable disabled={pagina <= 1} style={styles.opcao} onPress={() => setPagina((n) => n - 1)}><Text>Anterior</Text></Pressable><Text>{pagina} / {dados.paginas}</Text><Pressable disabled={pagina >= dados.paginas} style={styles.opcao} onPress={() => setPagina((n) => n + 1)}><Text>Próxima</Text></Pressable></View>
        </>}
    </View>;
}
const styles = StyleSheet.create({
    card: { padding: 16, gap: 14, marginVertical: 14 }, titulo: { color: colors.darkGreen, fontSize: 20, fontWeight: '700' },
    grupo: { gap: 10 }, linha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    label: { fontWeight: '700', color: colors.darkGreen }, opcao: { padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 6 },
    selecionada: { backgroundColor: colors.darkGreen }, textoSelecionado: { color: colors.white }, erro: { color: '#ac2027' },
    registro: { gap: 9, paddingVertical: 14, borderTopWidth: 1, borderColor: colors.border },
});
