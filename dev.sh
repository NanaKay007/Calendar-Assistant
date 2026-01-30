#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# Calendar Assistant — local dev launcher
# Starts backend (Express) and frontend (Vite) concurrently.
# ──────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/app"

# Colours
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No colour

log() { echo -e "${CYAN}[dev]${NC} $*"; }
err() { echo -e "${RED}[dev]${NC} $*" >&2; }

# ── Pre-flight checks ────────────────────────

if ! command -v node &>/dev/null; then
  err "node is not installed. Install Node.js >= 18."
  exit 1
fi

if ! command -v mongod &>/dev/null && ! command -v mongosh &>/dev/null; then
  log "${RED}Warning:${NC} MongoDB doesn't appear to be installed locally."
  log "Make sure a MongoDB instance is reachable at the URI in your .env.dev.local"
fi

if [ ! -f "$BACKEND_DIR/.env.dev.local" ]; then
  err "Missing $BACKEND_DIR/.env.dev.local"
  err "Copy .env.dev.local.example and fill in your credentials:"
  err "  cp $BACKEND_DIR/.env.dev.local.example $BACKEND_DIR/.env.dev.local"
  exit 1
fi

# ── Install dependencies if needed ───────────

install_if_needed() {
  local dir="$1" name="$2"
  if [ ! -d "$dir/node_modules" ]; then
    log "Installing $name dependencies..."
    (cd "$dir" && npm install)
  fi
}

install_if_needed "$BACKEND_DIR" "backend"
install_if_needed "$FRONTEND_DIR" "frontend"

# ── Launch both processes ────────────────────

cleanup() {
  log "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  log "Done."
}
trap cleanup EXIT INT TERM

log "Starting backend (http://localhost:3000)..."
(cd "$BACKEND_DIR" && npm run dev) &
BACKEND_PID=$!

# Give backend a moment to start before launching frontend
sleep 2

log "Starting frontend (http://localhost:5173)..."
(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Calendar Assistant — Local Development${NC}"
echo -e "${GREEN}────────────────────────────────────────────────${NC}"
echo -e "  Frontend:  ${CYAN}http://localhost:5173${NC}"
echo -e "  Backend:   ${CYAN}http://localhost:3000${NC}"
echo -e "  Health:    ${CYAN}http://localhost:3000/health${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "  Press ${RED}Ctrl+C${NC} to stop both servers."
echo ""

wait
