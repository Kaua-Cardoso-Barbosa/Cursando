import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

const TOKEN_KEY = "cursando_token";
const USER_KEY = "cursando_usuario";

const API_PORT = "5000";
const REQUEST_TIMEOUT_MS = 6000;

function getMetroHost() {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  const match = scriptURL?.match(/^[^:]+:\/\/([^:/]+)/);
  return match?.[1];
}

function getApiUrlCandidates() {
  const metroHost = getMetroHost();

  const candidates = [
    process.env.EXPO_PUBLIC_API_URL,

    // Celular físico: usa o mesmo IP do computador que está rodando o Metro.
    metroHost &&
    !["localhost", "127.0.0.1"].includes(metroHost) &&
    `http://${metroHost}:${API_PORT}`,

    // Android Emulator
    Platform.OS === "android" &&
    `http://10.0.2.2:${API_PORT}`,

    // iOS Simulator
    Platform.OS === "ios" &&
    `http://localhost:${API_PORT}`,

    `http://localhost:${API_PORT}`,
    `http://127.0.0.1:${API_PORT}`
  ].filter(Boolean);

  return [...new Set(candidates)];
}

export const API_URL = "http://192.168.137.1:5000";

let activeApiUrl = API_URL;


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
      error?.message === "Network request failed"
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

      return data;

    } catch (error) {
      if (!isConnectionError(error)) {
        throw error;
      }

      failedUrls.push(apiUrl);
    }
  }

  throw new Error(
      `Não foi possível conectar com a API.\n\n` +
      `URLs testadas:\n${failedUrls.join("\n")}`
  );
}