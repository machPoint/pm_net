# Lubuntu (Linux) Setup

## 1) System packages

```bash
sudo apt update
sudo apt install -y \
  git \
  curl \
  ca-certificates \
  build-essential \
  python3 \
  python3-venv \
  python3-pip \
  pkg-config \
  sqlite3 \
  libsqlite3-dev
```

Notes:
- `build-essential`/`python3-dev`-like tooling is needed because `apps/OPAL_SE` uses native Node modules (notably `sqlite3`).

If you hit build issues with native modules, also install:

```bash
sudo apt install -y python3-dev
```

## 2) Node.js (>= 18)

This repo requires Node `>=18` (see `apps/OPAL_SE/package.json`).

Recommended (NodeSource, LTS):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

## 3) Python dependencies (CORE_UI backend)

The Linux launcher will create a venv at:

- `apps/CORE_UI/backend/.venv`

and install:

- `apps/CORE_UI/backend/requirements.txt`

If you want to do it manually:

```bash
cd apps/CORE_UI/backend
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 4) Optional: Docker

If you plan to run OPAL via Docker later:

```bash
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out/in after adding yourself to the `docker` group.

## 5) One-time: make the launcher executable

From repo root:

```bash
chmod +x start-all.sh
```

## 6) Double-click behavior (Lubuntu file manager)

- If you double-click `Start-All-Servers.desktop`, you may need to right-click and choose **Allow Launching** (Linux desktop security feature).
- If terminal windows do not open, install a terminal emulator. On Lubuntu, `lxterminal` is typical:

```bash
sudo apt install -y lxterminal
```
