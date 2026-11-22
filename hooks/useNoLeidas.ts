import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { apiUsers } from '@/services/api';
import { haySesionActiva } from '@/hooks/useAuth';

// Devuelve 0 si no hay sesión (invitado) o si la consulta falla.
// Se vuelve a consultar cada vez que la pantalla recupera el foco.
export function useNoLeidas() {
  const [noLeidas, setNoLeidas] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      haySesionActiva().then(async (logueado) => {
        if (!logueado) {
          if (activo) setNoLeidas(0);
          return;
        }
        try {
          const res = await apiUsers.get('/notificaciones/no-leidas');
          if (activo) setNoLeidas(res.data.cantidad ?? 0);
        } catch {
          if (activo) setNoLeidas(0);
        }
      });

      return () => {
        activo = false;
      };
    }, [])
  );

  return noLeidas;
}