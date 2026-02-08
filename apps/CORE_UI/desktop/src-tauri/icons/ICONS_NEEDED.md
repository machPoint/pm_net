# App Icons Required

This directory needs the following icon files for the Tauri bundle:

- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

## Generating Icons

If you have a source icon (1024x1024 PNG recommended), you can generate all required sizes using:

```bash
cd desktop
npx @tauri-apps/cli icon path/to/source-icon.png
```

This will automatically generate all required icon formats and place them in this directory.

## Temporary Workaround

For development, you can create simple placeholder icons:
- Use any 1024x1024 PNG as a source
- Or copy placeholder icons from another Tauri project

The build will fail without these icons, but `npm run dev` should work.
