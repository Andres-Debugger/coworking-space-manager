FROM rust:1.78-slim

WORKDIR /app

RUN apt-get update && apt-get install -y pkg-config libssl-dev git && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml ./
COPY src ./src

RUN cargo build --release

EXPOSE 8003
CMD ["/app/target/release/reservation-service"]
