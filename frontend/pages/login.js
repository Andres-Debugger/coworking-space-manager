import { useState } from 'react';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.detail || 'Error en inicio de sesión');
      return;
    }

    const data = await res.json();
    localStorage.setItem('coworking_token', data.access_token);
    localStorage.setItem('coworking_role', data.role);
    localStorage.setItem('coworking_user', username);
    router.push('/dashboard');
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>Iniciar sesión</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 420, display: 'grid', gap: 12 }}>
        <label>
          Usuario
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit">Entrar</button>
        {error ? <div style={{ color: 'red' }}>{error}</div> : null}
      </form>
      <p style={{ marginTop: 16 }}>
        ¿No tienes cuenta? <a href="/register">Regístrate</a>
      </p>
    </main>
  );
}
