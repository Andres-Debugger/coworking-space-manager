import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>Co-Working Microservices</h1>
      <p>Usa el sistema con JWT y microservicios independientes.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/login"><button>Iniciar sesión</button></Link>
        <Link href="/register"><button>Registrarse</button></Link>
        <Link href="/dashboard"><button>Ir al dashboard</button></Link>
      </div>
      <section style={{ marginTop: 24 }}>
        <h2>Servicios disponibles</h2>
        <ul>
          <li>Auth: registro/login y roles</li>
          <li>Management: espacios, facturas y reportes</li>
          <li>Reservas: motor de reservas con validación cruzada</li>
        </ul>
      </section>
    </main>
  );
}
