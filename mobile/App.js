import { StatusBar } from "expo-status-bar";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Vibration, View } from "react-native";
import { apiRequest, carregarSessao, limparSessao } from "./src/api/client";
import BottomNav from "./src/components/BottomNav";
import AulasAlunoScreen from "./src/screens/AulasAlunoScreen";
import AssinaturaScreen from "./src/screens/AssinaturaScreen";
import CadastroScreen from "./src/screens/CadastroScreen";
import ChatScreen from "./src/screens/ChatScreen";
import CursosScreen from "./src/screens/CursosScreen";
import EditarCursoScreen from "./src/screens/EditarCursoScreen";
import EditarPerfilScreen from "./src/screens/EditarPerfilScreen";
import FinanceiroScreen from "./src/screens/FinanceiroScreen";
import InicioScreen from "./src/screens/InicioScreen";
import LoginScreen from "./src/screens/LoginScreen";
import PerfilScreen from "./src/screens/PerfilScreen";
import PlayerAulaScreen from "./src/screens/PlayerAulaScreen";
import { colors, globalStyles } from "./src/styles";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export default function App() {
  const [token, setToken] = useState("");
  const [usuario, setUsuario] = useState(null);
  const [assinaturaAtiva, setAssinaturaAtiva] = useState(null);
  const [validandoAssinatura, setValidandoAssinatura] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [financeiro, setFinanceiro] = useState(null);
  const [cursos, setCursos] = useState([]);
  const [detalheCursoAluno, setDetalheCursoAluno] = useState(null);
  const [detalheAulaAluno, setDetalheAulaAluno] = useState(null);
  const [tab, setTab] = useState("home");
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cadastroAberto, setCadastroAberto] = useState(false);

  async function carregarDados(authToken = token, authUser = usuario) {
    if (!authToken) return;
    setLoading(true);
    try {
      const tipo = Number(authUser?.tipo ?? usuario?.tipo ?? 1);
      const dashboardPath = tipo === 2 ? "/aluno/dashboard" : "/professor/dashboard";
      const cursosPath = tipo === 2 ? "/aluno/cursos" : "/professor/cursos?status=todos";
      const requisicoes = [
        apiRequest(dashboardPath, {}, authToken),
        apiRequest(cursosPath, {}, authToken),
        apiRequest("/perfil", {}, authToken)
      ];

      // Sprint item 8: carrega o financeiro no app tambem para alunos, nao apenas professores.
      if (tipo === 1 || tipo === 2) {
        requisicoes.push(apiRequest("/financeiro/resumo", {}, authToken));
      }

      const [dashboardData, cursosData, perfilData, financeiroData] = await Promise.all(requisicoes);
      setDashboard(dashboardData);
      setCursos(Array.isArray(cursosData) ? cursosData : []);
      setPerfil(perfilData);
      setFinanceiro((tipo === 1 || tipo === 2) ? financeiroData : null);
      setUsuario((atual) => ({ ...(atual || {}), ...perfilData, tipo }));
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmarBiometriaDisponivel() {
    const compativel = await LocalAuthentication.hasHardwareAsync();
    const cadastrado = compativel ? await LocalAuthentication.isEnrolledAsync() : false;

    if (!compativel || !cadastrado) {
      return true;
    }

    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirmar acesso ao Cursando",
      cancelLabel: "Cancelar",
      fallbackLabel: "Usar senha do aparelho"
    });

    return resultado.success === true;
  }

  async function avisarSessaoAtiva() {
    Vibration.vibrate(60);

    const permissao = await Notifications.requestPermissionsAsync();
    if (permissao.status !== "granted") {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Cursando",
        body: "Sessao iniciada com sucesso."
      },
      trigger: null
    });
  }

  // Valida a assinatura do aluno antes de carregar a área interna do aplicativo.
  async function validarAcesso(authToken, authUser) {
    const tipo = Number(authUser?.tipo ?? 1);

    if (tipo !== 2) {
      setAssinaturaAtiva(true);
      await carregarDados(authToken, authUser);
      return;
    }

    setValidandoAssinatura(true);
    try {
      const dados = await apiRequest("/assinaturas/verificar", {}, authToken);
      setAssinaturaAtiva(dados?.assinatura === true);
      await carregarDados(authToken, authUser);
    } catch {
      setAssinaturaAtiva(false);
      await carregarDados(authToken, authUser);
    } finally {
      setValidandoAssinatura(false);
    }
  }

  async function concluirAssinatura() {
    setAssinaturaAtiva(true);
    await carregarDados(token, usuario);
  }

  // Restaura a sessão persistida e revalida o acesso quando o aplicativo inicia.
  useEffect(() => {
    async function iniciar() {
      const sessao = await carregarSessao();
      if (sessao.token) {
        const autorizado = await confirmarBiometriaDisponivel();
        if (!autorizado) {
          await limparSessao();
          return;
        }

        setToken(sessao.token);
        setUsuario(sessao.usuario);
        avisarSessaoAtiva().catch(() => {});
        validarAcesso(sessao.token, sessao.usuario);
      }
    }
    iniciar();
  }, []);

  async function sair() {
    await limparSessao();
    setToken("");
    setUsuario(null);
    setAssinaturaAtiva(null);
    setPerfil(null);
    setDashboard(null);
    setFinanceiro(null);
    setCursos([]);
    setDetalheCursoAluno(null);
    setDetalheAulaAluno(null);
    setTab("home");
  }

  async function abrirCursoAluno(curso) {
    setLoading(true);
    try {
      const [detalhe, materiais] = await Promise.all([
        apiRequest(`/aluno/cursos/${curso.id}`, {}, token),
        apiRequest(`/aluno/cursos/${curso.id}/materiais`, {}, token)
      ]);
      let prova = null;
      try {
        prova = await apiRequest(`/aluno/cursos/${curso.id}/prova`, {}, token);
      } catch {
        prova = null;
      }
      setDetalheCursoAluno({ ...detalhe, materiais: Array.isArray(materiais) ? materiais : [], prova });
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
        const [detalhe, materiais] = await Promise.all([
          apiRequest(`/aluno/cursos/${detalheCursoAluno.curso.id}`, {}, token),
          apiRequest(`/aluno/cursos/${detalheCursoAluno.curso.id}/materiais`, {}, token)
        ]);
        setDetalheCursoAluno({ ...detalhe, materiais: Array.isArray(materiais) ? materiais : [] });
      }
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  async function enviarProvaAluno(respostas) {
    if (!detalheCursoAluno?.curso?.id) return;

    await apiRequest(`/aluno/cursos/${detalheCursoAluno.curso.id}/prova`, {
      method: "POST",
      body: JSON.stringify({ respostas })
    }, token);
    await abrirCursoAluno(detalheCursoAluno.curso);
  }

  async function avaliarCursoAluno(dados) {
    if (!detalheCursoAluno?.curso?.id) return;

    await apiRequest(`/aluno/cursos/${detalheCursoAluno.curso.id}/avaliacoes`, {
      method: "POST",
      body: JSON.stringify(dados)
    }, token);
    Alert.alert("Avaliação", "Avaliação enviada.");
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
    if (cadastroAberto) {
      return (
        <SafeAreaView style={[globalStyles.app, styles.loginApp]}>
          <StatusBar style="light" />
          <CadastroScreen onBack={() => setCadastroAberto(false)} />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={[globalStyles.app, styles.loginApp]}>
        <StatusBar style="light" />
        <LoginScreen onLogin={(novoToken, novoUsuario) => {
          // A tela de login delega ao App a autenticacao global: atualizar estes
          // estados troca a interface para a area interna e valida o acesso do perfil.
          setToken(novoToken);
          setUsuario(novoUsuario);
          setAssinaturaAtiva(null);
          avisarSessaoAtiva().catch(() => {});
          validarAcesso(novoToken, novoUsuario);
        }} onSignup={() => setCadastroAberto(true)} />
      </SafeAreaView>
    );
  }

  const tipoUsuario = Number(usuario?.tipo ?? perfil?.tipo ?? 1);

  if (tipoUsuario === 2 && assinaturaAtiva === null && validandoAssinatura) {
    return (
      <SafeAreaView style={[globalStyles.app, styles.loading]}>
        <ActivityIndicator size="large" color={colors.green} />
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

  if (editingProfile) {
    return (
      <SafeAreaView style={globalStyles.app}>
        <StatusBar style="dark" />
        <EditarPerfilScreen perfil={perfil} onCancel={() => setEditingProfile(false)} onSave={salvarPerfil} salvando={saving} />
        <BottomNav active="profile" tipoUsuario={tipoUsuario} onChange={(key) => {
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
            onSubmitExam={enviarProvaAluno}
            onReview={avaliarCursoAluno}
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
        {tab === "chat" && (
          <ChatScreen
            token={token}
            tipoUsuario={tipoUsuario}
            cursos={cursos}
            carregando={loading}
            onRefresh={carregarDados}
          />
        )}
        {tab === "finance" && (tipoUsuario === 1 || tipoUsuario === 2) && (
          <FinanceiroScreen
            financeiro={financeiro}
            carregando={loading}
            onRefresh={carregarDados}
            token={token}
            tipoUsuario={tipoUsuario}
          />
        )}
      </View>
      <BottomNav active={tab} onChange={trocarAba} tipoUsuario={tipoUsuario} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginApp: {
    paddingBottom: 0
  },
  content: {
    flex: 1,
    backgroundColor: colors.white
  }
});
