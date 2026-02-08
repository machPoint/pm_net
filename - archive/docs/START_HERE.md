# 🚀 CORE-SE Quick Start Guide

## 🎯 **Choose Your Mode**

### Demo Mode (No Servers Required) ⭐ RECOMMENDED FOR DEMOS
Just double-click this file:
```
C:\Users\X1\PROJECT\CORE_SE\start_demo.bat
```

**Perfect for:**
- ✅ Quick demos and presentations
- ✅ Offline development
- ✅ No server setup required
- ✅ Uses fake data (static or streaming)
- ✅ Starts in ~8 seconds

[📖 See QUICK_START_DEMO.md for details](QUICK_START_DEMO.md)

---

### Full Stack Mode (All Servers)
Just double-click this file:
```
C:\Users\X1\PROJECT\CORE\start_all.bat
```

**That's it!** In ~15 seconds you'll have:
- ✅ FDS generating mock aerospace data (Port 4000)
- ✅ OPAL analyzing and enriching data (Port 3001)  
- ✅ Core Backend serving APIs (Port 8000)
- ✅ Core Dashboard showing insights (Port 3000)

## 📁 **Expected Project Structure**

```
C:\Users\X1\PROJECT\
│
├── CORE\                    ← You are here
│   ├── start_all.bat        ← Double-click this!
│   ├── START_HERE.md        ← This file
│   ├── frontend\            ← React/Next.js UI
│   └── backend\             ← FastAPI backend
│
├── OPAL\                    ← OPAL MCP Server
│   ├── server.js
│   ├── package.json
│   └── .env
│
└── FDS\                     ← Fake Data Server
    ├── start_fds.py
    ├── main.py
    └── quick_start.bat
```

## 🎯 **What Happens When You Start**

### **1. Initialization (~3 seconds)**
- Checks all folders exist
- Clears any stuck processes on ports 4000, 3001, 8000, 3000
- Prepares color-coded terminal windows

### **2. Service Startup (~15 seconds)**

**[1/4] FDS starts** (4 seconds)
```
🟡 Yellow Window: FDS Server - Port 4000
Generates ~300 mock aerospace artifacts
Admin dashboard available
```

**[2/4] OPAL starts** (6 seconds)  
```
🔵 Blue Window: OPAL MCP Server - Port 3001
Connects to FDS as sidecar
Applies AI analysis to raw data
```

**[3/4] Core Backend starts** (4 seconds)
```
🟣 Purple Window: Core Backend - Port 8000
Connects to OPAL for enriched data
Serves REST APIs to frontend
```

**[4/4] Core Frontend starts** (3 seconds)
```
🔴 Red Window: Core Frontend - Port 3000  
Your main dashboard UI
Auto-opens in browser
```

### **3. Auto-Launch (~10 seconds)**
- Automatically opens `http://localhost:3000` (Core Dashboard)
- Automatically opens `http://localhost:4000/admin` (FDS Admin)

## 🎨 **Window Colors**

Each service gets its own colored terminal window:
- 🟡 **Yellow** = FDS Server
- 🔵 **Blue** = OPAL MCP Server
- 🟣 **Purple** = Core Backend
- 🔴 **Red** = Core Frontend
- 🟢 **Green** = Main Orchestrator (this script)

## 🌐 **Available URLs After Startup**

| Service | URL | Purpose |
|---------|-----|---------|
| **Core Dashboard** | http://localhost:3000 | Main user interface |
| **Core Backend** | http://localhost:8000 | API gateway |
| **OPAL MCP** | http://localhost:3001 | Intelligence layer |
| **FDS Admin** | http://localhost:4000/admin | Data validation |
| **FDS API Docs** | http://localhost:4000/docs | Swagger UI |

## 🛠️ **Managing Services**

### **To Stop Everything:**
Press **any key** in the main green window (orchestrator)
- All services will stop gracefully
- All terminal windows will close

### **To Stop Individual Service:**
Close that service's window or press **Ctrl+C**
- Other services keep running
- Useful for restarting just one service

### **To Restart Everything:**
1. Stop all (press any key in green window)
2. Double-click `start_all.bat` again

### **To Restart One Service:**
1. Close that service's window
2. Manually start it in its folder

## 🔍 **Troubleshooting**

### **"FDS folder not found"**
```
Expected: C:\Users\X1\PROJECT\FDS
Fix: Ensure FDS project is in the right location
```

### **"OPAL folder not found"**
```
Expected: C:\Users\X1\PROJECT\OPAL  
Fix: Ensure OPAL project is in the right location
```

### **"Port already in use"**
```
The script automatically kills old processes
If this fails, manually restart your computer
```

### **"Backend/Frontend folder not found"**
```
These are optional warnings
Create the folders when you start building Core
```

### **Service won't start**
```
1. Check the colored window for that service
2. Read error messages (they're helpful!)
3. Fix the issue in that project
4. Close window and restart start_all.bat
```

## 📊 **Data Flow**

```
User Browser
    ↓
Core Frontend (3000)
    ↓  
Core Backend (8000)
    ↓
OPAL MCP (3001) ← Applies AI analysis
    ↓
FDS (4000) ← Generates mock data
```

## 💾 **GitHub Workflow**

Each project has its own Git repo:

```bash
# Commit FDS changes
cd C:\Users\X1\PROJECT\FDS
git add .
git commit -m "Updated FDS"
git push origin main

# Commit OPAL changes  
cd C:\Users\X1\PROJECT\OPAL
git add .
git commit -m "Updated OPAL"
git push origin main

# Commit CORE changes
cd C:\Users\X1\PROJECT\CORE
git add .
git commit -m "Updated Core"
git push origin main
```

## 🎯 **Development Workflow**

### **Morning Startup:**
1. Pull latest from all repos
2. Double-click `start_all.bat`
3. ☕ Coffee while services start (~15 seconds)
4. Start coding!

### **During Development:**
- Services auto-reload on code changes
- Each service has its own logs in colored windows
- Test changes immediately in browser

### **End of Day:**
- Commit changes to respective Git repos
- Press any key in green window to stop all services
- Services stop gracefully

## ✨ **Pro Tips**

1. **Keep the green window open** - It's your control center
2. **Watch the colored windows** - They show real-time logs
3. **FDS Admin Dashboard** - Great for validating mock data
4. **Auto-refresh enabled** - Most services reload on file changes
5. **Independent repos** - Each project can have its own versioning

## 🎉 **Success Indicators**

You know everything is working when:
- ✅ 5 terminal windows open (1 green + 4 colored)
- ✅ 2 browser tabs open automatically
- ✅ Core Dashboard loads at localhost:3000
- ✅ FDS Admin shows data at localhost:4000/admin
- ✅ No red error messages in any window

## 📞 **Quick Commands**

```bash
# Check if ports are in use
netstat -an | findstr "4000 3001 8000 3000"

# Manually start just FDS
cd C:\Users\X1\PROJECT\FDS
quick_start.bat

# Manually start just OPAL
cd C:\Users\X1\PROJECT\OPAL
npm start

# Kill all Python processes (if needed)
taskkill /F /IM python.exe

# Kill all Node processes (if needed)
taskkill /F /IM node.exe
```

---

## 🚀 **TL;DR**

**Double-click `start_all.bat` → Wait 15 seconds → Code!**

Everything starts automatically:
- FDS provides mock data
- OPAL adds intelligence  
- Core shows the dashboard
- You build awesome features! 🎯