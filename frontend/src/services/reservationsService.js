import apiClient from './apiClient';

function adaptReserva(r) {
  return {
    id: r.id,
    court_id: r.pistaId,
    court_name: r.pistaNumero ? `Pista ${r.pistaNumero} — ${r.pistaTipo || r.pistaSuperficie || ''}` : 'Pista',
    date: r.fecha,
    time_slot: r.horaInicio,
    time_end: r.horaFin,
    zone: 'Zaragoza',
    players: 2,
    price: parseFloat(r.precio) || 0,
    status: 'confirmed',
    usuario_nombre: r.usuarioNombre,
    usuario_apellidos: r.usuarioApellidos,
    usuario_email: r.usuarioEmail,
    image: 'https://res.cloudinary.com/duz19cqos/image/upload/pistas-padel-helios-scaled.jpeg_igvdjx.webp',
    created_at: r.fecha,
    _raw: r,
  };
}

export const reservationsService = {
  async getMy() {
    const user = JSON.parse(localStorage.getItem('padelzgz_user') || 'null');
    if (!user?.id) return [];
    const { data } = await apiClient.get(`/reservas/usuario/${user.id}`);
    return Array.from(data).map(adaptReserva);
  },

  async getAll() {
    const { data } = await apiClient.get('/reservas');
    return Array.from(data).map(adaptReserva);
  },

  async getStats() {
    const [reservasRes, usuariosRes, pistasRes] = await Promise.all([
      apiClient.get('/reservas'),
      apiClient.get('/usuarios'),
      apiClient.get('/pistas'),
    ]);
    const reservas = Array.from(reservasRes.data);
    const ingresos = reservas.reduce((acc, r) => acc + (parseFloat(r.precio) || 0), 0);
    return {
      totalReservations: reservas.length,
      activeReservations: reservas.length,
      totalUsers: Array.from(usuariosRes.data).length,
      totalCourts: Array.from(pistasRes.data).length,
      totalRevenue: ingresos,
    };
  },

  async getSlots(courtId, date) {
    const { data } = await apiClient.get(`/reservas/pista/${courtId}`);
    const reservasDelDia = Array.from(data).filter(r => r.fecha === date);
    const taken = reservasDelDia.map(r => r.horaInicio);
    const allSlots = [];
    for (let h = 10; h < 22; h++) {
      allSlots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return { slots: allSlots.filter(s => !taken.includes(s)), taken };
  },

  async create(courtId, date, timeSlot, players = 2) {
    const user = JSON.parse(localStorage.getItem('padelzgz_user') || 'null');
    const horaInicio = timeSlot;
    const [h, m] = timeSlot.split(':').map(Number);
    const horaFin = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    let precio = 0;
    try {
      const { data: pista } = await apiClient.get(`/pistas/${courtId}`);
      precio = pista.precioHora || 0;
    } catch (_) {}

    const { data } = await apiClient.post('/reservas', {
      fecha: date,
      horaInicio,
      horaFin,
      precio,
      pagado: false,
      pistaId: Number(courtId),
      usuarioId: user?.id,
    });
    return adaptReserva(data);
  },

  async cancel(id) {
    await apiClient.delete(`/reservas/${id}`);
    return { id, status: 'cancelled' };
  },
};