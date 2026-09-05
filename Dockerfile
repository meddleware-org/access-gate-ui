# ── build stage ───────────────────────────────────────────────────────────────
# Standalone build — the Docker context is this repo root. All @meddleware/*
# dependencies (including @meddleware/nft-gate-client) resolve from the npm registry,
# so nft-gate-client must be published before this image is built.
#
#   docker build \
#     --build-arg VITE_NETWORK=testnet \
#     -t access-gate-ui:<tag> .
#
# Build args (VITE_* are baked into the static bundle at build time):
#   VITE_NETWORK          — "testnet" | "mainnet"  (default: testnet)
#   VITE_RPC_TESTNET      — override the default Sui testnet RPC URL (optional)
#   VITE_RPC_MAINNET      — override the default Sui mainnet RPC URL (optional)
# The access_gate packageId and PlatformConfig id are hardcoded in src/constants.ts
# (commission enforcement) — they are NOT build args.
FROM node:24-slim AS build

WORKDIR /app

# Copy the manifest first for layer-cache efficiency.
COPY package.json ./

RUN npm install

COPY . .

ARG VITE_NETWORK=testnet
ARG VITE_RPC_TESTNET
ARG VITE_RPC_MAINNET

ENV VITE_NETWORK=${VITE_NETWORK} \
    VITE_RPC_TESTNET=${VITE_RPC_TESTNET} \
    VITE_RPC_MAINNET=${VITE_RPC_MAINNET}

RUN npm run build

# ── runtime stage ─────────────────────────────────────────────────────────────
# static-server is a minimal Go binary image — no shell, no package manager.
# SPA_FALLBACK serves index.html for any extensionless path (Vue Router history mode).
# CACHE_IMMUTABLE_PREFIX matches the /assets/ directory Vite emits with content hashes.
FROM quay.io/meddleware-org/static-server:0.1.0

COPY --from=build /app/dist /app/public

ENV SERVE_DIR=/app/public \
    SPA_FALLBACK=true \
    CACHE_IMMUTABLE_PREFIX=/assets/

EXPOSE 8080
