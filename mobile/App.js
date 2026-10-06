import { StatusBar } from "expo-status-bar";
import { isRunningInExpoGo } from "expo";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Pressable, SafeAreaView, StyleSheet, Text, Vibration, View } from "react-native";
import { apiRequest, carregarSessao, getApiBaseUrl, limparSessao, salvarSessao } from "./src/api/client";
import BottomNav from "./src/components/BottomNav";
import AulasAlunoScreen from "./src/screens/AulasAlunoScreen";
import AssinaturaScreen from "./src/screens/AssinaturaScreen";
import CadastroScreen from "./src/screens/CadastroScreen";
import ChatScreen from "./src/screens/ChatScreen";
import CursosScreen from "./src/screens/CursosScreen";
import EditarCursoScreen from "./src/screens/EditarCursoScreen";
import EditarPerfilScreen from "./src/screens/EditarPerfilScreen";
import ModulosProfessorScreen from "./src/screens/ModulosProfessorScreen";
import FinanceiroScreen from "./src/screens/FinanceiroScreen";
import InicioScreen from "./src/screens/InicioScreen";
import LoginScreen from "./src/screens/LoginScreen";
import PerfilScreen from "./src/screens/PerfilScreen";
import PlayerAulaScreen from "./src/screens/PlayerAulaScreen";
import VerificarEmailScreen from "./src/screens/VerificarEmailScreen";
import { colors, globalStyles } from "./src/styles";

let notificationHandlerConfigured = false;

