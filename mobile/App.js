import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, View } from "react-native";
import { apiRequest, carregarSessao, limparSessao } from "./src/api/client";
import BottomNav from "./src/components/BottomNav";
import AulasAlunoScreen from "./src/screens/AulasAlunoScreen";
import CursosScreen from "./src/screens/CursosScreen";
import EditarCursoScreen from "./src/screens/EditarCursoScreen";
import EditarPerfilScreen from "./src/screens/EditarPerfilScreen";
import InicioScreen from "./src/screens/InicioScreen";
import LoginScreen from "./src/screens/LoginScreen";
import PerfilScreen from "./src/screens/PerfilScreen";
import PlayerAulaScreen from "./src/screens/PlayerAulaScreen";
import { colors, globalStyles } from "./src/styles";

export default function App() {
  const [token, setToken] = useState("");
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [cursos, setCursos] = useState([]);
  const [detalheCursoAluno, setDetalheCursoAluno] = useState(null);
  const [detalheAulaAluno, setDetalheAulaAluno] = useState(null);
  const [tab, setTab] = useState("home");
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function carregarDados(authToken = token, authUser = usuario) {
    if (!authToken) return;
    setLoading(true);
    try {
      const tipo = Number(authUser?.tipo ?? usuario?.tipo ?? 1);
      const dashboardPath = tipo === 2 ? "/aluno/dashboard" : "/professor/dashboard";
      const cursosPath = tipo === 2 ? "/aluno/cursos" : "/professor/cursos?status=todos";
      const [dashboardData, cursosData, perfilData] = await Promise.all([
        apiRequest(dashboardPath, {}, authToken),
        apiRequest(cursosPath, {}, authToken),
        apiRequest("/perfil", {}, authToken)
      ]);
      setDashboard(dashboardData);
      setCursos(Array.isArray(cursosData) ? cursosData : []);
      setPerfil(perfilData);
      setUsuario((atual) => ({ ...(atual || {}), ...perfilData, tipo }));
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function iniciar() {
      const sessao = await carregarSessao();
      if (sessao.token) {
        setToken(sessao.token);
        setUsuario(sessao.usuario);
        carregarDados(sessao.token, sessao.usuario);
      }
    }
    iniciar();
  }, []);

  async function sair() {
    await limparSessao();
    setToken("");
    setUsuario(null);
    setPerfil(null);
    setDashboard(null);
    setCursos([]);
    setDetalheCursoAluno(null);
    setDetalheAulaAluno(null);
    setTab("home");
  }

  async function abrirCursoAluno(curso) {
    setLoading(true);
    try {
      const detalhe = await apiRequest(`/aluno/cursos/${curso.id}`, {}, token);
      setDetalheCursoAluno(detalhe);
      setDetalheAulaAluno(null);
      setTab("courses");
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function abrirAulaAluno(aula) {
    setLoading(true);
    try {
      const detalhe = await apiRequest(`/aluno/aulas/${aula.id}`, {}, token);
      setDetalheAulaAluno(detalhe);
      setTab("courses");
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function marcarAulaAssistida(aula) {
    try {
      await apiRequest(`/aluno/aulas/${aula.id}/assistir`, { method: "POST" }, token);
      await carregarDados();
      if (detalheCursoAluno?.curso?.id) {
        const detalhe = await apiRequest(`/aluno/cursos/${detalheCursoAluno.curso.id}`, {}, token);
        setDetalheCursoAluno(detalhe);
      }
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  function trocarAba(key) {
    setTab(key);
    if (key !== "courses") {
      setDetalheCursoAluno(null);
      setDetalheAulaAluno(null);
      return;
    }
    setDetalheCursoAluno(null);
    setDetalheAulaAluno(null);
  }

  async function salvarCurso({ titulo, descricao, imagem }) {
    setSaving(true);
    try {
      const form = new FormData();
      form.append("titulo", titulo);
      form.append("descricao", descricao);
      if (imagem?.uri) {
        form.append("imagem", {
          uri: imagem.uri,
          name: imagem.fileName || "curso.jpg",
          type: imagem.mimeType || "image/jpeg"
        });
      }
      await apiRequest(`/professor/cursos/${editingCourse.id}`, { method: "PUT", body: form }, token);
      setEditingCourse(null);
      await carregarDados();
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setSaving(false);
    }
  }

  async function excluirCurso(curso) {
    try {
      await apiRequest(`/professor/cursos/${curso.id}`, { method: "DELETE" }, token);
      await carregarDados();
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  async function salvarPerfil(dados) {
    setSaving(true);
    try {
      const atualizado = await apiRequest("/perfil", {
        method: "PUT",
        body: JSON.stringify(dados)
      }, token);
      const novoPerfil = atualizado.usuario || dados;
      setPerfil(novoPerfil);
      setUsuario((atual) => ({ ...(atual || {}), ...novoPerfil }));
      setEditingProfile(false);
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <SafeAreaView style={globalStyles.app}>
        <StatusBar style="light" />
        <LoginScreen onLogin={(novoToken, novoUsuario) => {
          setToken(novoToken);
          setUsuario(novoUsuario);
          carregarDados(novoToken, novoUsuario);
        }} />
      </SafeAreaView>
    );
  }

  if (editingCourse) {
    return (
      <SafeAreaView style={globalStyles.app}>
        <StatusBar style="light" />
        <EditarCursoScreen curso={editingCourse} onCancel={() => setEditingCourse(null)} onSave={salvarCurso} salvando={saving} />
      </SafeAreaView>
    );
  }

  const tipoUsuario = Number(usuario?.tipo ?? perfil?.tipo ?? 1);

  if (editingProfile) {
    return (
      <SafeAreaView style={globalStyles.app}>
        <StatusBar style="dark" />
        <EditarPerfilScreen perfil={perfil} onCancel={() => setEditingProfile(false)} onSave={salvarPerfil} salvando={saving} />
        <BottomNav active="profile" onChange={(key) => {
          setEditingProfile(false);
          trocarAba(key);
        }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.app}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        {tab === "home" && (
          <InicioScreen
            usuario={usuario}
            dashboard={dashboard}
            carregando={loading}
            onRefresh={carregarDados}
            tipoUsuario={tipoUsuario}
          />
        )}
        {tab === "courses" && tipoUsuario === 1 && (
          <CursosScreen
            cursos={cursos}
            carregando={loading}
            onRefresh={carregarDados}
            onEdit={setEditingCourse}
            onDelete={excluirCurso}
            tipoUsuario={tipoUsuario}
          />
        )}
        {tab === "courses" && tipoUsuario === 2 && !detalheCursoAluno && !detalheAulaAluno && (
          <CursosScreen
            cursos={cursos}
            carregando={loading}
            onRefresh={carregarDados}
            onOpen={abrirCursoAluno}
            tipoUsuario={tipoUsuario}
          />
        )}
        {tab === "courses" && tipoUsuario === 2 && detalheCursoAluno && !detalheAulaAluno && (
          <AulasAlunoScreen
            detalhe={detalheCursoAluno}
            carregando={loading}
            onRefresh={() => abrirCursoAluno(detalheCursoAluno.curso)}
            onBack={() => setDetalheCursoAluno(null)}
            onOpenLesson={abrirAulaAluno}
          />
        )}
        {tab === "courses" && tipoUsuario === 2 && detalheAulaAluno && (
          <PlayerAulaScreen
            detalhe={detalheAulaAluno}
            onBack={() => setDetalheAulaAluno(null)}
            onOpenLesson={abrirAulaAluno}
            onFinish={marcarAulaAssistida}
          />
        )}
        {tab === "profile" && <PerfilScreen perfil={perfil} onEdit={() => setEditingProfile(true)} onLogout={sair} />}
      </View>
      <BottomNav active={tab} onChange={trocarAba} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: colors.white
  }
});
