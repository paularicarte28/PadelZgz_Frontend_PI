import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourt } from '../hooks/useCourts';
import { useReservations } from '../hooks/useReservations';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, ErrorMessage } from '../components/ui/Feedback';
import { formatPrice, formatRating, getTypeLabel } from '../utils/formatters';
import { reservationsService } from '../services/reservationsService';

export default function CourtDetail() {
  const { id } = useParams();
  const { court, loading, error } = useCourt(id);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [date, setDate] = useState('');
  const [slots, setSlots] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [players, setPlayers] = useState(2);
  const [bookingStatus, setBookingStatus] = useState(null); // { type: 'success'|'error', msg }

  const today = new Date().toISOString().split('T')[0];

  async function handleDateChange(e) {
    const d = e.target.value;
    setDate(d);
    setSelectedSlot('');
    setSlots(null);
    if (!d) return;
    setLoadingSlots(true);
    try {
      const data = await reservationsService.getSlots(id, d);
      setSlots(data.slots);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleReserve() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/pistas/${id}` } } });
      return;
    }
    if (!date || !selectedSlot) return;
    setBookingStatus(null);
    try {
      await reservationsService.create(id, date, selectedSlot, players);
      setBookingStatus({ type: 'success', msg: `✅ Reserva confirmada para el ${date} a las ${selectedSlot}` });
      setSelectedSlot('');
      setSlots(null);
      setDate('');
    } catch (err) {
      setBookingStatus({ type: 'error', msg: err.response?.data?.error || 'Error al reservar' });
    }
  }

  if (loading) return <LoadingSpinner message="Cargando pista..." />;
  if (error) return <div style={{ padding: '2rem' }}><ErrorMessage message={error} /></div>;
  if (!court) return null;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backBtn}>← Volver</button>

      <div style={styles.header}>
        <img
          src={court.image || 'https://placehold.co/900x300/1e293b/4ade80?text=Pista+de+Padel'}
          alt={court.name}
          style={styles.img}
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/900x300/1e293b/4ade80?text=Pista+de+Padel'; }}
        />
      </div>

      <div style={styles.layout}>
        <div style={styles.info}>
          <span style={styles.typeBadge}>{getTypeLabel(court.type)} · {court.surface}</span>
          <h1 style={styles.name}>{court.name}</h1>
          <p style={styles.club}>📍 {court.club} · {court.zone}</p>
          <p style={styles.club}>{court.address}</p>
          <p style={styles.rating}>⭐ {formatRating(court.rating)} <span style={{ color: '#64748b', fontSize: '0.85rem' }}>({court.reviews} reseñas)</span></p>
          <p style={styles.price}>{formatPrice(court.price)} / hora</p>
          <p style={styles.desc}>{court.description}</p>

          {court.amenities?.length > 0 && (
            <div>
              <p style={styles.sectionTitle}>Instalaciones:</p>
              <div style={styles.amenities}>
                {court.amenities.map((a) => (
                  <span key={a} style={styles.tag}>{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={styles.booking}>
          <h2 style={styles.bookingTitle}>Reservar pista</h2>

          <label style={styles.label}>Fecha</label>
          <input
            type="date"
            min={today}
            value={date}
            onChange={handleDateChange}
            style={styles.input}
          />

          {loadingSlots && <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Cargando franjas...</p>}

          {slots !== null && (
            <>
              <label style={styles.label}>Franja horaria disponible</label>
              {slots.length === 0 ? (
                <p style={{ color: '#fca5a5', fontSize: '0.9rem' }}>No hay franjas disponibles para este día</p>
              ) : (
                <div style={styles.slots}>
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSlot(s)}
                      style={{ ...styles.slotBtn, ...(selectedSlot === s ? styles.slotSelected : {}) }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {selectedSlot && (
            <>
              <label style={styles.label}>Jugadores</label>
              <select value={players} onChange={(e) => setPlayers(Number(e.target.value))} style={styles.input}>
                <option value={2}>2 jugadores</option>
                <option value={4}>4 jugadores</option>
              </select>

              <div style={styles.summary}>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Resumen de reserva:</p>
                <p style={{ color: '#f1f5f9', margin: '0.3rem 0 0' }}>
                  {court.name} · {date} · {selectedSlot} · {players} jugadores
                </p>
                <p style={{ color: '#4ade80', fontWeight: 700, margin: '0.3rem 0 0' }}>
                  Total: {formatPrice(court.price)}
                </p>
              </div>

              <button onClick={handleReserve} style={styles.reserveBtn}>
                {isAuthenticated ? 'Confirmar reserva' : 'Inicia sesión para reservar'}
              </button>
            </>
          )}

          {bookingStatus && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px',
              background: bookingStatus.type === 'success' ? '#14532d' : '#2d1515',
              color: bookingStatus.type === 'success' ? '#4ade80' : '#fca5a5',
              fontSize: '0.9rem',
            }}>
              {bookingStatus.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '1000px', margin: '0 auto', padding: '1.5rem' },
  backBtn: { background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', marginBottom: '1rem' },
  header: { borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem' },
  img: { width: '100%', height: '280px', objectFit: 'cover' },
  layout: { display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem' },
  info: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  typeBadge: { color: '#4ade80', fontSize: '0.8rem', fontWeight: 600 },
  name: { color: '#f1f5f9', fontSize: '1.8rem', margin: 0 },
  club: { color: '#94a3b8', fontSize: '0.9rem', margin: 0 },
  rating: { color: '#fbbf24', fontWeight: 600, margin: 0 },
  price: { color: '#4ade80', fontSize: '1.5rem', fontWeight: 700, margin: 0 },
  desc: { color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6' },
  sectionTitle: { color: '#94a3b8', fontSize: '0.85rem', margin: '0.5rem 0 0.4rem' },
  amenities: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  tag: { background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.8rem' },
  booking: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  bookingTitle: { color: '#f1f5f9', margin: 0, fontSize: '1.2rem' },
  label: { color: '#94a3b8', fontSize: '0.85rem', display: 'block' },
  input: { width: '100%', padding: '0.55rem 0.7rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.9rem', boxSizing: 'border-box' },
  slots: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  slotBtn: { padding: '0.4rem 0.7rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem' },
  slotSelected: { background: '#14532d', borderColor: '#4ade80', color: '#4ade80', fontWeight: 600 },
  summary: { background: '#0f172a', borderRadius: '8px', padding: '0.75rem', border: '1px solid #334155' },
  reserveBtn: { background: '#4ade80', color: '#1a1a2e', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', width: '100%' },
};
