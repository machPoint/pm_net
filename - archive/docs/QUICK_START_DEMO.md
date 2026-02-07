# 🚀 CORE-SE Quick Start - Demo Mode

## Fastest Way to Run the Demo (No Servers Required!)

### Option 1: Double-Click Start (Recommended)

Simply double-click this file:
```
C:\Users\X1\PROJECT\CORE_SE\start_demo.bat
```

**That's it!** The frontend will start in ~8 seconds and automatically open in your browser.

---

## What You Get

✅ **Frontend Dashboard** running on http://localhost:3000  
✅ **Pre-generated fake data** (50 requirements, 25 issues, 20 parts, 30 pulse items)  
✅ **No server dependencies** - works completely offline  
✅ **Perfect for demos and presentations**

---

## Data Modes Available

Once the app opens, you can switch between three data modes in **Admin → Data Management**:

### 1. 📊 Static Fake Data (Default)
- Pre-generated aerospace engineering data
- Instant loading, no delays
- Perfect for quick demos

### 2. 📡 Streaming Fake Data
- Same fake data PLUS live updates every 5 seconds
- New pulse items appear automatically
- Great for showcasing real-time features

### 3. 🔌 Real Data
- Connects to OPAL (port 3001) and FDS (port 4000)
- Requires servers to be running
- Use `start_all.bat` instead for this mode

---

## Stopping the Demo

Press **any key** in the green launcher window to stop the frontend.

---

## Full Server Mode (OPAL + FDS + Backend + Frontend)

If you need the complete stack with all servers:

```
C:\Users\X1\PROJECT\CORE_SE\start_all.bat
```

This starts:
- FDS (Port 4000)
- OPAL MCP Server (Port 3001)
- Core Backend (Port 8000)
- Core Frontend (Port 3000)

---

## Troubleshooting

### Port 3000 Already in Use
The launcher automatically kills any process on port 3000. If you still have issues:
```powershell
netstat -ano | findstr :3000
taskkill /F /PID <PID_NUMBER>
```

### Frontend Won't Start
Make sure you've installed dependencies:
```powershell
cd C:\Users\X1\PROJECT\CORE_SE\frontend
npm install
```

### Browser Doesn't Open Automatically
Manually navigate to: http://localhost:3000

---

## Demo Workflow

1. **Start**: Double-click `start_demo.bat`
2. **Wait**: ~8 seconds for frontend to start
3. **Browse**: Dashboard opens automatically
4. **Explore**: Navigate through all sections (Notes, Pulse, Requirements, etc.)
5. **Switch Modes**: Go to Admin → Data Management to try different modes
6. **Stop**: Press any key in the launcher window

---

## What's Different from Full Mode?

| Feature | Demo Mode | Full Mode |
|---------|-----------|-----------|
| Servers Required | None | OPAL + FDS |
| Startup Time | ~8 seconds | ~15 seconds |
| Data Source | Fake (local) | Real (from servers) |
| Offline Capable | ✅ Yes | ❌ No |
| Live Updates | ✅ Yes (streaming mode) | ✅ Yes |
| Perfect For | Demos, Development | Integration Testing |

---

## Next Steps

- Explore the **Pulse** feed to see activity updates
- Check **Trace Graph** for requirement relationships  
- Try **Impact Analysis** on any requirement
- Create **Tasks** from pulse items
- Switch to **Streaming Mode** to see live updates
- Customize **Themes** (dark/light/custom)

---

**Enjoy your demo! 🎉**
