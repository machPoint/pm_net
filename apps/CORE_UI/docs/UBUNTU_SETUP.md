# Ubuntu 24 Setup Guide

This document covers setup and troubleshooting for running PM_NET/CORE_UI on Ubuntu 24.

## Prerequisites

### Required Software

1. **Node.js and npm** (via nvm recommended)
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install --lts
   nvm use --lts
   ```

2. **Python 3.12+**
   ```bash
   sudo apt update
   sudo apt install -y python3 python3-pip python3-venv
   ```

3. **Git**
   ```bash
   sudo apt install -y git
   ```

## Initial Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd PM_NET
```

### 2. Run the Startup Script
```bash
bash start-all.sh
```

The script will automatically:
- Check for required dependencies
- Install npm packages for OPAL_SE and CORE_UI frontend
- Create Python virtual environment
- Install Python dependencies
- Start all three services in separate terminal windows

## Common Issues and Solutions

### Issue 1: bcrypt Version Incompatibility

**Symptom:**
```
ValueError: password cannot be longer than 72 bytes, truncate manually if necessary
```

**Root Cause:**
- `bcrypt 5.0.0` is incompatible with `passlib 1.7.4`
- The newer bcrypt removed the `__about__` attribute and has stricter validation
- This causes passlib's internal initialization to fail

**Solution:**
Downgrade bcrypt to version 3.2.2:

```bash
cd apps/CORE_UI/backend
source core_env/bin/activate
pip install 'bcrypt==3.2.2'
```

The `requirements.txt` has been updated to pin this version:
```
passlib[bcrypt]
bcrypt==3.2.2
```

### Issue 2: Node.js Not Found

**Symptom:**
```
ERROR: Required command not found: node
```

**Root Cause:**
- Node.js installed via nvm is not available in non-interactive shells
- The startup script needs to load nvm before checking for node

**Solution:**
The `start-all.sh` script has been updated to load nvm:
```bash
# Load nvm if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### Issue 3: Python Virtual Environment Issues

**Symptom:**
```
error: externally-managed-environment
```
or
```
start-all.sh: line 141: core_env/bin/activate: No such file or directory
```

**Root Cause:**
- Virtual environment created on Windows doesn't work on Linux
- Windows venvs use `Scripts/` directory, Linux uses `bin/`

**Solution:**
Delete and recreate the virtual environment:
```bash
cd apps/CORE_UI/backend
rm -rf core_env
python3 -m venv core_env
source core_env/bin/activate
pip install -r requirements.txt
```

The `start-all.sh` script now automatically detects and handles both Windows and Linux venv structures.

### Issue 4: python3-venv Not Installed

**Symptom:**
```
The virtual environment was not created successfully because ensurepip is not available
```

**Solution:**
```bash
sudo apt install -y python3.12-venv
```

## Service URLs

Once all services are running:

- **OPAL_SE Server**: http://localhost:7788
  - Admin Panel: http://localhost:7788/admin
  - Graph API: http://localhost:7788/api/nodes

- **CORE_UI Backend**: http://localhost:8000
  - Health Check: http://localhost:8000/health
  - API Docs: http://localhost:8000/docs

- **CORE_UI Frontend**: http://localhost:3000
  - Governance: http://localhost:3000/governance

## Restarting Services

### Restart All Services
```bash
bash start-all.sh
```

### Restart Backend Only
```bash
bash restart-backend.sh
```

### Manual Restart

**OPAL_SE:**
```bash
cd apps/OPAL_SE
npm run migrate && npm run dev
```

**CORE_UI Backend:**
```bash
cd apps/CORE_UI/backend
source core_env/bin/activate
python start_backend.py
```

**CORE_UI Frontend:**
```bash
cd apps/CORE_UI/frontend
npm run dev
```

## Stopping Services

To stop all services:
1. Close each terminal window, OR
2. Press `Ctrl+C` in each terminal window

## Development Notes

### Virtual Environment Location
- **Backend venv**: `apps/CORE_UI/backend/core_env/`
- **Activate**: `source apps/CORE_UI/backend/core_env/bin/activate`

### Log Files
If services start in background mode (no terminal emulator detected):
- Logs are stored in: `/home/x1/PM_NET/.logs/`

### Port Conflicts
If you get port conflicts, check for existing processes:
```bash
# Check what's using port 7788
sudo lsof -i :7788

# Check what's using port 8000
sudo lsof -i :8000

# Check what's using port 3000
sudo lsof -i :3000
```

## Troubleshooting Checklist

- [ ] Node.js and npm installed and accessible
- [ ] Python 3.12+ installed
- [ ] python3-venv package installed
- [ ] Virtual environment created and activated
- [ ] All npm dependencies installed
- [ ] All Python dependencies installed (with bcrypt==3.2.2)
- [ ] No port conflicts on 7788, 8000, 3000
- [ ] All three terminal windows opened successfully

## Additional Resources

- See `TECHNICAL_SUMMARY.md` for architecture overview
- See `opal_summary.md` for OPAL server details
- Check `/home/x1/PM_NET/docs/` for project documentation
