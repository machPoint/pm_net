# Icon Setup for CORE-SE Desktop

The Tauri build requires app icons. This is the **"icon.ico not found"** error you're seeing.

## Quick Solutions

### Option 1: Auto-Generate Placeholder (Fastest)

```bash
cd CORE_UI/desktop

# If you have Python with Pillow installed:
python create_placeholder_icon.py
npx @tauri-apps/cli icon icon-source.png

# Otherwise, run the batch script and follow prompts:
generate_placeholder_icons.bat
```

### Option 2: Use Your Own Icon

```bash
cd CORE_UI/desktop

# Replace path/to/your-icon.png with your actual icon file
npx @tauri-apps/cli icon path/to/your-icon.png
```

**Icon Requirements:**
- Format: PNG
- Size: 1024x1024 recommended (will be auto-resized)
- Square aspect ratio required

### Option 3: Download a Placeholder

1. Download any 1024x1024 PNG from:
   - https://via.placeholder.com/1024
   - Or any icon you like
2. Save as `icon-source.png` in `CORE_UI/desktop/`
3. Run: `npx @tauri-apps/cli icon icon-source.png`

## What Gets Generated

The `npx @tauri-apps/cli icon` command creates:

```
src-tauri/icons/
├── 32x32.png
├── 128x128.png
├── 128x128@2x.png
├── icon.icns          # macOS
└── icon.ico           # Windows ← This is what's missing
```

## After Generating Icons

Once icons are created, the Tauri dev/build will work:

```bash
# From repository root
start_core_ui.bat

# Or build installer
build_desktop.bat
```

## Troubleshooting

**Error: `@tauri-apps/cli` not found**
```bash
cd CORE_UI/desktop
npm install
```

**Error: "command not found: npx"**
- Ensure Node.js is installed and in PATH
- Try: `npm install -g npx`

**Python script error: "No module named PIL"**
```bash
pip install Pillow
```

## For Production

Replace placeholder icons with your actual branded icons before shipping!
