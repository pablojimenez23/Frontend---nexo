import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_IPS = {
  msUsers: 'http://192.168.0.9:8081',
  msStores: 'http://192.168.0.9:8082',
  msProducts: 'http://192.168.0.9:8083',
  msOrders: 'http://192.168.0.9:8084',
};

function crearCliente(baseURL: string) {
  const cliente = axios.create({ baseURL });

  cliente.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return cliente;
}

export const apiUsers = crearCliente(BASE_IPS.msUsers);
export const apiStores = crearCliente(BASE_IPS.msStores);
export const apiProducts = crearCliente(BASE_IPS.msProducts);
export const apiOrders = crearCliente(BASE_IPS.msOrders);