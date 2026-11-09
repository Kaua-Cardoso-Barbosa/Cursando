import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { apiRequest } from '../api/client_3_17';
import HistoricoProvas, { OpcoesProva } from '../components/HistoricoProvas_20_39';
import { globalStyles } from '../styles_39';

export default function HistoricoProvasAlunoScreen({ token, onBack }) {
    const [cursos, setCursos] = useState([]);
    const [selecionado, setSelecionado] = useState('');
    const [erro, setErro] = useState('');
    useEffect(() => {
        let ativo = true;
        apiRequest('/aluno/provas/cursos', {}, token)
            .then((d) => { if (ativo) { setCursos(d.cursos); setSelecionado(String(d.cursos[0]?.id || '')); } })
            .catch((e) => { if (ativo) setErro(e.message); });
        return () => { ativo = false; };
    }, [token]);
    return <ScrollView contentContainerStyle={globalStyles.page}>
        <Pressable style={globalStyles.secondaryButton} onPress={onBack}><Text style={globalStyles.secondaryText}>Voltar</Text></Pressable>
        <Text style={globalStyles.title}>Meu histórico de provas</Text><Text style={globalStyles.eyebrow}>Inclui provas arquivadas. A consulta permanece disponível com a assinatura vencida.</Text>
        {erro ? <Text>{erro}</Text> : null}
        <OpcoesProva titulo="Curso" valor={selecionado} opcoes={cursos.map((c) => [String(c.id), c.titulo])} onChange={setSelecionado} />
        {selecionado ? <HistoricoProvas key={selecionado} token={token} idCurso={selecionado} /> : <Text>Nenhum curso vinculado à sua conta.</Text>}
    </ScrollView>;
}
