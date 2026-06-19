import apiClient from './apiClient';

export const authService = {
  async login(email, password) {
    const { data } = await apiClient.post('/auth/login', { email, password });
    // Guardar token primero para poder llamar a /auth/me autenticado
    localStorage.setItem('padelzgz_token', data.token);
    try {
      const meRes = await apiClient.get('/auth/me');
      const user = {
        id: meRes.data.id,
        nombre: meRes.data.nombre,
        apellidos: meRes.data.apellidos,
        email: meRes.data.email,
        role: meRes.data.email === 'admin@padelzgz.com' ? 'admin' : 'user',
      };
      return { user, token: data.token };
    } catch (_) {
      const user = { email: data.email, nombre: data.email.split('@')[0], role: 'user' };
      return { user, token: data.token };
    }
  },

  async register(name, email, password) {
    const parts = name.trim().split(' ');
    const nombre = parts[0];
    const apellidos = parts.slice(1).join(' ') || 'Usuario';
    await apiClient.post('/usuarios', {
      nombre,
      apellidos,
      email,
      password,
      nivel: 'principiante',
      fechaRegistro: new Date().toISOString().split('T')[0],
    });
    // Tras registro hacemos login para obtener token y datos completos
    const loginResult = await this.login(email, password);
    return loginResult;
  },

  async getMe() {
    const { data } = await apiClient.get('/auth/me');
    return {
      id: data.id,
      nombre: data.nombre,
      apellidos: data.apellidos,
      email: data.email,
      role: data.email === 'admin@padelzgz.com' ? 'admin' : 'user',
    };
  },
};
