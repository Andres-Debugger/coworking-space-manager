import { useState } from 'react';
import { useRouter } from 'next/router';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Usuario');
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });

    if (!res.ok) {
      const body = await res.json();
      setMessage(body.detail || 'Error al registrar');
      return;
    }

    setMessage('Registro exitoso. Puedes iniciar sesión.');
    setTimeout(() => router.push('/login'), 1000);
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>Registrarse</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 420, display: 'grid', gap: 12 }}>
        <label>
          Usuario
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label>
          Rol
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="Usuario">Usuario</option>
            <option value="Admin">Admin</option>
          </select>
        </label>
        <button type="submit">Crear cuenta</button>
        {message ? <div style={{ marginTop: 8 }}>{message}</div> : null}
      </form>
      <p style={{ marginTop: 16 }}>
        ¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>
      </p>
    </main>
  );
}
