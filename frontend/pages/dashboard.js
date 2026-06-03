import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function DashboardPage() {
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [user, setUser] = useState('');
  const [spaces, setSpaces] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [reports, setReports] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [newSpace, setNewSpace] = useState({ name: '', capacity: 1, price: 0 });
  const [billing, setBilling] = useState({ user: '', amount: 0, description: '' });
  const router = useRouter();

  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('coworking_token') : null;
    const savedRole = typeof window !== 'undefined' ? localStorage.getItem('coworking_role') : null;
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('coworking_user') : null;
    if (!savedToken) {
      router.push('/login');
      return;
    }
    setToken(savedToken);
    setRole(savedRole || 'Usuario');
    setUser(savedUser || '');
  }, [router]);

  useEffect(() => {
    if (!token) return;
    fetchSpaces();
    if (role === 'Usuario') {
      fetchReservations();
    }
    if (role === 'Admin') {
      fetchReports();
      fetchInvoices();
    }
  }, [token, role]);

  async function fetchSpaces() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_MANAGEMENT_URL}/spaces`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSpaces(data);
    } catch (err) {
      setError('No se pudo cargar los espacios');
    }
  }

  async function fetchReservations() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_RESERVATION_URL}/reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setReservations(data);
    } catch (err) {
      setError('No se pudo cargar las reservas');
    }
  }

  async function fetchReports() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_MANAGEMENT_URL}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setReports(data);
    } catch (err) {
      setError('No se pudo cargar los reportes');
    }
  }

  async function fetchInvoices() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_MANAGEMENT_URL}/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      setError('No se pudo cargar facturas');
    }
  }

  async function handleReserve(spaceId) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_RESERVATION_URL}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ space_id: spaceId, date: new Date().toISOString().slice(0, 10) }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.message || 'Error al reservar');
        return;
      }
      await fetchReservations();
      setError('Reserva creada correctamente');
    } catch (err) {
      setError('No se pudo crear la reserva');
    }
  }

  async function handleAddSpace(event) {
    event.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_MANAGEMENT_URL}/spaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newSpace),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.message || 'Error al crear espacio');
        return;
      }
      setNewSpace({ name: '', capacity: 1, price: 0 });
      fetchSpaces();
      setError('Espacio creado correctamente');
    } catch (err) {
      setError('No se pudo crear el espacio');
    }
  }

  async function handleBilling(event) {
    event.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_MANAGEMENT_URL}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(billing),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.message || 'Error al crear factura');
        return;
      }
      setBilling({ user: '', amount: 0, description: '' });
      fetchInvoices();
      setError('Factura creada correctamente');
    } catch (err) {
      setError('No se pudo crear la factura');
    }
  }

  function handleLogout() {
    localStorage.removeItem('coworking_token');
    localStorage.removeItem('coworking_role');
    localStorage.removeItem('coworking_user');
    router.push('/login');
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>Dashboard</h1>
      <p>Bienvenido, <strong>{user}</strong> ({role})</p>
      <button onClick={handleLogout}>Cerrar sesión</button>

      {error ? <div style={{ marginTop: 16, color: 'red' }}>{error}</div> : null}

      <section style={{ marginTop: 24 }}>
        <h2>Espacios disponibles</h2>
        {spaces.length === 0 ? <p>No hay espacios creados.</p> : (
          <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Capacidad</th>
                <th>Precio</th>
                {role === 'Usuario' ? <th>Reservar</th> : null}
              </tr>
            </thead>
            <tbody>
              {spaces.map((space) => (
                <tr key={space.id}>
                  <td>{space.id}</td>
                  <td>{space.name}</td>
                  <td>{space.capacity}</td>
                  <td>{space.price}</td>
                  {role === 'Usuario' ? (
                    <td><button onClick={() => handleReserve(space.id)}>Reservar</button></td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {role === 'Admin' ? (
        <section style={{ marginTop: 24 }}>
          <h2>Crear nuevo espacio</h2>
          <form onSubmit={handleAddSpace} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
            <label>
              Nombre
              <input value={newSpace.name} onChange={(e) => setNewSpace({ ...newSpace, name: e.target.value })} required />
            </label>
            <label>
              Capacidad
              <input type="number" value={newSpace.capacity} onChange={(e) => setNewSpace({ ...newSpace, capacity: Number(e.target.value) })} min="1" required />
            </label>
            <label>
              Precio
              <input type="number" step="0.01" value={newSpace.price} onChange={(e) => setNewSpace({ ...newSpace, price: Number(e.target.value) })} min="0" required />
            </label>
            <button type="submit">Guardar espacio</button>
          </form>
        </section>
      ) : null}

      {role === 'Admin' ? (
        <section style={{ marginTop: 24 }}>
          <h2>Reportes</h2>
          {reports ? (
            <div>
              <p>Total espacios: {reports.total_spaces}</p>
              <p>Total facturas: {reports.total_invoices}</p>
              <p>Ingreso total: ${reports.total_income}</p>
            </div>
          ) : <p>Cargando reportes...</p>}
        </section>
      ) : null}

      {role === 'Admin' ? (
        <section style={{ marginTop: 24 }}>
          <h2>Registrar facturación</h2>
          <form onSubmit={handleBilling} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
            <label>
              Usuario
              <input value={billing.user} onChange={(e) => setBilling({ ...billing, user: e.target.value })} required />
            </label>
            <label>
              Monto
              <input type="number" step="0.01" value={billing.amount} onChange={(e) => setBilling({ ...billing, amount: Number(e.target.value) })} required />
            </label>
            <label>
              Descripción
              <input value={billing.description} onChange={(e) => setBilling({ ...billing, description: e.target.value })} required />
            </label>
            <button type="submit">Crear factura</button>
          </form>
        </section>
      ) : null}

      {role === 'Admin' ? (
        <section style={{ marginTop: 24 }}>
          <h2>Facturas recientes</h2>
          {invoices.length === 0 ? <p>No hay facturas.</p> : (
            <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Monto</th>
                  <th>Descripción</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.id}</td>
                    <td>{invoice.user}</td>
                    <td>{invoice.amount}</td>
                    <td>{invoice.description}</td>
                    <td>{invoice.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}

      {role === 'Usuario' ? (
        <section style={{ marginTop: 24 }}>
          <h2>Mis reservas</h2>
          {reservations.length === 0 ? <p>No tienes reservas todavía.</p> : (
            <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Espacio ID</th>
                  <th>Fecha</th>
                  <th>Creado</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td>{reservation.id}</td>
                    <td>{reservation.space_id}</td>
                    <td>{reservation.date}</td>
                    <td>{reservation.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
    </main>
  );
}
