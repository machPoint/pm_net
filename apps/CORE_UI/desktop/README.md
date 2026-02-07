# CORE-SE Desktop

Tauri desktop wrapper for the CORE-SE application.

## Structure

```
desktop/
├── package.json           # Node dependencies and scripts
├── src-tauri/             # Rust/Tauri backend
│   ├── Cargo.toml         # Rust dependencies
│   ├── tauri.conf.json    # Tauri configuration
│   ├── build.rs           # Build script
│   ├── src/
│   │   └── main.rs        # Rust entry point
│   └── icons/             # App icons (needs to be added)
└── README.md              # This file
```

## Configuration

### Dev Mode
- `devPath` in `tauri.conf.json` points to `http://localhost:3000`
- Expects the Next.js dev server to be running on port 3000
- Expects the FastAPI backend to be running on port 8000

### Build Mode
- `distDir` points to `../frontend/out` (Next.js static export)
- Frontend must be built first with `npm run build` in `frontend/`
- Backend will be bundled or launched separately (TBD)

## Prerequisites

1. **Rust**: Install from https://rustup.rs/
2. **Node.js**: Version 18+
3. **System dependencies**:
   - Windows: WebView2 (usually pre-installed on Windows 10+)

## Usage

### Development

From the `desktop/` directory:

```bash
# Install dependencies
npm install

# Run in dev mode (requires frontend and backend running)
npm run dev
```

### Building

```bash
# Build the desktop app
npm run build
```

The installer will be in `src-tauri/target/release/bundle/`

## Icons

App icons need to be placed in `src-tauri/icons/`:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

You can generate these from a single source image using:
```bash
npx @tauri-apps/cli icon path/to/icon.png
```

## Notes

- The Tauri window is configured to 1400x900 by default (min 1024x768)
- External links will open in the system browser via the `shell-open` permission
- The app title is "CORE-SE"
