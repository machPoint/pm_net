# Requirements Management (Dev Environment)

## Overview

The Requirements Management tab provides bulk import, edit, and delete capabilities for managing requirements in the development environment. In production, requirements will be sourced from external systems like Jama, but this tool allows developers to quickly create and manage test data.

## Features

### ✨ **Core Capabilities**

- **Bulk Import/Export**: Import and export requirements as JSON files
- **Inline Editing**: Edit requirements directly in the table
- **Bulk Selection**: Select multiple requirements for batch operations
- **Filtering**: Filter by category, priority, and search text
- **CRUD Operations**: Create, read, update, and delete individual requirements
- **Real-time Stats**: View requirement counts and statistics

### 📋 **Requirement Fields**

Each requirement includes:
- **ID**: Unique identifier (auto-generated if not provided)
- **Title**: Short descriptive title
- **Text**: Full requirement text/description
- **Category**: functional, performance, safety, interface
- **Priority**: high, medium, low
- **Status**: draft, approved, rejected, etc.
- **Timestamps**: created_at, updated_at

## Usage

### 🚀 **Getting Started**

1. **Seed Sample Data** (Optional):
   ```powershell
   cd FDS
   python seed_requirements.py
   ```

2. **Access the UI**:
   - Navigate to the "Req Management" tab in the left sidebar
   - The tab appears right after "Requirements"

### 📥 **Importing Requirements**

**JSON Format**:
```json
[
  {
    "id": "REQ-FCS-001",
    "title": "Flight Control System Initialization",
    "text": "The flight control system shall initialize all control surfaces within 2 seconds of power-on.",
    "category": "functional",
    "priority": "high",
    "status": "approved"
  },
  {
    "id": "REQ-NAV-001",
    "title": "GPS Position Accuracy",
    "text": "The navigation system shall maintain GPS position accuracy within 5 meters CEP.",
    "category": "performance",
    "priority": "high",
    "status": "approved"
  }
]
```

**Steps**:
1. Click "Import JSON" button
2. Select your JSON file
3. Requirements will be created in bulk
4. Success/error toast notifications will appear

### 📤 **Exporting Requirements**

1. Click "Export JSON" button
2. File will download as `requirements-export-YYYY-MM-DD.json`
3. Contains all current requirements in the system

### ✏️ **Editing Requirements**

**Inline Edit**:
1. Click the edit icon (pencil) next to a requirement
2. Fields become editable
3. Click checkmark to save or X to cancel

**Add New**:
1. Click "Add Requirement" button
2. Fill in the form fields
3. Click "Create" to save

### 🗑️ **Deleting Requirements**

**Single Delete**:
- Click the trash icon next to a requirement

**Bulk Delete**:
1. Check the boxes next to requirements
2. Click "Delete Selected" in the bulk actions bar
3. Confirm the deletion

### 🔍 **Filtering and Search**

- **Search**: Type in the search box to filter by ID, title, or text
- **Category Filter**: Select from dropdown (functional, performance, safety, interface)
- **Priority Filter**: Select from dropdown (high, medium, low)
- **Combine Filters**: All filters work together

## API Endpoints

The FDS provides the following REST API endpoints:

### **GET** `/api/requirements`
Get all requirements with optional filtering
```
Query Parameters:
- category: string (optional)
- priority: string (optional)
- limit: number (default: 1000)
```

### **POST** `/api/requirements`
Create a single requirement
```json
{
  "id": "REQ-XXX-001",  // optional, auto-generated if omitted
  "title": "Requirement Title",
  "text": "Requirement description",
  "category": "functional",
  "priority": "high",
  "status": "draft"
}
```

### **PUT** `/api/requirements/{req_id}`
Update a single requirement
```json
{
  "title": "Updated Title",
  "priority": "medium"
}
```

### **DELETE** `/api/requirements/{req_id}`
Delete a single requirement

