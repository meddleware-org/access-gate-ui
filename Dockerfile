# ── build stage ───────────────────────────────────────────────────────────────
# Standalone build — the Docker context is this repo root. All @meddleware/*
# dependencies (including @meddleware/access-gate-client) resolve from the npm registry,
# so access-gate-client must be published before this image is built.
#
#   docker build \
#     --build-arg VITE_NETWORK=testnet \
#     -t access-gate-ui:<tag> .
#
# Build args (VITE_* are baked into the static bundle at build time):
#   VITE_NETWORK          — "testnet" | "mainnet"  (default: testnet)
#   VITE_GATE_FREEZE_REQUIRES_UNPAUSED / VITE_GATE_LOCK_COMMISSION_ON_FREEZE /
#   VITE_GATE_PAUSE_BLOCKS_DECRYPTION / VITE_GATE_PAUSE_BLOCKS_ACCESS
#                         — immutable GatePolicy restrictions on created gates (default: false)
#   VITE_GATE_MIN_PRICE_MIST — "auto" (the on-chain minimum paid price) or a higher MIST floor
#                         (default: auto)
#   VITE_GATE_ALLOW_FREE  — allow price-0 gates, which pay the free-gate fee  (default: true)
# The access_gate packageId and PlatformConfig id come from @meddleware/access-gate-client/deployments
# (commission enforcement) — they are NOT build args.
# Content-Security-Policy served by static-server (verified 2026-09-30: production build loaded in
# Chromium under this policy with zero violations). script-src stays 'self'; connect-src allows
# any https origin because RPC, relay, aggregator and Seal key-server hosts are partly operator- or
# chain-configured; img-src allows https:/data:/blob: for on-chain images and local previews.
ARG CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests"

FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build

WORKDIR /app

# Copy the manifest + lockfile first for layer-cache efficiency.
COPY package.json package-lock.json ./

RUN npm ci

COPY . .

ARG VITE_NETWORK=testnet
ARG VITE_GATE_FREEZE_REQUIRES_UNPAUSED=false
ARG VITE_GATE_LOCK_COMMISSION_ON_FREEZE=false
ARG VITE_GATE_PAUSE_BLOCKS_DECRYPTION=false
ARG VITE_GATE_PAUSE_BLOCKS_ACCESS=false
ARG VITE_GATE_MIN_PRICE_MIST=auto
ARG VITE_GATE_ALLOW_FREE=true

ENV VITE_NETWORK=${VITE_NETWORK} \
    VITE_GATE_FREEZE_REQUIRES_UNPAUSED=${VITE_GATE_FREEZE_REQUIRES_UNPAUSED} \
    VITE_GATE_LOCK_COMMISSION_ON_FREEZE=${VITE_GATE_LOCK_COMMISSION_ON_FREEZE} \
    VITE_GATE_PAUSE_BLOCKS_DECRYPTION=${VITE_GATE_PAUSE_BLOCKS_DECRYPTION} \
    VITE_GATE_PAUSE_BLOCKS_ACCESS=${VITE_GATE_PAUSE_BLOCKS_ACCESS} \
    VITE_GATE_MIN_PRICE_MIST=${VITE_GATE_MIN_PRICE_MIST} \
    VITE_GATE_ALLOW_FREE=${VITE_GATE_ALLOW_FREE}

RUN npm run build

# ── runtime stage ─────────────────────────────────────────────────────────────
# static-server is a minimal Go binary image — no shell, no package manager.
# SPA_FALLBACK serves index.html for any extensionless path (Vue Router history mode).
# CACHE_IMMUTABLE_PREFIX matches the /assets/ directory Vite emits with content hashes.
FROM quay.io/meddleware-org/static-server:0.1.3@sha256:664e1c460b4558e20bf3f1b6b2a7ef5e914392edc0a4a125867d6fa822ff92e5
ARG CSP
ENV CONTENT_SECURITY_POLICY="${CSP}"

COPY --from=build /app/dist /app/public

ENV SERVE_DIR=/app/public \
    SPA_FALLBACK=true \
    CACHE_IMMUTABLE_PREFIX=/assets/

EXPOSE 8080
