import os
import sqlite3
import datetime
from typing import Optional

import jwt
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext

DB_PATH = os.getenv("DB_PATH", "./data/auth.db")
JWT_SECRET = os.getenv("JWT_SECRET", "supersecret123")
JWT_ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
app = FastAPI(title="Auth Service")

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: str


def init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def get_user(username: str) -> Optional[dict]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash, role FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"id": row[0], "username": row[1], "password_hash": row[2], "role": row[3]}
    return None


def create_user(username: str, password: str, role: str) -> dict:
    password_hash = pwd_context.hash(password)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            (username, password_hash, role),
        )
        conn.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    conn.close()
    return {"id": user_id, "username": username, "role": role}


def create_token(username: str, role: str) -> str:
    payload = {
        "sub": username,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.post("/register", response_model=dict)
def register(request: RegisterRequest):
    if request.role not in ["Admin", "Usuario"]:
        raise HTTPException(status_code=400, detail="Rol inválido")
    user = create_user(request.username, request.password, request.role)
    return {"id": user["id"], "username": user["username"], "role": user["role"]}


@app.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    user = get_user(request.username)
    if not user or not pwd_context.verify(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    token = create_token(user["username"], user["role"])
    return {"access_token": token, "token_type": "bearer", "role": user["role"]}


@app.get("/health")
def health():
    return {"status": "ok"}
