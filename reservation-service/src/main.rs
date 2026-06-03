use axum::{extract::State, http::StatusCode, response::Json, routing::{get, post}, Router};
use jsonwebtoken::{decode, DecodingKey, Validation};
use reqwest::Client;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{env, net::SocketAddr, path::Path};

#[derive(Clone)]
struct AppState {
    jwt_secret: String,
    management_url: String,
    db_path: String,
    client: Client,
}

#[derive(Debug, Deserialize, Serialize)]
struct Claims {
    sub: String,
    role: String,
    exp: usize,
}

#[derive(Debug, Deserialize)]
struct ReservationRequest {
    space_id: i64,
    date: String,
}

#[derive(Debug, Serialize)]
struct ReservationRecord {
    id: i64,
    user: String,
    space_id: i64,
    date: String,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Space {
    id: i64,
    name: String,
    capacity: i64,
    price: f64,
}

#[derive(Debug, Serialize)]
struct MessageResponse {
    message: String,
}

fn init_db(db_path: &str) {
    if let Some(parent) = Path::new(db_path).parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let conn = Connection::open(db_path).expect("Error opening database");
    conn.execute(
        "CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            space_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )
    .expect("Error creating reservations table");
}

fn verify_jwt(token: &str, secret: &str) -> Result<Claims, String> {
    decode::<Claims>(token, &DecodingKey::from_secret(secret.as_ref()), &Validation::default())
        .map(|data| data.claims)
        .map_err(|err| err.to_string())
}

async fn get_spaces(
    State(state): State<AppState>,
    auth_header: axum::http::HeaderMap,
) -> Result<Json<Vec<Space>>, (StatusCode, Json<MessageResponse>)> {
    let token = auth_header
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_string());

    let mut request = state.client.get(format!("{}/spaces", state.management_url));
    if let Some(header_value) = token {
        request = request.header(axum::http::header::AUTHORIZATION, header_value);
    }

    let response = request
        .send()
        .await
        .map_err(|err| (StatusCode::BAD_GATEWAY, Json(MessageResponse { message: err.to_string() })))?;

    if response.status() != StatusCode::OK {
        return Err((StatusCode::BAD_GATEWAY, Json(MessageResponse { message: "No se pudo obtener espacios".into() })));
    }

    let spaces: Vec<Space> = response
        .json()
        .await
        .map_err(|err| (StatusCode::BAD_GATEWAY, Json(MessageResponse { message: err.to_string() })))?;
    Ok(Json(spaces))
}

async fn list_reservations(
    State(state): State<AppState>,
    auth_header: axum::http::HeaderMap,
) -> Result<Json<Vec<ReservationRecord>>, (StatusCode, Json<MessageResponse>)> {
    let token = auth_header
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or((StatusCode::UNAUTHORIZED, Json(MessageResponse { message: "Token no enviado".into() })))?;

    let claims = verify_jwt(token, &state.jwt_secret).map_err(|_| (StatusCode::UNAUTHORIZED, Json(MessageResponse { message: "Token inválido".into() })))?;

    let conn = Connection::open(&state.db_path).map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, Json(MessageResponse { message: err.to_string() })))?;
    let mut stmt = conn
        .prepare("SELECT id, user, space_id, date, created_at FROM reservations WHERE user = ? ORDER BY created_at DESC")
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, Json(MessageResponse { message: err.to_string() })))?;

    let rows = stmt
        .query_map([claims.sub.as_str()], |row| {
            Ok(ReservationRecord {
                id: row.get(0)?,
                user: row.get(1)?,
                space_id: row.get(2)?,
                date: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, Json(MessageResponse { message: err.to_string() })))?;

    let mut reservations = Vec::new();
    for row in rows {
        reservations.push(row.map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, Json(MessageResponse { message: err.to_string() })))?);
    }

    Ok(Json(reservations))
}

async fn create_reservation(
    State(state): State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<ReservationRequest>,
    auth_header: axum::http::HeaderMap,
) -> Result<(StatusCode, Json<ReservationRecord>), (StatusCode, Json<MessageResponse>)> {
    let token = auth_header
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or((StatusCode::UNAUTHORIZED, Json(MessageResponse { message: "Token no enviado".into() })))?;

    let claims = verify_jwt(token, &state.jwt_secret).map_err(|_| (StatusCode::UNAUTHORIZED, Json(MessageResponse { message: "Token inválido".into() })))?;

    if claims.role != "Usuario" {
        return Err((StatusCode::FORBIDDEN, Json(MessageResponse { message: "Solo Usuario puede reservar".into() })));
    }

    let spaces = get_spaces(state.clone(), auth_header.clone()).await.map_err(|err| err)?;
    let found = spaces.0.iter().any(|space| space.id == payload.space_id);
    if !found {
        return Err((StatusCode::BAD_REQUEST, Json(MessageResponse { message: "Espacio no encontrado".into() })));
    }

    let created_at = chrono::Utc::now().to_rfc3339();
    let conn = Connection::open(&state.db_path).map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, Json(MessageResponse { message: err.to_string() })))?;
    conn.execute(
        "INSERT INTO reservations (user, space_id, date, created_at) VALUES (?, ?, ?, ?)",
        params![claims.sub, payload.space_id, payload.date, created_at],
    )
    .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, Json(MessageResponse { message: err.to_string() })))?;

    let id = conn.last_insert_rowid();
    Ok((
        StatusCode::CREATED,
        Json(ReservationRecord {
            id,
            user: claims.sub,
            space_id: payload.space_id,
            date: payload.date,
            created_at,
        }),
    ))
}

async fn health() -> Json<MessageResponse> {
    Json(MessageResponse { message: "ok".into() })
}

#[tokio::main]
async fn main() {
    let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| "supersecret123".into());
    let management_url = env::var("MANAGEMENT_URL").unwrap_or_else(|_| "http://localhost:8002".into());
    let db_path = env::var("DB_PATH").unwrap_or_else(|_| "./data/reservations.db".into());

    init_db(&db_path);

    let state = AppState {
        jwt_secret,
        management_url,
        db_path,
        client: Client::new(),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/spaces", get(get_spaces))
        .route("/reservations", get(list_reservations))
        .route("/reserve", post(create_reservation))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8003));
    println!("Reservation service listening on http://{}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
