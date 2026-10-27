import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "cursando_token";
const USER_KEY = "cursando_usuario";

const API_PORT = 5000;
const REQUEST_TIMEOUT_MS = 3000;


export const PAYMENT_REQUEST_TIMEOUT_MS = 30000;

const API_HOSTS = [
  "192.168.137.1",
  "10.92.11.45",
];

let activeApiUrl = null;


/* Sprint item 17 - Integrar o aplicativo com a API - Monta os endereços candidatos da API a partir da configuração do app */
function getApiUrlCandidates() {
  const candidates = [];


  if (process.env.EXPO_PUBLIC_API_URL) {
    candidates.push(process.env.EXPO_PUBLIC_API_URL);
  }


  for (const host of API_HOSTS) {
    candidates.push(`http://${host}:${API_PORT}`);
  }


  candidates.push(`http://10.0.2.2:${API_PORT}`);


  candidates.push(`http://localhost:${API_PORT}`);
  candidates.push(`http://127.0.0.1:${API_PORT}`);

  return [...new Set(candidates)];
}
/* Fim item 17 */


export const API_URL = getApiUrlCandidates()[0];



export
/* Sprint item 17 - Integrar o aplicativo com a API - Retorna o endereço da API conectado pelo aplicativo */
function getApiBaseUrl() {
  return activeApiUrl || API_URL;
}
/* Fim item 17 */


export
/* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Persiste o token e o usuário para restaurar a sessão */
async function salvarSessao(token, usuario) {

  await AsyncStorage.multiSet([
    [TOKEN_KEY, token || ""],
    [USER_KEY, JSON.stringify(usuario || {})]
  ]);
}
/* Fim item 3 */


export
/* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Restaura o token e o usuário armazenados no dispositivo */
async function carregarSessao() {
  const [[, token], [, usuarioJson]] =
      await AsyncStorage.multiGet([
        TOKEN_KEY,
        USER_KEY
      ]);

  return {
    token: token || null,
    usuario: usuarioJson
        ? JSON.parse(usuarioJson)
        : null
  };
}
/* Fim item 3 */


export
/* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Remove a sessão persistida no dispositivo */
async function limparSessao() {
  await AsyncStorage.multiRemove([
    TOKEN_KEY,
    USER_KEY
  ]);
}
/* Fim item 3 */


export
/* Sprint item 17 - Integrar o aplicativo com a API - Resolve o endereço de mídia usando a API conectada */
function resolverUrlMidia(caminho) {
  if (!caminho) return "";

  if (
      caminho.startsWith("http://") ||
      caminho.startsWith("https://")
  ) {
    return caminho;
  }

  if (!activeApiUrl) {
    throw new Error("API ainda não conectada.");
  }

  return `${activeApiUrl}${caminho}`;
}
/* Fim item 17 */


/* Sprint item 17 - Integrar o aplicativo com a API - Executa a requisição e cancela quando excede o tempo limite */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
/* Fim item 17 */


/* Sprint item 17 - Integrar o aplicativo com a API - Identifica falhas de conexão que permitem tentar outro endereço */
function isConnectionError(error) {
  return (
      error?.name === "AbortError" ||
      error?.message === "Network request failed" ||
      error?.message?.includes("Network request failed")
  );
}
/* Fim item 17 */


export
/* Sprint item 17 - Integrar o aplicativo com a API - Envia a requisição autenticada e trata as respostas e falhas da API */
async function apiRequest(
    path,
    options = {},
    token = null,
    timeoutMs = REQUEST_TIMEOUT_MS,
    retryOnAbort = true
) {


  const headers = {
    Accept: "application/json",

    ...(options.body instanceof FormData
        ? {}
        : {
          "Content-Type": "application/json"
        }),

    ...(token
        ? {
          Authorization: `Bearer ${token}`
        }
        : {}),

    ...(options.headers || {})
  };

  const candidates = [
    activeApiUrl,
    ...getApiUrlCandidates()
  ].filter(Boolean);

  const uniqueCandidates = [
    ...new Set(candidates)
  ];

  const failedUrls = [];


  for (const apiUrl of uniqueCandidates) {
    try {
      console.log(
          `[API] Tentando: ${apiUrl}${path}`
      );

      const response = await fetchWithTimeout(
          `${apiUrl}${path}`,
          {
            ...options,
            headers
          },
          timeoutMs
      );

      const data = await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {

        const error = new Error(
            data?.mensagem?.descricao ||
            data?.mensagem ||
            data?.erro ||
            "Erro ao conectar com a API."
        );
        error.status = response.status;
        error.dados = data;
        throw error;
      }

      activeApiUrl = apiUrl;

      console.log(
          `[API] Conectado: ${activeApiUrl}`
      );

      return data;

    } catch (error) {

      if (error?.name === "AbortError" && !retryOnAbort) {
        throw new Error("A API demorou para responder. Consulte os pagamentos antes de tentar novamente.");
      }

      if (!isConnectionError(error)) {
        throw error;
      }

      console.log(
          `[API] Falhou: ${apiUrl}`
      );

      failedUrls.push(apiUrl);
    }
  }

  throw new Error(
      `Não foi possível conectar com a API.\n\n` +
      `Endereços testados:\n` +
      failedUrls.join("\n")
  );
}
/* Fim item 17 */
