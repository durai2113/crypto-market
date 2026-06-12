import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_URL,
});

export const getMarkets = async () => {
  return await api.get("/markets/");
};

export const fetchMarkets = async () => {
  return await api.post("/markets/fetch");
};

export const getAnalytics = async () => {
  return await api.get("/analytics/");
};

export const runStrategy = async () => {
  return await api.post("/strategy/run");
};

export default api;