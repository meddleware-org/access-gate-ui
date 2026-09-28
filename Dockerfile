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
#   VITE_GATE_FREEZE_REQUIRES_UNPAUSED / VITE_GATE_LOCK_COMMISSION_ON_FREEZE /
#   VITE_GATE_PAUSE_BLOCKS_DECRYPTION
#                         — immutable GatePolicy restrictions on created gates (default: false)
#   VITE_GATE_MIN_PRICE_MIST — "auto" (smallest commission-bearing price) or a MIST integer
#                         (0 = no minimum)  (default: auto)
#   VITE_GATE_ALLOW_FREE  — allow price-0 gates  (default: true)
# The access_gate packageId and PlatformConfig id are hardcoded in src/constants.ts
# (commission enforcement) — they are NOT build args.
FROM node:24-slim AS build

WORKDIR /app

# Copy the manifest + lockfile first for layer-cache efficiency.
COPY package.json package-lock.json ./

RUN npm ci

COPY . .

ARG VITE_NETWORK=testnet
ARG VITE_RPC_TESTNET
ARG VITE_RPC_MAINNET
ARG VITE_GATE_FREEZE_REQUIRES_UNPAUSED=false
ARG VITE_GATE_LOCK_COMMISSION_ON_FREEZE=false
ARG VITE_GATE_PAUSE_BLOCKS_DECRYPTION=false
ARG VITE_GATE_MIN_PRICE_MIST=auto
ARG VITE_GATE_ALLOW_FREE=true

ENV VITE_NETWORK=${VITE_NETWORK} \
    VITE_RPC_TESTNET=${VITE_RPC_TESTNET} \
    VITE_RPC_MAINNET=${VITE_RPC_MAINNET} \
    VITE_GATE_FREEZE_REQUIRES_UNPAUSED=${VITE_GATE_FREEZE_REQUIRES_UNPAUSED} \
    VITE_GATE_LOCK_COMMISSION_ON_FREEZE=${VITE_GATE_LOCK_COMMISSION_ON_FREEZE} \
    VITE_GATE_PAUSE_BLOCKS_DECRYPTION=${VITE_GATE_PAUSE_BLOCKS_DECRYPTION} \
    VITE_GATE_MIN_PRICE_MIST=${VITE_GATE_MIN_PRICE_MIST} \
    VITE_GATE_ALLOW_FREE=${VITE_GATE_ALLOW_FREE}

RUN npm run build

# ── runtime stage ─────────────────────────────────────────────────────────────
# static-server is a minimal Go binary image — no shell, no package manager.
# SPA_FALLBACK serves index.html for any extensionless path (Vue Router history mode).
# CACHE_IMMUTABLE_PREFIX matches the /assets/ directory Vite emits with content hashes.
FROM quay.io/meddleware-org/static-server:0.1.1

COPY --from=build /app/dist /app/public

ENV SERVE_DIR=/app/public \
    SPA_FALLBACK=true \
    CACHE_IMMUTABLE_PREFIX=/assets/

EXPOSE 8080