export default function App() {
  const [token, setToken] = useState("");
  const sincronizandoApp = useRef(false);
  const [usuario, setUsuario] = useState(null);
  const [assinaturaAtiva, setAssinaturaAtiva] = useState(null);
  const [validandoAssinatura, setValidandoAssinatura] = useState(false);
  const [erroSincronizacao, setErroSincronizacao] = useState("");
  const [perfil, setPerfil] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [financeiro, setFinanceiro] = useState(null);
  const [cursos, setCursos] = useState([]);
  const [detalheCursoAluno, setDetalheCursoAluno] = useState(null);
  const [detalheAulaAluno, setDetalheAulaAluno] = useState(null);
  const [tab, setTab] = useState("home");
  const [editingCourse, setEditingCourse] = useState(null);
  // Sprint item 6: abre o gerenciamento de módulos e aulas para o curso escolhido.
  const [managingCourse, setManagingCourse] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Sprint item 1: controla o formulário de cadastro e a verificação do aluno antes do pagamento.
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [emailPendente, setEmailPendente] = useState("");
  const [codigoEmailEnviado, setCodigoEmailEnviado] = useState(null);

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
      const usuarioAtualizado = { ...(authUser || {}), ...perfilData, tipo };
      setUsuario(usuarioAtualizado);
      // Sprint item 3: persiste no app o mesmo perfil atualizado que o site acabou de ler do backend.
      await salvarSessao(authToken, usuarioAtualizado);
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

    // Expo Go no Android não oferece suporte completo a notificações remotas e
    // o módulo registra o listener de push assim que é importado. Adie a carga
    // até builds nativas para evitar o erro durante a inicialização no Expo Go.
    if (isRunningInExpoGo()) return;

    const Notifications = await import("expo-notifications");
    if (!notificationHandlerConfigured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true
        })
      });
      notificationHandlerConfigured = true;
    }

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
    setErroSincronizacao("");

    if (tipo !== 2) {
      setAssinaturaAtiva(true);
      await carregarDados(authToken, authUser);
      return true;
    }

    // Sprint item 3: distingue falta de assinatura de falha de rede para manter os dados dos dois clientes coerentes.
    setValidandoAssinatura(true);
    setAssinaturaAtiva(null);
    try {
      const dados = await apiRequest("/assinaturas/verificar", {}, authToken);
      const ativa = dados?.assinatura === true;
      setAssinaturaAtiva(ativa);
      if (ativa) {
        await carregarDados(authToken, authUser);
      } else {
        setDashboard(null);
        setCursos([]);
        setFinanceiro(null);
      }
      return ativa;
    } catch (error) {
      if (error?.status === 403 && error?.dados?.assinatura === false) {
        setAssinaturaAtiva(false);
        setDashboard(null);
        setCursos([]);
        setFinanceiro(null);
        return false;
      }

      setErroSincronizacao(error?.message || "Nao foi possivel atualizar seu acesso.");
      return null;
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

  useEffect(() => {
    if (!token) return undefined;

    const assinaturaCursoId = detalheCursoAluno?.curso?.id;
    const aulaId = detalheAulaAluno?.aula?.id;
    const inscricao = AppState.addEventListener("change", async (estado) => {
      if (estado !== "active" || sincronizandoApp.current) return;
      sincronizandoApp.current = true;

      try {
        // Sprint item 3: ao voltar ao app, revalida acesso e busca no servidor os dados alterados no site.
        const acessoAtivo = await validarAcesso(token, usuario);
        if (!acessoAtivo) return;

        if (aulaId) {
          await abrirAulaAluno({ id: aulaId });
        } else if (assinaturaCursoId) {
          await abrirCursoAluno({ id: assinaturaCursoId });
        }
      } finally {
        sincronizandoApp.current = false;
      }
    });

    return () => inscricao.remove();
  }, [token, usuario, detalheCursoAluno?.curso?.id, detalheAulaAluno?.aula?.id]);

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

  async function buscarDetalheCursoAluno(idCurso) {
    const [detalhe, materiais] = await Promise.all([
      apiRequest(`/aluno/cursos/${idCurso}`, {}, token),
      apiRequest(`/aluno/cursos/${idCurso}/materiais`, {}, token)
    ]);
    let prova = null;
    try {
      prova = await apiRequest(`/aluno/cursos/${idCurso}/prova`, {}, token);
    } catch {
      prova = null;
    }
    return { ...detalhe, materiais: Array.isArray(materiais) ? materiais : [], prova };
  }

  async function abrirCursoAluno(curso) {
    setLoading(true);
    try {
      setDetalheCursoAluno(await buscarDetalheCursoAluno(curso.id));
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

  // Sprint item 4: envia ao backend a posicao usada para retomar a aula no site e no app.
  async function salvarProgressoAula(idAula, posicaoSegundos) {
    try {
      await apiRequest(`/aluno/aulas/${idAula}/progresso`, {
        method: "PUT",
        body: JSON.stringify({ posicao_segundos: posicaoSegundos })
      }, token);
    } catch (error) {
      console.error("Erro ao salvar posicao da aula:", error);
    }
  }

  async function marcarAulaAssistida(aula) {
    try {
      await apiRequest(`/aluno/aulas/${aula.id}/assistir`, { method: "POST" }, token);
      await carregarDados();
      if (detalheCursoAluno?.curso?.id) {
        // Sprint item 3: atualiza progresso, materiais e prova com os mesmos dados exibidos no site.
        setDetalheCursoAluno(await buscarDetalheCursoAluno(detalheCursoAluno.curso.id));
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

  async function baixarCertificadoAluno() {
    const idCurso = detalheCursoAluno?.curso?.id;
    if (!idCurso || !token) return;

    try {
      // Sprint item 5: baixa o PDF autenticado e abre as opcoes nativas para salvar ou compartilhar.
      const destino = `${FileSystem.documentDirectory}certificado-${idCurso}-${Date.now()}.pdf`;
      const download = await FileSystem.downloadAsync(
        `${getApiBaseUrl()}/aluno/cursos/${idCurso}/certificado`,
        destino,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (download.status < 200 || download.status >= 300) {
        const conteudoErro = await FileSystem.readAsStringAsync(download.uri).catch(() => "");
        await FileSystem.deleteAsync(download.uri, { idempotent: true }).catch(() => {});
        let dadosErro = {};
        try {
          dadosErro = JSON.parse(conteudoErro);
        } catch {
          dadosErro = {};
        }
        throw new Error(dadosErro?.mensagem?.descricao || dadosErro?.mensagem || "Não foi possível gerar o certificado.");
      }

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("O compartilhamento de arquivos não está disponível neste aparelho.");
      }

      await Sharing.shareAsync(download.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Salvar certificado",
        UTI: "com.adobe.pdf"
      });
    } catch (error) {
      Alert.alert("Certificado", error?.message || "Não foi possível baixar o certificado.");
    }
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
      const usuarioAtualizado = { ...(usuario || {}), ...novoPerfil };
      setUsuario(usuarioAtualizado);
      // Sprint item 3: grava o perfil atualizado no cache persistente usado pelo próximo início do app.
      await salvarSessao(token, usuarioAtualizado);
      setEditingProfile(false);
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    // Sprint item 1: mantém o código de verificação como próxima etapa do cadastro no app.
    if (emailPendente) {
      return (
        <SafeAreaView style={[globalStyles.app, styles.loginApp]}>
          <StatusBar style="light" />
          <VerificarEmailScreen
            email={emailPendente}
            codigoEnviado={codigoEmailEnviado}
            onVerified={async (novoToken, novoUsuario) => {
              // Sprint item 1: salva a sessão verificada e inicia a validação da assinatura, como no site.
              await salvarSessao(novoToken, novoUsuario);
              setEmailPendente("");
              setCodigoEmailEnviado(null);
              setToken(novoToken);
              setUsuario(novoUsuario);
              setAssinaturaAtiva(null);
              validarAcesso(novoToken, novoUsuario);
            }}
          />
        </SafeAreaView>
      );
    }

    if (cadastroAberto) {
      return (
        <SafeAreaView style={[globalStyles.app, styles.loginApp]}>
          <StatusBar style="light" />
          <CadastroScreen
            onBack={() => setCadastroAberto(false)}
            onRegistered={(email, codigoEnviado) => {
              // Sprint item 1: cadastro concluído abre a verificação do e-mail antes do pagamento.
              setCadastroAberto(false);
              setEmailPendente(email);
              setCodigoEmailEnviado(codigoEnviado);
            }}
          />
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
        }}
          onSignup={() => {
            // Sprint item 1: o botão da tela de login abre o cadastro de aluno no aplicativo.
            setCadastroAberto(true);
          }}
          onVerifyEmail={(email) => {
            setCodigoEmailEnviado(null);
            setEmailPendente(email);
          }}
        />
      </SafeAreaView>
    );
  }

  if (erroSincronizacao) {
    return (
      <SafeAreaView style={[globalStyles.app, styles.syncErrorPage]}>
        <StatusBar style="dark" />
        <Text style={styles.syncErrorTitle}>Nao foi possivel sincronizar seu acesso.</Text>
        <Text style={styles.syncErrorMessage}>{erroSincronizacao}</Text>
        <Pressable style={globalStyles.primaryButton} onPress={() => validarAcesso(token, usuario)}>
          <Text style={globalStyles.buttonText}>Tentar novamente</Text>
        </Pressable>
        <Pressable style={globalStyles.secondaryButton} onPress={sair}>
          <Text style={globalStyles.secondaryText}>Sair da conta</Text>
        </Pressable>
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

  if (tipoUsuario === 2 && assinaturaAtiva === false) {
    return (
      <SafeAreaView style={globalStyles.app}>
        <StatusBar style="dark" />
        <AssinaturaScreen token={token} onLogout={sair} onAssinaturaAtiva={concluirAssinatura} />
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

  if (managingCourse) {
    return (
      <SafeAreaView style={globalStyles.app}>
        <StatusBar style="dark" />
        <ModulosProfessorScreen curso={managingCourse} token={token} onBack={() => setManagingCourse(null)} />
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
            onManage={setManagingCourse}
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
            onDownloadCertificate={baixarCertificadoAluno}
            onReview={avaliarCursoAluno}
          />
        )}
        {tab === "courses" && tipoUsuario === 2 && detalheAulaAluno && (
          <PlayerAulaScreen
            detalhe={detalheAulaAluno}
            onBack={() => setDetalheAulaAluno(null)}
            onOpenLesson={abrirAulaAluno}
            onFinish={marcarAulaAssistida}
            onSaveProgress={salvarProgressoAula}
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
  syncErrorPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24
  },
  syncErrorTitle: {
    color: colors.black,
    fontSize: 21,
    fontWeight: "700",
    textAlign: "center"
  },
  syncErrorMessage: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: "center"
  },
  loginApp: {
    paddingBottom: 0
  },
  content: {
    flex: 1,
    backgroundColor: colors.gray
  }
});
