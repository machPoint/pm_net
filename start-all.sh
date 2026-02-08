#!/usr/bin/env bash
set -euo pipefail

# Load nvm if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
mkdir -p "$LOG_DIR"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $cmd" >&2
    return 1
  fi
}

pick_terminal() {
  if command -v x-terminal-emulator >/dev/null 2>&1; then
    echo "x-terminal-emulator"
    return 0
  fi
  if command -v lxterminal >/dev/null 2>&1; then
    echo "lxterminal"
    return 0
  fi
  if command -v xfce4-terminal >/dev/null 2>&1; then
    echo "xfce4-terminal"
    return 0
  fi
  if command -v gnome-terminal >/dev/null 2>&1; then
    echo "gnome-terminal"
    return 0
  fi
  if command -v konsole >/dev/null 2>&1; then
    echo "konsole"
    return 0
  fi
  if command -v xterm >/dev/null 2>&1; then
    echo "xterm"
    return 0
  fi
  return 1
}

spawn_in_terminal() {
  local title="$1"
  local cwd="$2"
  local cmd="$3"

  # Wrap command to ensure nvm is loaded
  local wrapped_cmd="export NVM_DIR=\"\$HOME/.nvm\"; [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"; cd \"$cwd\" && $cmd"

  local term
  term="$(pick_terminal 2>/dev/null || true)"

  if [[ -z "${term}" ]]; then
    echo "WARN: No terminal emulator found. Starting '$title' in background."
    (
      nohup bash -c "$wrapped_cmd" >"$LOG_DIR/${title}.log" 2>&1 &
      echo $! >"$LOG_DIR/${title}.pid"
    )
    return 0
  fi

  case "$term" in
    x-terminal-emulator)
      x-terminal-emulator -T "$title" -e bash -c "$wrapped_cmd; echo; echo '[Process exited] Press Enter to close...'; read" &
      ;;
    lxterminal)
      lxterminal --title="$title" -e bash -c "$wrapped_cmd; echo; echo '[Process exited] Press Enter to close...'; read" &
      ;;
    xfce4-terminal)
      xfce4-terminal --title="$title" --hold -e bash -c "$wrapped_cmd" &
      ;;
    gnome-terminal)
      gnome-terminal --title="$title" -- bash -c "$wrapped_cmd; echo; echo '[Process exited] Press Enter to close...'; read" &
      ;;
    konsole)
      konsole --new-tab -p tabtitle="$title" -e bash -c "$wrapped_cmd; echo; echo '[Process exited] Press Enter to close...'; read" &
      ;;
    xterm)
      xterm -T "$title" -e bash -c "$wrapped_cmd; echo; echo '[Process exited] Press Enter to close...'; read" &
      ;;
    *)
      echo "WARN: Unsupported terminal emulator '$term'. Starting '$title' in background."
      nohup bash -c "$wrapped_cmd" >"$LOG_DIR/${title}.log" 2>&1 &
      ;;
  esac
}

main() {
  echo "========================================"
  echo " Net PM Core System Startup (Linux)"
  echo "========================================"
  echo
  echo "Starting services:"
  echo "  1) OPAL_SE Server    (http://localhost:7788)"
  echo "  2) CORE_UI Backend   (http://localhost:8000)"
  echo "  3) CORE_UI Frontend  (http://localhost:3000)"
  echo

  require_cmd node
  require_cmd npm
  require_cmd python3

  if [[ ! -d "$ROOT_DIR/apps/OPAL_SE" ]]; then
    echo "ERROR: Missing directory: apps/OPAL_SE" >&2
    exit 1
  fi
  if [[ ! -d "$ROOT_DIR/apps/CORE_UI/backend" ]]; then
    echo "ERROR: Missing directory: apps/CORE_UI/backend" >&2
    exit 1
  fi
  if [[ ! -d "$ROOT_DIR/apps/CORE_UI/frontend" ]]; then
    echo "ERROR: Missing directory: apps/CORE_UI/frontend" >&2
    exit 1
  fi

  echo "========================================"
  echo " Checking dependencies"
  echo "========================================"

  if [[ ! -d "$ROOT_DIR/apps/OPAL_SE/node_modules" ]]; then
    echo "[OPAL_SE] Installing npm deps..."
    (cd "$ROOT_DIR/apps/OPAL_SE" && npm install)
  fi

  if [[ ! -d "$ROOT_DIR/apps/CORE_UI/frontend/node_modules" ]]; then
    echo "[CORE_UI/frontend] Installing npm deps..."
    (cd "$ROOT_DIR/apps/CORE_UI/frontend" && npm install)
  fi

  local backend_venv="$ROOT_DIR/apps/CORE_UI/backend/core_env"
  if [[ ! -d "$backend_venv" ]]; then
    echo "[CORE_UI/backend] Creating venv..."
    (cd "$ROOT_DIR/apps/CORE_UI/backend" && python3 -m venv core_env)
  fi

  # Determine activate script location (Linux: bin/, Windows: Scripts/)
  local activate_script=""
  if [[ -f "$backend_venv/bin/activate" ]]; then
    activate_script="core_env/bin/activate"
  elif [[ -f "$backend_venv/Scripts/activate" ]]; then
    activate_script="core_env/Scripts/activate"
  else
    echo "ERROR: Cannot find venv activate script. Recreating venv..."
    rm -rf "$backend_venv"
    (cd "$ROOT_DIR/apps/CORE_UI/backend" && python3 -m venv core_env)
    activate_script="core_env/bin/activate"
  fi

  echo "[CORE_UI/backend] Installing python deps (requirements.txt)..."
  (cd "$ROOT_DIR/apps/CORE_UI/backend" && . "$activate_script" && python3 -m pip install --upgrade pip && pip install -r requirements.txt)

  echo
  echo "========================================"
  echo " Starting services"
  echo "========================================"

  spawn_in_terminal "OPAL_SE" "$ROOT_DIR/apps/OPAL_SE" "npm run migrate && npm run dev"
  sleep 2

  spawn_in_terminal "CORE_UI_Backend" "$ROOT_DIR/apps/CORE_UI/backend" ". $activate_script && python start_backend.py"
  sleep 2

  # Start frontend using direct gnome-terminal call (same as restart-frontend.sh)
  (cd "$ROOT_DIR/apps/CORE_UI/frontend" && gnome-terminal --title="CORE_UI_Frontend" -- bash -c "npm run dev; echo; echo '[Process exited] Press Enter to close...'; read") &
  sleep 2

  echo
  echo "========================================"
  echo " Started"
  echo "========================================"
  echo
  echo "If terminals did not open, logs (background mode) are in: $LOG_DIR"
  echo
}

main "$@"
