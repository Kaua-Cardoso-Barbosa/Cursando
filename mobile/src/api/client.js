import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "cursando_token";
const USER_KEY = "cursando_usuario";

const API_PORT = 5000;
const REQUEST_TIMEOUT_MS = 3000;
// Sprint item 1: pagamentos podem aguardar a resposta da Arkhé por até 10 segundos.
// Sprint item 10: tolera o tempo do backend, da Arkhé e da rede móvel sem repetir um POST financeiro.
export const PAYMENT_REQUEST_TIMEOUT_MS = 30000;

const API_HOSTS = [
  "192.168.137.1",
  "10.92.11.45",
];

let activeApiUrl = null;


function getApiUrlCandidates() {
  const candidates = [];

  // Uma URL configurada no ambiente tem prioridade sobre os enderecos locais.
  if (process.env.EXPO_PUBLIC_API_URL) {
    candidates.push(process.env.EXPO_PUBLIC_API_URL);
  }

  // Enderecos conhecidos permitem acessar o backend em outra maquina da rede.
  for (const host of API_HOSTS) {
    candidates.push(`http://${host}:${API_PORT}`);
  }

  // O emulador Android usa este endereco para acessar o computador host.
  candidates.push(`http://10.0.2.2:${API_PORT}`);

  // Fallbacks para ambientes que acessam o backend por localhost.
  candidates.push(`http://localhost:${API_PORT}`);
  candidates.push(`http://127.0.0.1:${API_PORT}`);

  return [...new Set(candidates)];
}


export const API_URL = getApiUrlCandidates()[0];


// Sprint item 5: usa no download do certificado o mesmo servidor API validado pelas requisicoes do app.
export function getApiBaseUrl() {
  return activeApiUrl || API_URL;
}


export async function salvarSessao(token, usuario) {
  // AsyncStorage mantem token e perfil entre aberturas do app.
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token || ""],
    [USER_KEY, JSON.stringify(usuario || {})]
  ]);
}


export async function carregarSessao() {
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


export async function limparSessao() {
  await AsyncStorage.multiRemove([
    TOKEN_KEY,
    USER_KEY
  ]);
}


export function resolverUrlMidia(caminho) {
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


function isConnectionError(error) {
  return (
      error?.name === "AbortError" ||
      error?.message === "Network request failed" ||
      error?.message?.includes("Network request failed")
  );
}


export async function apiRequest(
    path,
    options = {},
    token = null,
    timeoutMs = REQUEST_TIMEOUT_MS,
    retryOnAbort = true
) {
  // JSON e token Bearer sao enviados nos formatos esperados pela API.
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

  // Tenta os enderecos em sequencia e reutiliza o primeiro que responder.
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
        // Sprint item 3: keeps response status and payload so the app can distinguish sync failures from missing access.
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
      // Sprint item 1: não repete POST financeiro se o tempo esgotar após a API talvez ter criado a cobrança.
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
