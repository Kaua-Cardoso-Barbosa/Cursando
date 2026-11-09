import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../api/client_3_17';
import { useFeedback } from '../components/FeedbackProvider_39';
import HistoricoProvas, { OpcoesProva } from '../components/HistoricoProvas_20_39';
import { colors, globalStyles } from '../styles_39';

const vazia = () => ({ enunciado: '', tipo: 'objetiva', alternativas: '', resposta_esperada: '' });
export default function ProvasProfessorScreen({ curso, cursos = [], token, onBack }) {
    const { mostrarAlerta, confirmar } = useFeedback();
    const [idCurso, setIdCurso] = useState(String(curso?.id || cursos[0]?.id || ''));
    const [provas, setProvas] = useState([]);
    const [prova, setProva] = useState(null);
    const [titulo, setTitulo] = useState('');
    const [minimo, setMinimo] = useState('70');
    const [questoes, setQuestoes] = useState([vazia()]);
    const [ocupado, setOcupado] = useState(false);
    const [revisao, setRevisao] = useState(0);
    const [salvo, setSalvo] = useState('');
    const editavel = !prova || prova.estado === 'rascunho';
    const alterado = JSON.stringify({ titulo, minimo, questoes }) !== salvo;
    function novo() { setProva(null); setTitulo(''); setMinimo('70'); setQuestoes([vazia()]); }
    async function abrir(id) {
        if (!id) { novo(); return; }
        const dados = await apiRequest(`/professor/provas/${id}`, {}, token);
        setProva(dados.prova); setTitulo(dados.prova.titulo); setMinimo(String(dados.prova.nota_minima));
        const perguntas = dados.questoes.map((q) => ({ ...q, alternativas: q.alternativas.join('\n') }));
        setQuestoes(perguntas);
        setSalvo(JSON.stringify({ titulo: dados.prova.titulo, minimo: String(dados.prova.nota_minima), questoes: perguntas }));
    }
    async function carregar(preferido) {
        if (!idCurso) return;
        const dados = await apiRequest(`/professor/cursos/${idCurso}/provas`, {}, token);
        setProvas(dados.provas);
        await abrir(preferido === undefined ? (dados.provas.find((p) => p.estado === 'rascunho') || dados.provas.find((p) => p.estado === 'vigente') || dados.provas[0])?.id : preferido);
    }
    async function executar(acao) {
        setOcupado(true);
        try { await acao(); setRevisao((n) => n + 1); }
        catch (e) { mostrarAlerta('Provas', e.message, 'erro'); }
        finally { setOcupado(false); }
    }
    useEffect(() => { executar(() => carregar()); }, [idCurso, token]);
    function alterar(i, campo, valor) { setQuestoes((qs) => qs.map((q, j) => i === j ? { ...q, [campo]: valor } : q)); }
    async function mudarEstado(tipo) {
        const sim = await confirmar({ titulo: tipo === 'publicar' ? 'Publicar prova' : 'Arquivar prova', descricao: tipo === 'publicar' ? 'A versão vigente será arquivada. Todas as respostas e aprovações serão preservadas.' : 'Esta prova deixará de aceitar respostas. O histórico será preservado.', textoConfirmar: 'Confirmar', textoCancelar: 'Voltar' });
        if (sim) executar(async () => { await apiRequest(`/professor/provas/${prova.id}/${tipo}`, { method: 'PATCH' }, token); await carregar(prova.id); });
    }
    return <ScrollView contentContainerStyle={globalStyles.page}>
        <Pressable style={globalStyles.secondaryButton} onPress={onBack}><Text style={globalStyles.secondaryText}>Voltar aos cursos</Text></Pressable>
        <Text style={globalStyles.title}>Provas do curso</Text>
        <OpcoesProva titulo="Curso" valor={idCurso} opcoes={cursos.map((c) => [String(c.id), c.titulo])} onChange={(v) => { if (!ocupado) setIdCurso(v); }} />
        <View style={[globalStyles.card, styles.card]}>
            <Text>Provas publicadas são permanentes. Crie outra versão para alterar questões ou percentual de aprovação.</Text>
            <Pressable disabled={ocupado} style={globalStyles.secondaryButton} onPress={novo}><Text style={globalStyles.secondaryText}>Novo rascunho</Text></Pressable>
            {provas.map((p) => <Pressable key={p.id} disabled={ocupado} style={styles.prova} onPress={() => executar(() => abrir(p.id))}><Text style={styles.label}>{p.titulo} · v{p.versao}</Text><Text>{p.estado} · mínimo {p.nota_minima}%</Text></Pressable>)}
            <Text style={styles.label}>{prova ? `Versão ${prova.versao} · ${prova.estado}` : 'Novo rascunho'}</Text>
            <Text style={styles.label}>Título</Text><TextInput style={globalStyles.input} editable={editavel && !ocupado} maxLength={150} value={titulo} onChangeText={setTitulo} />
            <Text style={styles.label}>Percentual mínimo para aprovação (50% a 100%)</Text><TextInput style={globalStyles.input} editable={editavel && !ocupado} keyboardType="number-pad" value={minimo} onChangeText={setMinimo} />
            {questoes.map((q, i) => <View key={i} style={styles.questao}>
                <Text style={styles.label}>Questão {i + 1}</Text>
                <TextInput style={globalStyles.input} multiline editable={editavel && !ocupado} placeholder="Enunciado" value={q.enunciado} onChangeText={(v) => alterar(i, 'enunciado', v)} />
                {editavel ? <OpcoesProva titulo="Tipo" valor={q.tipo} opcoes={[["objetiva", "Objetiva"], ["dissertativa", "Dissertativa"]]} onChange={(v) => alterar(i, 'tipo', v)} /> : <Text>{q.tipo}</Text>}
                {q.tipo === 'objetiva' && <>
                    <TextInput style={globalStyles.input} multiline editable={editavel && !ocupado} placeholder="Alternativas, uma por linha" value={q.alternativas} onChangeText={(v) => { alterar(i, 'alternativas', v); alterar(i, 'resposta_esperada', ''); }} />
                    <Text>Alternativa correta:</Text>
                    {q.alternativas.split('\n').map((a) => a.trim()).filter(Boolean).map((a, j) => <Pressable key={j} disabled={!editavel || ocupado} style={styles.prova} onPress={() => alterar(i, 'resposta_esperada', a)}><Text>{q.resposta_esperada === a ? '✓ ' : '○ '}{a}</Text></Pressable>)}
                </>}
                {editavel && questoes.length > 1 && <Pressable onPress={() => setQuestoes((qs) => qs.filter((_, j) => j !== i))}><Text style={styles.erro}>Remover questão</Text></Pressable>}
            </View>)}
            {editavel ? <>
                <Pressable disabled={ocupado} style={globalStyles.secondaryButton} onPress={() => setQuestoes((qs) => [...qs, vazia()])}><Text style={globalStyles.secondaryText}>Adicionar questão</Text></Pressable>
                <Pressable disabled={ocupado || minimo === '' || !Number.isInteger(Number(minimo)) || Number(minimo) < 50 || Number(minimo) > 100} style={globalStyles.primaryButton} onPress={() => executar(async () => {
                    const d = await apiRequest(prova ? `/professor/provas/${prova.id}` : `/professor/cursos/${idCurso}/provas`, { method: prova ? 'PUT' : 'POST', body: JSON.stringify({ titulo, nota_minima: Number(minimo), questoes }) }, token);
                    await carregar(prova?.id || d.id_prova);
                })}><Text style={globalStyles.buttonText}>{ocupado ? 'Aguarde...' : 'Salvar rascunho'}</Text></Pressable>
            </> : <Pressable disabled={ocupado} style={globalStyles.secondaryButton} onPress={() => { setProva(null); setQuestoes((qs) => qs.map((q) => ({ ...q, id: undefined }))); }}><Text style={globalStyles.secondaryText}>Criar versão a partir desta</Text></Pressable>}
            {prova?.estado === 'rascunho' && <>
                <Pressable disabled={ocupado || alterado} style={globalStyles.primaryButton} onPress={() => mudarEstado('publicar')}><Text style={globalStyles.buttonText}>{alterado ? 'Salve antes de publicar' : 'Publicar versão salva'}</Text></Pressable>
                <Pressable disabled={ocupado} style={globalStyles.secondaryButton} onPress={async () => {
                    const sim = await confirmar({ titulo: 'Excluir rascunho', descricao: 'Somente este rascunho será removido.', textoConfirmar: 'Excluir', textoCancelar: 'Voltar' });
                    if (sim) executar(async () => { await apiRequest(`/professor/provas/${prova.id}`, { method: 'DELETE' }, token); await carregar(null); });
                }}><Text style={styles.erro}>Excluir rascunho</Text></Pressable>
            </>}
            {prova?.estado === 'vigente' && <Pressable disabled={ocupado} style={globalStyles.secondaryButton} onPress={() => mudarEstado('arquivar')}><Text style={globalStyles.secondaryText}>Arquivar prova</Text></Pressable>}
        </View>
        {idCurso ? <HistoricoProvas token={token} idCurso={idCurso} professor atualizar={revisao} /> : null}
    </ScrollView>;
}
const styles = StyleSheet.create({ card: { padding: 16, gap: 14, marginTop: 16 }, prova: { padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 6 }, label: { color: colors.darkGreen, fontWeight: '700' }, questao: { paddingVertical: 16, gap: 12, borderTopWidth: 1, borderColor: colors.border }, erro: { color: '#ac2027' } });
