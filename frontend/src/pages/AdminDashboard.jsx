import { useEffect, useState, useMemo } from 'react';
import { reservationsService } from '../services/reservationsService';
import { courtsService } from '../services/courtsService';
import apiClient from '../services/apiClient';
import { LoadingSpinner, ErrorMessage, EmptyState, StatusBadge } from '../components/ui/Feedback';
import { formatDate, formatPrice } from '../utils/formatters';

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
      <span style={{ fontSize: '1.8rem' }}>{icon}</span>
      <div>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>{label}</p>
        <p style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{value}</p>
      </div>
    </div>
  );
}

const EMPTY_CLUB = { nombre: '', ciudad: '', direccion: '', telefono: '', email: '', activo: true };
const EMPTY_PISTA = { numero: '', tipo: 'cristal', superficie: '', interior: true, precioHora: '', activa: true, clubId: '' };

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('reservas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState(null);
  const [courts, setCourts] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const [clubModal, setClubModal] = useState(null);
  const [pistaModal, setPistaModal] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [res, st, cts, cls, usrs] = await Promise.all([
        reservationsService.getAll(),
        reservationsService.getStats(),
        courtsService.getAll(),
        apiClient.get('/clubs'),
        apiClient.get('/usuarios'),
      ]);
      setReservations(res);
      setStats(st);
      setCourts(cts);
      setClubs(Array.from(cls.data));
      setUsuarios(Array.from(usrs.data));
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  async function handleCancelReservation(id) {
    if (!window.confirm('¿Cancelar esta reserva?')) return;
    try {
      await reservationsService.cancel(id);
      setReservations(prev => prev.filter(r => r.id !== id));
    } catch { alert('Error al cancelar'); }
  }

  async function handleDeleteCourt(id) {
    if (!window.confirm('¿Eliminar esta pista?')) return;
    try {
      await courtsService.remove(id);
      setCourts(prev => prev.filter(c => c.id !== id));
    } catch { alert('Error al eliminar pista'); }
  }

  async function handleDeleteClub(id) {
    if (!window.confirm('¿Eliminar este club? Se eliminarán todas sus pistas.')) return;
    try {
      await apiClient.delete(`/clubs/${id}`);
      setClubs(prev => prev.filter(c => c.id !== id));
    } catch { alert('Error al eliminar club'); }
  }

  async function handleDeleteUsuario(id) {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    try {
      await apiClient.delete(`/usuarios/${id}`);
      setUsuarios(prev => prev.filter(u => u.id !== id));
    } catch { alert('Error al eliminar usuario'); }
  }

  async function handleSaveClub() {
    setSaving(true);
    try {
      const d = clubModal.data;
      const payload = {
        nombre: d.nombre,
        ciudad: d.ciudad,
        direccion: d.direccion || '',
        telefono: d.telefono || null,
        email: d.email || null,
        activo: d.activo,
        fechaApertura: d.fechaApertura || null,
      };
      if (clubModal.mode === 'create') {
        const { data } = await apiClient.post('/clubs', payload);
        setClubs(prev => [...prev, data]);
      } else {
        const { data } = await apiClient.put(`/clubs/${d.id}`, payload);
        setClubs(prev => prev.map(c => c.id === d.id ? data : c));
      }
      setClubModal(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Error al guardar club');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePista() {
    setSaving(true);
    try {
      const d = pistaModal.data;
      const payload = {
        numero: Number(d.numero),
        tipo: d.tipo,
        superficie: d.superficie,
        interior: d.interior,
        precioHora: Number(d.precioHora),
        activa: d.activa,
      };
      if (pistaModal.mode === 'create') {
        const { data } = await apiClient.post(`/pistas/club/${d.clubId}`, payload);
        setCourts(prev => [...prev, {
          id: data.id,
          name: `Pista ${data.numero}`,
          club: '',
          zone: 'Zaragoza',
          address: '',
          type: data.interior ? 'indoor' : 'outdoor',
          surface: data.superficie || data.tipo,
          price: data.precioHora,
          rating: 0,
          reviews: 0,
          active: data.activa,
          image: 'https://res.cloudinary.com/duz19cqos/image/upload/pistas-padel-helios-scaled.jpeg_igvdjx.webp',
          _raw: data,
        }]);
      } else {
        const { data } = await apiClient.put(`/pistas/${d.id}`, payload);
        setCourts(prev => prev.map(c => c.id === d.id ? {
          ...c,
          surface: data.superficie || data.tipo,
          price: data.precioHora,
          active: data.activa,
          type: data.interior ? 'indoor' : 'outdoor',
          _raw: data,
        } : c));
      }
      setPistaModal(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Error al guardar pista');
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    let result = [...reservations];
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(r =>
        r.court_name?.toLowerCase().includes(term) ||
        r.usuario_nombre?.toLowerCase().includes(term) ||
        r.usuario_email?.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') result = result.filter(r => r.status === statusFilter);
    result.sort((a, b) => {
      let va = a[sortField] ?? '', vb = b[sortField] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [reservations, search, statusFilter, sortField, sortDir]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ color: '#475569' }}> ↕</span>;
    return <span style={{ color: '#4ade80' }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>;
  };

  if (loading) return <LoadingSpinner message="Cargando dashboard..." />;
  if (error) return <div style={{ padding: '2rem' }}><ErrorMessage message={error} /></div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Dashboard Administrador</h1>

      {stats && (
        <div style={styles.statsGrid}>
          <StatCard label="Reservas" value={stats.totalReservations} icon="📅" color="#4ade80" />
          <StatCard label="Usuarios" value={stats.totalUsers} icon="👥" color="#60a5fa" />
          <StatCard label="Pistas" value={stats.totalCourts} icon="🎾" color="#f59e0b" />
          <StatCard label="Ingresos est." value={formatPrice(stats.totalRevenue)} icon="💶" color="#a78bfa" />
        </div>
      )}

      <div style={styles.tabRow}>
        {[
          { id: 'reservas', label: `📅 Reservas (${reservations.length})` },
          { id: 'pistas', label: `🎾 Pistas (${courts.length})` },
          { id: 'clubs', label: `🏢 Clubs (${clubs.length})` },
          { id: 'usuarios', label: `👥 Usuarios (${usuarios.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ ...styles.tabBtn, ...(activeTab === t.id ? styles.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'reservas' && (
        <div>
          <div style={styles.filterRow}>
            <input type="text" placeholder="🔍 Buscar..." value={search}
              onChange={e => setSearch(e.target.value)} style={styles.searchInput} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={styles.select}>
              <option value="all">Todos</option>
              <option value="confirmed">Confirmadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
            <span style={styles.counter}>{filtered.length} de {reservations.length}</span>
          </div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  {[['id','#'],['usuario_nombre','Usuario'],['court_name','Pista'],['date','Fecha'],['time_slot','Franja'],['status','Estado'],[null,'Acción']].map(([f,l]) => (
                    <th key={l} onClick={() => f && handleSort(f)}
                      style={{ ...styles.th, cursor: f ? 'pointer' : 'default' }}>
                      {l}{f && <SortIcon field={f} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? '#1e293b' : '#172033' }}>
                    <td style={styles.td}>{r.id}</td>
                    <td style={styles.td}>
                      <div style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{r.usuario_nombre} {r.usuario_apellidos}</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{r.usuario_email}</div>
                    </td>
                    <td style={styles.td}>{r.court_name}</td>
                    <td style={styles.td}>{formatDate(r.date)}</td>
                    <td style={styles.td}>{r.time_slot}</td>
                    <td style={styles.td}><StatusBadge status={r.status} /></td>
                    <td style={styles.td}>
                      {r.status === 'confirmed' && (
                        <button onClick={() => handleCancelReservation(r.id)} style={styles.dangerBtn}>Cancelar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pistas' && (
        <div>
          <button onClick={() => setPistaModal({ mode: 'create', data: { ...EMPTY_PISTA } })} style={styles.createBtn}>
            + Nueva pista
          </button>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  {['#','Nombre','Tipo','Superficie','Precio/h','Estado','Acciones'].map(l => (
                    <th key={l} style={styles.th}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courts.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#1e293b' : '#172033' }}>
                    <td style={styles.td}>{c.id}</td>
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.td}>{c.type === 'indoor' ? '🏠 Interior' : '☀️ Exterior'}</td>
                    <td style={styles.td}>{c.surface || '—'}</td>
                    <td style={styles.td}>{formatPrice(c.price)}</td>
                    <td style={styles.td}>
                      <span style={{ color: c.active ? '#4ade80' : '#ef4444', fontSize: '0.8rem' }}>
                        {c.active ? '✓ Activa' : '✗ Inactiva'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => setPistaModal({ mode: 'edit', data: {
                        id: c.id,
                        numero: c._raw?.numero || 1,
                        tipo: c._raw?.tipo || 'cristal',
                        superficie: c._raw?.superficie || '',
                        interior: c.type === 'indoor',
                        precioHora: c.price,
                        activa: c.active,
                      }})} style={{ ...styles.editBtn, marginRight: '0.4rem' }}>Editar</button>
                      <button onClick={() => handleDeleteCourt(c.id)} style={styles.dangerBtn}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'clubs' && (
        <div>
          <button onClick={() => setClubModal({ mode: 'create', data: { ...EMPTY_CLUB } })} style={styles.createBtn}>
            + Nuevo club
          </button>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  {['#','Nombre','Ciudad','Teléfono','Email','Estado','Acciones'].map(l => (
                    <th key={l} style={styles.th}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clubs.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#1e293b' : '#172033' }}>
                    <td style={styles.td}>{c.id}</td>
                    <td style={styles.td}>{c.nombre}</td>
                    <td style={styles.td}>{c.ciudad}</td>
                    <td style={styles.td}>{c.telefono || '—'}</td>
                    <td style={styles.td}>{c.email || '—'}</td>
                    <td style={styles.td}>
                      <span style={{ color: c.activo ? '#4ade80' : '#ef4444', fontSize: '0.8rem' }}>
                        {c.activo ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => setClubModal({ mode: 'edit', data: {
                        id: c.id,
                        nombre: c.nombre,
                        ciudad: c.ciudad,
                        direccion: c.direccion || '',
                        telefono: c.telefono || '',
                        email: c.email || '',
                        activo: c.activo,
                        fechaApertura: c.fechaApertura || null,
                      }})} style={{ ...styles.editBtn, marginRight: '0.4rem' }}>Editar</button>
                      <button onClick={() => handleDeleteClub(c.id)} style={styles.dangerBtn}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  {['#','Nombre','Email','Teléfono','Nivel','Acción'].map(l => (
                    <th key={l} style={styles.th}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? '#1e293b' : '#172033' }}>
                    <td style={styles.td}>{u.id}</td>
                    <td style={styles.td}>{u.nombre} {u.apellidos}</td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>{u.telefono || '—'}</td>
                    <td style={styles.td}>{u.nivel || '—'}</td>
                    <td style={styles.td}>
                      <button onClick={() => handleDeleteUsuario(u.id)} style={styles.dangerBtn}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {clubModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>{clubModal.mode === 'create' ? 'Nuevo club' : 'Editar club'}</h2>
            {[
              ['nombre','Nombre *','text'],
              ['ciudad','Ciudad *','text'],
              ['direccion','Dirección','text'],
              ['telefono','Teléfono (9 dígitos)','text'],
              ['email','Email','email'],
            ].map(([field, label, type]) => (
              <div key={field} style={{ marginBottom: '0.75rem' }}>
                <label style={styles.label}>{label}</label>
                <input type={type} value={clubModal.data[field] || ''}
                  onChange={e => setClubModal(m => ({ ...m, data: { ...m.data, [field]: e.target.value } }))}
                  style={styles.input} />
              </div>
            ))}
            <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={clubModal.data.activo}
                onChange={e => setClubModal(m => ({ ...m, data: { ...m.data, activo: e.target.checked } }))} />
              <label style={styles.label}>Activo</label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setClubModal(null)} style={styles.cancelModalBtn}>Cancelar</button>
              <button onClick={handleSaveClub} disabled={saving} style={styles.saveBtn}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pistaModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>{pistaModal.mode === 'create' ? 'Nueva pista' : 'Editar pista'}</h2>
            {pistaModal.mode === 'create' && (
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={styles.label}>Club *</label>
                <select value={pistaModal.data.clubId}
                  onChange={e => setPistaModal(m => ({ ...m, data: { ...m.data, clubId: e.target.value } }))}
                  style={styles.input}>
                  <option value="">Selecciona un club</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}
            {[
              ['numero','Número de pista *','number'],
              ['tipo','Tipo (cristal, cemento...)','text'],
              ['superficie','Superficie','text'],
              ['precioHora','Precio/hora (€) *','number'],
            ].map(([field, label, type]) => (
              <div key={field} style={{ marginBottom: '0.75rem' }}>
                <label style={styles.label}>{label}</label>
                <input type={type} value={pistaModal.data[field] || ''}
                  onChange={e => setPistaModal(m => ({ ...m, data: { ...m.data, [field]: e.target.value } }))}
                  style={styles.input} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
              <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input type="checkbox" checked={pistaModal.data.interior}
                  onChange={e => setPistaModal(m => ({ ...m, data: { ...m.data, interior: e.target.checked } }))} />
                Interior
              </label>
              <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input type="checkbox" checked={pistaModal.data.activa}
                  onChange={e => setPistaModal(m => ({ ...m, data: { ...m.data, activa: e.target.checked } }))} />
                Activa
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setPistaModal(null)} style={styles.cancelModalBtn}>Cancelar</button>
              <button onClick={handleSavePista} disabled={saving} style={styles.saveBtn}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' },
  title: { color: '#f1f5f9', fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' },
  tabRow: { display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '1px solid #334155' },
  tabBtn: { padding: '0.6rem 1.2rem', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 },
  tabActive: { color: '#4ade80', borderBottom: '2px solid #4ade80' },
  filterRow: { display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' },
  searchInput: { flex: '2 1 220px', padding: '0.55rem 0.8rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' },
  select: { flex: '1 1 160px', padding: '0.55rem 0.7rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.85rem' },
  counter: { color: '#64748b', fontSize: '0.85rem', marginLeft: 'auto' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  thead: { background: '#0f172a' },
  th: { color: '#94a3b8', padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #334155', whiteSpace: 'nowrap' },
  td: { color: '#cbd5e1', padding: '0.7rem 1rem', borderBottom: '1px solid #1e293b', verticalAlign: 'middle' },
  dangerBtn: { background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.25rem 0.6rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.78rem' },
  editBtn: { background: 'transparent', border: '1px solid #60a5fa', color: '#60a5fa', padding: '0.25rem 0.6rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.78rem' },
  createBtn: { background: '#4ade80', color: '#0f172a', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', marginTop: 0 },
  label: { color: '#94a3b8', fontSize: '0.82rem', display: 'block', marginBottom: '0.3rem' },
  input: { width: '100%', padding: '0.5rem 0.7rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '0.9rem', boxSizing: 'border-box' },
  saveBtn: { background: '#4ade80', color: '#0f172a', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' },
  cancelModalBtn: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' },
};