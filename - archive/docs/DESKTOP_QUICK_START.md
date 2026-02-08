# CORE-SE Desktop Quick Start

This guide covers running CORE-SE as a desktop application using Tauri.

## Prerequisites

1. **Rust** (required for Tauri)
   - Install from: https://rustup.rs/
   - Verify: `cargo --version`

2. **Node.js** 18+ (required for frontend)
   - Verify: `node --version`

3. **Python** 3.11+ (required for backend)
   - Verify: `python --version`

4. **Windows WebView2** (usually pre-installed on Windows 10+)
   - Will be automatically installed by Tauri if missing

## Project Structure

```
CORE_SE/                  # Repository root
├── CORE_UI/
│   ├── desktop/          # Tauri desktop shell
│   │   ├── src-tauri/    # Rust/Tauri backend
│   │   └── package.json  # Desktop dependencies
│   ├── frontend/         # Next.js UI (React + TypeScript)
│   └── backend/          # FastAPI backend (Python)
├── FDS/                  # Fake Data Service (optional)
├── OPAL_SE/              # OPAL MCP server (optional)
├── start_dev_desktop.bat # Launch desktop dev mode
└── build_desktop.bat     # Build desktop installer
```

## Development Mode

### ⚠️ First Time Setup: Generate Icons

**Before first run**, you need to generate app icons (one-time setup):

```bash
cd CORE_UI/desktop

# Option 1: Auto-generate placeholder
generate_placeholder_icons.bat

# Option 2: Use Python script
python create_placeholder_icon.py
npx @tauri-apps/cli icon icon-source.png

# Option 3: Use your own icon
npx @tauri-apps/cli icon path/to/your-icon.png
```

See [desktop/ICON_SETUP.md](desktop/ICON_SETUP.md) for details.

### Quick Start

```bash
# From repository root (CORE_SE directory)
start_dev_desktop.bat
```

This script will:
1. Start the FastAPI backend on port 8000
2. Start the Next.js dev server on port 3000
3. Optionally start FDS (Fake Data Service) for demo data
4. Launch the Tauri desktop app

### Manual Start

If you prefer to control each service separately:

```bash
# Terminal 1: Backend
cd backend
python start_backend.py

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Desktop Shell
cd desktop
npm install  # first time only
npm run dev
```

## Building for Production

### Quick Build

```bash
# From repository root (CORE_SE directory)
build_desktop.bat
```

The installer will be created in:
```
CORE_UI/desktop/src-tauri/target/release/bundle/
```

### Build Components

The build process:
1. Builds Next.js frontend with static export (`frontend/out/`)
2. Bundles Tauri desktop app with the static frontend
3. Creates Windows installer (.msi) and portable executable

## Desktop vs Web Mode

### Desktop Mode
- **Frontend**: Tauri window loading Next.js static build
- **Backend**: Local FastAPI on `http://127.0.0.1:8000`
- **Database**: Local SQLite in user app data directory
- **FDS**: Optional (for demo data)
- **OPAL**: Remote (optional, for AI features)

### Web Mode (existing)
- **Frontend**: Next.js dev server on `http://localhost:3000`
- **Backend**: FastAPI on `http://localhost:8000`
- **Database**: Local SQLite in repo directory
- **FDS**: Optional (for demo data)
- **OPAL**: Remote (optional, for AI features)

## Configuration

### Environment Variables

Desktop mode uses these environment variables (set automatically by startup scripts):

```bash
# Backend config
MODE=desktop
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8000

# Frontend config
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000

# Optional: FDS
FDS_BASE_URL=http://localhost:4000  # if running FDS
```

### Backend Desktop Mode

When `MODE=desktop` in backend config (`backend/.env`):
- Database path: `~/.core_se/desktop/core_se.db`
- FDS is optional (graceful fallback if not available)
- CORS allows `tauri://localhost` and `http://localhost:3000`

## Troubleshooting

### Rust/Cargo not found
```bash
# Install Rust
# Windows: Download from https://rustup.rs/
# After install, restart terminal
cargo --version
```

### Desktop app shows blank screen
- Ensure backend is running on port 8000: `curl http://127.0.0.1:8000/health`
- Ensure frontend dev server is running on port 3000 (dev mode)
- Check browser console in desktop app (Ctrl+Shift+I if dev mode)

### Build fails with "icons not found"
```bash
# Generate icons from a source image (1024x1024 PNG recommended)
cd desktop
npx @tauri-apps/cli icon path/to/source-icon.png
```

### Backend database locked
- Close all CORE-SE instances
- Delete `~/.core_se/desktop/core_se.db` to reset (development only)

### Frontend build fails
```bash
# Clear Next.js cache
cd frontend
rm -rf .next out
npm run build:desktop
```

## Next Steps

1. **First time setup**: Run `start_dev_desktop.bat` and verify everything starts
2. **Generate icons**: Create app icons for production builds (see desktop/README.md)
3. **Customize**: Modify window size/title in `desktop/src-tauri/tauri.conf.json`
4. **Build**: Run `build_desktop.bat` to create installer

## Additional Resources

- Tauri docs: https://tauri.app/
- Desktop README: `desktop/README.md`
- Migration plan: `docs/tauri_migration.md`
- Main README: `WARP.md`
