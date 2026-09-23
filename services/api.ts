import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const ALB_HOST = 'http://nexo-alb-326907716.us-east-1.elb.amazonaws.com';

const BASE_IPS = {
  msUsers: ALB_HOST,
  msStores: `${ALB_HOST}/stores`,
  msProducts: `${ALB_HOST}/products`,
  msOrders: `${ALB_HOST}/orders`,
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