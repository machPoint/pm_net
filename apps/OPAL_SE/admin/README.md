# OPAL Admin Interface

A modern, responsive admin dashboard for the OPAL (Open Protocol for AI Learning) MCP server implementation.

## 🚀 Quick Start

### Option 1: Complete System (Recommended)
Run the complete OPAL system with both server and admin UI:

```bash
# From OPAL root directory
start_opal_complete.bat
```

This will:
- Install dependencies for both server and admin UI
- Start OPAL MCP server on port 3001
- Start Admin UI on port 3000
- Auto-connect the interfaces

### Option 2: Admin UI Only
If you already have OPAL server running:

```bash
# From admin directory  
start_admin.bat
```

## 🌐 Access URLs

- **Admin UI**: http://localhost:3000
- **OPAL Server**: http://localhost:3001
- **MCP Endpoint**: http://localhost:3001/mcp
- **API Endpoints**: http://localhost:3001/api/*

## 📊 Features

### Overview Dashboard
- **Real-time server metrics** (CPU, Memory, Disk)
- **Live connection monitoring** 
- **Server uptime and status**
- **Recent activity feed**
- **Interactive charts and gauges**

### Tools Management
- **Browse MCP tools** with search/filter
- **Execute tools** with parameter input
- **Real-time tool testing**
- **Tool analytics** and usage stats

### Resources Management  
- **Browse MCP resources** (files, URIs, content)
- **Resource search** and filtering
- **Upload and manage** content
- **Access control** management

### Prompts Management
- **Prompt library** with templates
- **Interactive prompt testing**
- **Argument management**
- **Usage analytics**

### Additional Features
- **User & Security** management
- **Testing & Debugging** tools
- **Analytics** and reporting
- **Integrations** management
- **Configuration** panel

## 🔧 Technical Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS + Custom CSS Variables
- **Charts**: Recharts
- **UI Components**: Radix UI + Custom components
- **Backend Integration**: REST API + WebSocket
- **Real-time Updates**: Server-Sent Events

## 🔗 Integration

The admin UI automatically connects to the OPAL server via:

- **REST API**: `/api/*` endpoints for data fetching
- **WebSocket**: Real-time updates and notifications  
- **CORS**: Proper cross-origin resource sharing
- **Error Handling**: Graceful fallbacks and error states

## 📁 Project Structure

```
admin/
├── ui/                     # Next.js admin interface
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── pages/      # Page components
│   │   │   └── ui/         # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # API client and utilities
│   │   └── app/            # Next.js app directory
│   ├── public/             # Static assets
│   └── package.json        # Dependencies
├── start_admin.bat         # Admin UI starter script
└── README.md              # This file
```

## 🛠️ Development

The admin interface uses:

- **Hot reloading** for fast development
- **TypeScript** for type safety
- **ESLint** for code quality
- **Tailwind CSS** for styling
- **Component-driven** architecture

## 🎨 Theme

The interface uses a professional dark theme with:

- **Primary**: Orange (#ec8b10) - OPAL brand color
- **Backgrounds**: Dark grays and blues
- **Text**: Light beige/white
- **Accents**: Blue, green, red for status indicators

## 📝 Notes

- The admin UI includes **fallback mock data** if OPAL server is unavailable
- **Real-time updates** require WebSocket connection to OPAL server  
- **All data is live** when connected to running OPAL server
- **Responsive design** works on desktop and mobile devices

---

*Part of the OPAL MCP Server Project*