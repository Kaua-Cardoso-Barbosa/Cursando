import { StatusBar } from "expo-status-bar";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as LocalAuthentication from "expo-local-authentication";
import Constants from "expo-constants";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Platform, Pressable, SafeAreaView, StyleSheet, Text, Vibration, View } from "react-native";
import { apiRequest, carregarSessao, getApiBaseUrl, limparSessao, salvarSessao } from "./src/api/client";
import BottomNav from "./src/components/BottomNav";
import FeedbackProvider, { useFeedback } from "./src/components/FeedbackProvider";
import AlunosCursoScreen from "./src/screens/AlunosCursoScreen";
import AulasAlunoScreen from "./src/screens/AulasAlunoScreen";
import CadastroScreen from "./src/screens/CadastroScreen";
import ChatScreen from "./src/screens/ChatScreen";
import CursosScreen from "./src/screens/CursosScreen";
import DescobrirCursosScreen from "./src/screens/DescobrirCursosScreen";
import EditarCursoScreen from "./src/screens/EditarCursoScreen";
import EditarPerfilScreen from "./src/screens/EditarPerfilScreen";
import ModulosProfessorScreen from "./src/screens/ModulosProfessorScreen";
import FinanceiroScreen from "./src/screens/FinanceiroScreen";
import InicioScreen from "./src/screens/InicioScreen";
import LoginScreen from "./src/screens/LoginScreen";
import PerfilScreen from "./src/screens/PerfilScreen";
import PlayerAulaScreen from "./src/screens/PlayerAulaScreen";
import ProvasProfessorScreen from "./src/screens/ProvasProfessorScreen";
import ProvaAlunoScreen from "./src/screens/ProvaAlunoScreen";
import MateriaisProfessorScreen from "./src/screens/MateriaisProfessorScreen";
import RelatoriosProfessorScreen from "./src/screens/RelatoriosProfessorScreen";
import LogsAdminScreen from "./src/screens/LogsAdminScreen";
import VerificarEmailScreen from "./src/screens/VerificarEmailScreen";
import { colors, globalStyles } from "./src/styles";

let notificationHandlerConfigured = false;

export default function App() {
  return (
    <FeedbackProvider>
      <AppContent />
    </FeedbackProvider>
  );
}

