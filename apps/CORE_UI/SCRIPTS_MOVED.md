# Desktop Scripts Location

The desktop startup scripts have been moved to the **repository root** for easier access:

## New Locations

- `../start_dev_desktop.bat` - Desktop development mode launcher
- `../build_desktop.bat` - Desktop application builder

## Reason for Move

These scripts coordinate multiple projects:
- `CORE_UI/backend/` - FastAPI backend
- `CORE_UI/frontend/` - Next.js frontend
- `CORE_UI/desktop/` - Tauri desktop shell
- `FDS/` - Fake Data Service (optional)

Since FDS is at the same level as CORE_UI, having the scripts at the root makes more sense and avoids confusing relative paths.

## Usage

From the repository root (`CORE_SE/`):

```bash
# Start desktop development mode
start_dev_desktop.bat

# Build desktop installer
build_desktop.bat
```

## Old Scripts (Deprecated)

The scripts previously in this directory (`CORE_UI/`) are deprecated:
- ~~`start_dev_desktop.bat`~~ → Use `../start_dev_desktop.bat`
- ~~`build_desktop.bat`~~ → Use `../build_desktop.bat`
