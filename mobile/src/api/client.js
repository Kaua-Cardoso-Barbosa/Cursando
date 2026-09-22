import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "cursando_token";
const USER_KEY = "cursando_usuario";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000");

export async function salvarSessao(token, usuario) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token || ""],
    [USER_KEY, JSON.stringify(usuario || {})]
  ]);
}

export async function carregarSessao() {
  const [[, token], [, usuarioJson]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  return {
    token,
    usuario: usuarioJson ? JSON.parse(usuarioJson) : null
  };
}

export async function limparSessao() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export function resolverUrlMidia(caminho) {
  if (!caminho) return "";
  if (caminho.startsWith("http://") || caminho.startsWith("https://")) return caminho;
  return `${API_URL}${caminho}`;
}

export async function apiRequest(path, options = {}, token) {
  const headers = {
    Accept: "application/json",
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.mensagem?.descricao || "Erro ao conectar com a API.");
  }

  return data;
}