### **POST** `/api/requirements/bulk/create`
Bulk create requirements
```json
[
  { "title": "Req 1", "text": "...", "category": "functional", "priority": "high" },
  { "title": "Req 2", "text": "...", "category": "performance", "priority": "medium" }
]
```

### **POST** `/api/requirements/bulk/update`
Bulk update requirements
```json
[
  { "id": "REQ-001", "priority": "high" },
  { "id": "REQ-002", "status": "approved" }
]
```

### **POST** `/api/requirements/bulk/delete`
Bulk delete requirements
```json
["REQ-001", "REQ-002", "REQ-003"]
```

### **POST** `/api/requirements/import`
Import requirements from JSON (same as bulk create)

### **GET** `/api/requirements/export`
Export all requirements as JSON
```
Query Parameters:
- document_id: string (optional) - filter by document
```

## Architecture

### **Backend** (FDS)
- **File**: `FDS/simple_requirements_service.py`
- **Storage**: In-memory (resets on restart)
- **API**: FastAPI endpoints in `FDS/main.py`

### **Frontend** (CORE_UI)
- **Component**: `apps/CORE_UI/frontend/src/components/RequirementsManagementSection.tsx`
- **Route**: `requirements-mgmt` in `apps/CORE_UI/frontend/src/app/page.tsx`
- **Navigation**: Added to `LeftNav.tsx` with Edit3 icon

## Sample Data

The `seed_requirements.py` script includes 16 sample aerospace requirements:
- **Flight Control System** (2 requirements)
- **Navigation** (2 requirements)
- **Power System** (2 requirements)
- **Communication** (2 requirements)
- **Display** (2 requirements)
- **Safety** (2 requirements)
- **Environmental** (2 requirements)
- **Maintenance** (2 requirements)

## Development Notes

### **Dev Environment Only**
This feature is intended for development and testing only. In production:
- Requirements will be sourced from Jama or similar PLM systems
- This tab should be hidden or disabled
- The FDS endpoints should be restricted

### **Data Persistence**
- Requirements are stored in-memory
- Data is lost when FDS restarts
- For persistent storage, integrate with a database

### **Future Enhancements**
- [ ] Add requirement validation rules
- [ ] Support for requirement relationships/traceability
- [ ] Version history tracking
- [ ] Export to other formats (CSV, Excel)
- [ ] Import from Jama/Doors format
- [ ] Requirement templates
- [ ] Bulk status updates
- [ ] Advanced filtering (date ranges, custom fields)

## Testing

### **Manual Testing**
1. Start FDS: `cd FDS && python start_fds.py`
2. Seed data: `python seed_requirements.py`
3. Start CORE_UI frontend
4. Navigate to "Req Management" tab
5. Test CRUD operations, filtering, import/export

### **API Testing**
```powershell
# Get all requirements
curl http://localhost:4000/api/requirements

# Create a requirement
curl -X POST http://localhost:4000/api/requirements `
  -H "Content-Type: application/json" `
  -d '{"title":"Test Req","text":"Test","category":"functional","priority":"medium"}'

# Export requirements
curl http://localhost:4000/api/requirements/export > requirements.json
```

## Troubleshooting

### **Requirements not loading**
- Ensure FDS is running on port 4000
- Check browser console for CORS errors
- Verify FDS logs for errors

### **Import fails**
- Validate JSON format
- Check for duplicate IDs
- Ensure all required fields are present

### **Bulk operations timeout**
- Reduce batch size
- Check FDS performance
- Review error details in toast notifications

## Related Files

- `FDS/simple_requirements_service.py` - Backend service
- `FDS/main.py` - API endpoints
- `FDS/seed_requirements.py` - Sample data script
- `apps/CORE_UI/frontend/src/components/RequirementsManagementSection.tsx` - UI component
- `apps/CORE_UI/frontend/src/components/LeftNav.tsx` - Navigation
- `apps/CORE_UI/frontend/src/app/page.tsx` - Routing
