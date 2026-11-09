import { createContext, useContext } from "react";
export const API = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
export const SessaoContext = createContext(null);
export function useSessao() { return useContext(SessaoContext); }
