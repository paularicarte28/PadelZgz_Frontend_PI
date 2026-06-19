import apiClient from './apiClient';

// Adapta un objeto Pista del Spring Boot al formato que espera el frontend React
function adaptPista(pista) {
  return {
    id: pista.id,
    name: `Pista ${pista.numero}${pista.club ? ' - ' + pista.club.nombre : ''}`,
    club: pista.club?.nombre || '',
    zone: pista.club?.ciudad || 'Zaragoza',
    address: pista.club?.direccion || '',
    type: pista.interior ? 'indoor' : 'outdoor',
    surface: pista.superficie || pista.tipo || '',
    price: pista.precioHora || 0,
    rating: 0,
    reviews: 0,
    active: pista.activa,
    // Guardamos el objeto original por si se necesita
    _raw: pista,
  };
}

export const courtsService = {
  async getAll() {
    const { data } = await apiClient.get('/pistas');
    return Array.from(data).map(adaptPista);
  },

  async getById(id) {
    const { data } = await apiClient.get(`/pistas/${id}`);
    return adaptPista(data);
  },

  async create(courtData) {
    // POST /pistas/club/:clubId
    const clubId = courtData.clubId || 1;
    const { data } = await apiClient.post(`/pistas/club/${clubId}`, {
      numero: courtData.numero || 1,
      tipo: courtData.surface || courtData.tipo || 'cristal',
      interior: courtData.type === 'indoor',
      precioHora: courtData.price || courtData.precioHora || 0,
      activa: true,
      superficie: courtData.surface || courtData.superficie || '',
    });
    return adaptPista(data);
  },

  async update(id, courtData) {
    const { data } = await apiClient.put(`/pistas/${id}`, {
      numero: courtData.numero || 1,
      tipo: courtData.surface || courtData.tipo || 'cristal',
      interior: courtData.type === 'indoor',
      precioHora: courtData.price || courtData.precioHora || 0,
      activa: courtData.active !== undefined ? courtData.active : true,
      superficie: courtData.surface || courtData.superficie || '',
    });
    return adaptPista(data);
  },

  async remove(id) {
    await apiClient.delete(`/pistas/${id}`);
    return { success: true };
  },
};