function AppContent() {
  const { mostrarAlerta } = useFeedback();
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
  const [studentsCourse, setStudentsCourse] = useState(null);
  // Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web. guarda o aluno escolhido até abrir o chat privado no app.
  const [chatInicial, setChatInicial] = useState(null);
  // Sprint item 6 - Permitir que o instrutor divida o curso em módulos. abre o gerenciamento de módulos e aulas para o curso escolhido.
  const [managingCourse, setManagingCourse] = useState(null);
  // Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso. guarda o curso selecionado para configurar sua prova e corrigir envios no app.
  const [examCourse, setExamCourse] = useState(null);
  const [examAlunoAberto, setExamAlunoAberto] = useState(false);
  const [materialsCourse, setMaterialsCourse] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Sprint item 1 - Implementar cadastro de alunos pelo aplicativo. controla o formulário de cadastro e a verificação do aluno antes do pagamento.
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [emailPendente, setEmailPendente] = useState("");
  const [codigoEmailEnviado, setCodigoEmailEnviado] = useState(null);

  async function carregarDados(authToken = token, authUser = usuario) {
    if (!authToken) return;
    setLoading(true);
    try {
      const tipo = Number(authUser?.tipo ?? usuario?.tipo ?? 1);
      if (tipo === 0) {
        setTab("logs");
        const [dashboardData, perfilData] = await Promise.all([
          apiRequest("/admin/dashboard", {}, authToken),
          apiRequest("/perfil", {}, authToken)
        ]);
        setDashboard(dashboardData.metricas || dashboardData || {});
        setCursos([]);
        setPerfil(perfilData);
        const usuarioAtualizado = { ...(authUser || {}), ...perfilData, tipo };
        setUsuario(usuarioAtualizado);
        await salvarSessao(authToken, usuarioAtualizado);
        return;
      }
      const dashboardPath = tipo === 2 ? "/aluno/dashboard" : "/professor/dashboard";
      const cursosPath = tipo === 2 ? "/aluno/cursos" : "/professor/cursos?status=todos";
      const requisicoes = [
        apiRequest(dashboardPath, {}, authToken),
        // Sprint item 34 - Exibir faturas em aberto. a listagem bloqueada não impede o acesso ao restante do dashboard.
        apiRequest(cursosPath, {}, authToken).catch((error) => {
          if (tipo === 2 && error?.status === 402) return [];
          throw error;
        }),
        apiRequest("/perfil", {}, authToken)
      ];

      // Sprint item 33 - Exibir total gasto e histórico de faturas do aluno. carrega o financeiro no app tambem para alunos, nao apenas professores.
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
      // Sprint item 3 - Sincronizar dados entre aplicativo e sistema web. persiste no app o mesmo perfil atualizado que o site acabou de ler do backend.
      await salvarSessao(authToken, usuarioAtualizado);
    } catch (error) {
      mostrarAlerta("Erro", error.message, "erro");
    } finally {
      setLoading(false);
    }
  }

  // Sprint item 18 - Integrar recursos nativos: biometria, câmera, vibração e notificações. pede biometria do aparelho ao restaurar uma sessão salva, quando disponível.
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

  // Sprint item 18 - Integrar recursos nativos: biometria, câmera, vibração e notificações. confirma o início da sessão com vibração e uma notificação local.
  async function avisarSessaoAtiva() {
    Vibration.vibrate(60);

    // O Expo Go no Android carrega o aviso de push remoto ao importar o modulo.
    // O app usa somente notificacao local; no Expo Go mantemos a vibracao e
    // reservamos a notificacao do sistema para builds do proprio aplicativo.
    if (Platform.OS === "android" && Constants.expoGoConfig) return;

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

    // Sprint item 3 - Sincronizar dados entre aplicativo e sistema web. distingue falta de assinatura de falha de rede para manter os dados dos dois clientes coerentes.
    setValidandoAssinatura(true);
    setAssinaturaAtiva(null);
    try {
      const dados = await apiRequest("/assinaturas/verificar", {}, authToken);
      const ativa = dados?.assinatura === true;
      setAssinaturaAtiva(ativa);
      // Sprint item 34 - Exibir faturas em aberto. mantém início, catálogo e financeiro acessíveis sem mensalidade ativa.
      await carregarDados(authToken, authUser);
      return ativa;
    } catch (error) {
      if (error?.status === 403 && error?.dados?.assinatura === false) {
        setAssinaturaAtiva(false);
        await carregarDados(authToken, authUser);
        return false;
      }

      setErroSincronizacao(error?.message || "Nao foi possivel atualizar seu acesso.");
      return null;
    } finally {
      setValidandoAssinatura(false);
    }
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
        // Sprint item 3 - Sincronizar dados entre aplicativo e sistema web. ao voltar ao app, revalida acesso e busca no servidor os dados alterados no site.
        const acessoAtivo = await validarAcesso(token, usuario);
        if (!acessoAtivo) {
          // Sprint item 34 - Exibir faturas em aberto. se o pagamento venceu durante a sessão, leva o aluno ao financeiro.
          setDetalheCursoAluno(null);
          setDetalheAulaAluno(null);
          if (tab === "courses" || tab === "discover") setTab("finance");
          return;
        }

        if (aulaId) {
          await abrirAulaAluno({ id: aulaId });
        } else if (assinaturaCursoId) {
          await abrirCursoAluno({ id: assinaturaCursoId }, tab === "discover" ? "discover" : "courses");
        }
      } finally {
        sincronizandoApp.current = false;
      }
    });

    return () => inscricao.remove();
  }, [token, usuario, detalheCursoAluno?.curso?.id, detalheAulaAluno?.aula?.id, tab]);

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
    setExamAlunoAberto(false);
    setChatInicial(null);
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

  async function abrirCursoAluno(curso, destino = "courses") {
    setLoading(true);
    try {
      setExamAlunoAberto(false);
      setDetalheCursoAluno(await buscarDetalheCursoAluno(curso.id));
      setDetalheAulaAluno(null);
      setTab(destino);
    } catch (error) {
      if (error.status === 402) {
        // Sprint item 34 - Exibir faturas em aberto. avisa sobre a fatura pendente e abre a aba de pagamento.
        mostrarAlerta("Fatura em aberto", error.message, "erro");
        setDetalheCursoAluno(null);
        setDetalheAulaAluno(null);
        setTab("finance");
      } else {
        mostrarAlerta("Erro", error.message, "erro");
      }
    } finally {
      setLoading(false);
    }
  }

  async function inscreverCursoAluno(curso) {
    if (!curso?.id) return;

    setLoading(true);
    try {
      await apiRequest(`/aluno/cursos/${curso.id}/inscrever`, { method: "POST" }, token);
      await carregarDados();
      setDetalheCursoAluno(await buscarDetalheCursoAluno(curso.id));
      mostrarAlerta("Inscrição", "Inscrição realizada com sucesso.", "sucesso");
    } catch (error) {
      if (error.status === 402) {
        mostrarAlerta("Fatura em aberto", error.message, "erro");
        setDetalheCursoAluno(null);
        setDetalheAulaAluno(null);
        setTab("finance");
        return;
      }
      mostrarAlerta("Erro", error.message, "erro");
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
      if (error.status === 402) {
        mostrarAlerta("Fatura em aberto", error.message, "erro");
        setDetalheCursoAluno(null);
        setDetalheAulaAluno(null);
        setTab("finance");
      } else {
        mostrarAlerta("Erro", error.message, "erro");
      }
    } finally {
      setLoading(false);
    }
  }

  // Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou. envia ao backend a posicao usada para retomar a aula no site e no app.
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
        // Sprint item 3 - Sincronizar dados entre aplicativo e sistema web. atualiza progresso, materiais e prova com os mesmos dados exibidos no site.
        setDetalheCursoAluno(await buscarDetalheCursoAluno(detalheCursoAluno.curso.id));
      }
    } catch (error) {
      mostrarAlerta("Erro", error.message, "erro");
    }
  }

  // Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso. envia as respostas do aluno ao servidor para correção pelo instrutor.
  async function enviarProvaAluno(respostas) {
    if (!detalheCursoAluno?.curso?.id) return;

    const resultado = await apiRequest(`/aluno/cursos/${detalheCursoAluno.curso.id}/prova`, {
      method: "POST",
      body: JSON.stringify({ respostas })
    }, token);
    setDetalheCursoAluno(await buscarDetalheCursoAluno(detalheCursoAluno.curso.id));
    return resultado;
  }

  // Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso. solicita o PDF ao servidor, que só o emite após aprovação na prova final.
  async function baixarCertificadoAluno() {
    const idCurso = detalheCursoAluno?.curso?.id;
    if (!idCurso || !token) return;

    try {
      // Sprint item 5 - Gerar certificado ao concluir o curso. baixa o PDF autenticado e abre as opcoes nativas para salvar ou compartilhar.
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
      mostrarAlerta("Certificado", error?.message || "Não foi possível baixar o certificado.", "erro");
    }
  }

  async function avaliarCursoAluno(dados) {
    if (!detalheCursoAluno?.curso?.id) return;

    // Sprint item 27 - Permitir que o aluno avalie o curso após a conclusão. envia a nota em estrelas e o comentario do aluno ao endpoint que valida a conclusao e a prova.
    await apiRequest(`/aluno/cursos/${detalheCursoAluno.curso.id}/avaliacoes`, {
      method: "POST",
      body: JSON.stringify(dados)
    }, token);
    mostrarAlerta("Avaliação", "Avaliação enviada.", "sucesso");
  }

  function trocarAba(key) {
    setTab(key);
    if (key !== "chat") setChatInicial(null);
    setExamAlunoAberto(false);
    setStudentsCourse(null);
    if (key !== "courses") {
      setDetalheCursoAluno(null);
      setDetalheAulaAluno(null);
      return;
    }
    setDetalheCursoAluno(null);
    setDetalheAulaAluno(null);
  }

  async function salvarCurso({ titulo, descricao, imagem, idCategoria, idTema, novaCategoria, novoTema, nomeNovaCategoria, nomeNovoTema }) {
    setSaving(true);
    try {
      // Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação. cadastra novas categorias e temas pela API, que verifica duplicidades.
      let categoriaSelecionada = idCategoria || null;
      let temaSelecionado = idTema || null;
      if (novaCategoria) {
        if (!nomeNovaCategoria?.trim()) throw new Error("Digite o nome da nova categoria.");
        const criada = await apiRequest("/taxonomias/categorias", {
          method: "POST",
          body: JSON.stringify({ nome: nomeNovaCategoria.trim() })
        }, token);
        categoriaSelecionada = criada.id;
      }
      if (novoTema) {
        if (!nomeNovoTema?.trim()) throw new Error("Digite o nome do novo tema.");
        const criado = await apiRequest("/taxonomias/temas", {
          method: "POST",
          body: JSON.stringify({ nome: nomeNovoTema.trim() })
        }, token);
        temaSelecionado = criado.id;
      }

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
      await apiRequest(`/professor/cursos/${editingCourse.id}/taxonomia`, {
        method: "PUT",
        body: JSON.stringify({ id_categoria: categoriaSelecionada, id_tema: temaSelecionado })
      }, token);
      setEditingCourse(null);
      await carregarDados();
    } catch (error) {
      mostrarAlerta("Erro", error.message, "erro");
    } finally {
      setSaving(false);
    }
  }

  async function excluirCurso(curso) {
    try {
      await apiRequest(`/professor/cursos/${curso.id}`, { method: "DELETE" }, token);
      await carregarDados();
    } catch (error) {
      mostrarAlerta("Erro", error.message, "erro");
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
      // Sprint item 3 - Sincronizar dados entre aplicativo e sistema web. grava o perfil atualizado no cache persistente usado pelo próximo início do app.
      await salvarSessao(token, usuarioAtualizado);
      setEditingProfile(false);
    } catch (error) {
      mostrarAlerta("Erro", error.message, "erro");
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    // Sprint item 1 - Implementar cadastro de alunos pelo aplicativo. mantém o código de verificação como próxima etapa do cadastro no app.
    if (emailPendente) {
      return (
        <SafeAreaView style={[globalStyles.app, styles.loginApp]}>
          <StatusBar style="light" />
          <VerificarEmailScreen
            email={emailPendente}
            codigoEnviado={codigoEmailEnviado}
            onVerified={async (novoToken, novoUsuario) => {
              // Sprint item 1 - Implementar cadastro de alunos pelo aplicativo. salva a sessão verificada e inicia a validação da assinatura, como no site.
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
              // Sprint item 1 - Implementar cadastro de alunos pelo aplicativo. cadastro concluído abre a verificação do e-mail antes do pagamento.
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
            // Sprint item 1 - Implementar cadastro de alunos pelo aplicativo. o botão da tela de login abre o cadastro de aluno no aplicativo.
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

  if (editingCourse) {
    return (
      <SafeAreaView style={globalStyles.app}>
        <StatusBar style="light" />
        <EditarCursoScreen curso={editingCourse} token={token} onCancel={() => setEditingCourse(null)} onSave={salvarCurso} salvando={saving} />
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

  // Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos. baixa complemento privado com o token da matrícula e permite abri-lo no dispositivo.
  async function abrirMaterialCurso(material) {
    try {
      const destino = `${FileSystem.documentDirectory}${encodeURIComponent(material.nome_arquivo || `complemento-${material.id}`)}`;
      const download = await FileSystem.downloadAsync(`${getApiBaseUrl()}${material.arquivo_url}`, destino, { headers: { Authorization: `Bearer ${token}` } });
      if (download.status < 200 || download.status >= 300) throw new Error("Não foi possível acessar este material.");
      if (!(await Sharing.isAvailableAsync())) throw new Error("O compartilhamento de arquivos não está disponível neste aparelho.");
      await Sharing.shareAsync(download.uri, { dialogTitle: material.nome_arquivo || material.titulo });
    } catch (error) { mostrarAlerta("Complemento", error.message, "erro"); }
  }

  if (examCourse) {
    return (
      <SafeAreaView style={globalStyles.app}>
        <StatusBar style="dark" />
        <ProvasProfessorScreen curso={examCourse} cursos={cursos} token={token} onBack={() => setExamCourse(null)} />
      </SafeAreaView>
    );
  }

  if (examAlunoAberto && detalheCursoAluno?.prova?.prova) {
    return <SafeAreaView style={globalStyles.app}><StatusBar style="dark" /><ProvaAlunoScreen curso={detalheCursoAluno.curso} prova={detalheCursoAluno.prova} onBack={() => setExamAlunoAberto(false)} onSubmit={enviarProvaAluno} /></SafeAreaView>;
  }

  if (materialsCourse) {
    return <SafeAreaView style={globalStyles.app}><StatusBar style="dark" /><MateriaisProfessorScreen curso={materialsCourse} token={token} onBack={() => setMaterialsCourse(null)} /></SafeAreaView>;
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
        {tab === "courses" && tipoUsuario === 1 && !studentsCourse && (
          <CursosScreen
            cursos={cursos}
            carregando={loading}
            onRefresh={carregarDados}
            onEdit={setEditingCourse}
            onDelete={excluirCurso}
            onManage={setManagingCourse}
            onExams={setExamCourse}
            onComplements={setMaterialsCourse}
            onStudents={setStudentsCourse}
            tipoUsuario={tipoUsuario}
          />
        )}
        {tab === "courses" && tipoUsuario === 1 && studentsCourse && (
          <AlunosCursoScreen
            curso={studentsCourse}
            token={token}
            onBack={() => setStudentsCourse(null)}
            onOpenChat={(aluno) => {
              // Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web. abre a conversa somente com o aluno selecionado.
              // A lista de chats passa a guardá-la após a primeira mensagem.
              setChatInicial({
                id_curso: studentsCourse.id,
                id_aluno: aluno.id_usuario,
                nome: aluno.nome,
                curso: studentsCourse.titulo
              });
              setStudentsCourse(null);
              setTab("chat");
            }}
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
            onBack={() => { setExamAlunoAberto(false); setDetalheCursoAluno(null); }}
            onOpenLesson={abrirAulaAluno}
            onEnroll={inscreverCursoAluno}
            onOpenExam={() => setExamAlunoAberto(true)}
            onDownloadCertificate={baixarCertificadoAluno}
            onReview={avaliarCursoAluno}
            onOpenMaterial={abrirMaterialCurso}
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
        {tab === "discover" && tipoUsuario === 2 && !detalheCursoAluno && !detalheAulaAluno && (
          <DescobrirCursosScreen
            token={token}
            carregando={loading}
            onOpen={(curso) => abrirCursoAluno(curso, "discover")}
          />
        )}
        {tab === "discover" && tipoUsuario === 2 && detalheCursoAluno && !detalheAulaAluno && (
          <AulasAlunoScreen
            detalhe={detalheCursoAluno}
            carregando={loading}
            onRefresh={() => abrirCursoAluno(detalheCursoAluno.curso, "discover")}
            onBack={() => { setExamAlunoAberto(false); setDetalheCursoAluno(null); }}
            onOpenLesson={abrirAulaAluno}
            onEnroll={inscreverCursoAluno}
            onOpenExam={() => setExamAlunoAberto(true)}
            onDownloadCertificate={baixarCertificadoAluno}
            onReview={avaliarCursoAluno}
            onOpenMaterial={abrirMaterialCurso}
          />
        )}
        {tab === "discover" && tipoUsuario === 2 && detalheAulaAluno && (
          <PlayerAulaScreen
            detalhe={detalheAulaAluno}
            onBack={() => setDetalheAulaAluno(null)}
            onOpenLesson={abrirAulaAluno}
            onFinish={marcarAulaAssistida}
            onSaveProgress={salvarProgressoAula}
          />
        )}
        {tab === "profile" && <PerfilScreen perfil={perfil} onEdit={() => setEditingProfile(true)} onLogout={sair} />}
        {/* Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web. disponibiliza a caixa de mensagens do curso para alunos e instrutores no app. */}
        {tab === "chat" && (
          <ChatScreen
            token={token}
            tipoUsuario={tipoUsuario}
            cursos={cursos}
            conversaInicial={chatInicial}
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
        {tab === "reports" && tipoUsuario === 1 && (
          <RelatoriosProfessorScreen
            token={token}
            cursos={cursos}
            carregando={loading}
          />
        )}
        {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário. exibe a consulta de logs somente na sessão de administrador. */}
        {tab === "logs" && tipoUsuario === 0 && (
          <LogsAdminScreen token={token} onError={(error) => mostrarAlerta("Logs", error.message, "erro")} />
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
