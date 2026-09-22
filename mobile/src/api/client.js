import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "cursando_token";
const USER_KEY = "cursando_usuario";

const API_PORT = 5000;
const REQUEST_TIMEOUT_MS = 3000;

const API_HOSTS = [
  "192.168.137.1",
  "10.92.11.45",
];

let activeApiUrl = null;


function getApiUrlCandidates() {
  const candidates = [];

  // URL definida manualmente no .env
  if (process.env.EXPO_PUBLIC_API_URL) {
    candidates.push(process.env.EXPO_PUBLIC_API_URL);
  }

  // Endereços conhecidos da máquina
  for (const host of API_HOSTS) {
    candidates.push(`http://${host}:${API_PORT}`);
  }

  // Emulador Android
  candidates.push(`http://10.0.2.2:${API_PORT}`);

  // Desenvolvimento local
  candidates.push(`http://localhost:${API_PORT}`);
  candidates.push(`http://127.0.0.1:${API_PORT}`);

  return [...new Set(candidates)];
}


export const API_URL = getApiUrlCandidates()[0];


export async function salvarSessao(token, usuario) {
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


async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

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
    token = null
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
          }
      );

      const data = await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
            data?.mensagem?.descricao ||
            data?.mensagem ||
            data?.erro ||
            "Erro ao conectar com a API."
        );
      }

      activeApiUrl = apiUrl;

      console.log(
          `[API] Conectado: ${activeApiUrl}`
      );

      return data;

    } catch (error) {
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