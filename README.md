# Co-Working Microservices Platform

Este proyecto demuestra una arquitectura de microservicios con diferentes stacks para cada dominio:

- `frontend`: Next.js
- `auth-service`: FastAPI con SQLite
- `management-service`: Express.js con SQLite
- `reservation-service`: Axum (Rust) con SQLite

Cada servicio es independiente, con Dockerfile propio, y el proyecto principal usa `docker compose` para levantar todos los servicios juntos.

## Servicios

- `auth-service`: registro, login y roles (Admin / Usuario)
- `management-service`: gestión de espacios, facturación y reportes
- `reservation-service`: motor de reservas
- `frontend`: interfaz de usuario para interactuar con todos los servicios

## Requisitos

- Docker
- Docker Compose

## Cómo ejecutar

1. Clona el repositorio:

```bash
git clone <repo-url> coworking-microservices
cd coworking-microservices
```

2. Levanta todos los servicios:

```bash
docker compose up --build
```

3. Abre el navegador en:

```text
http://localhost:3000
```

## Endpoints principales

- `http://localhost:8001`: Auth service
- `http://localhost:8002`: Management service
- `http://localhost:8003`: Reservation service
- `http://localhost:3000`: Frontend

## Flujo de uso

1. Registra un usuario en el frontend.
2. Inicia sesión para recibir un JWT.
3. Si eres Admin, crea y administra espacios.
4. Si eres Usuario, ve los espacios disponibles y reserva.

## Usuarios de ejemplo

- Admin: crea un usuario con rol `Admin` en el formulario de registro.
- Usuario: crea un usuario con rol `Usuario` en el formulario de registro.

## Notas de arquitectura

- Cada servicio mantiene su propia base de datos SQLite local.
- La interoperabilidad se realiza vía REST y JWT.
- `frontend` consume los otros servicios directamente desde el navegador.
- `reservation-service` se comunica con `management-service` para validar espacios.
