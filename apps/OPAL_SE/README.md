# OPAL Server

OPAL (Open Protocol for AI Learning) is a Model Context Protocol (MCP) compliant server implementation designed for memory management, API token handling, and AI tool execution. This server follows the MCP specification and provides a comprehensive admin panel for managing all aspects of the system.

## Features

- Full MCP protocol implementation with JSON-RPC 2.0
- WebSocket and HTTP endpoints for AI tool execution
- Memory management system for storing and retrieving AI context
- API token management for secure access control
- User authentication and authorization
- Comprehensive admin panel for system management
- Database backup and restore functionality
- Audit logging for tool executions
- SQLite database for development simplicity
- Docker containerization for easy deployment

## Architecture

The OPAL server implements a modular architecture with the following components:

- **MCP Core**: Implements the Model Context Protocol for AI tool execution
- **Memory Service**: Manages AI context storage and retrieval with vector embeddings
- **Auth Service**: Handles user authentication and API token management
- **Backup Service**: Provides database backup and restore functionality
- **Audit Service**: Logs tool executions for security and compliance
- **Admin Panel**: Web interface for system management

## Configuration

The OPAL server can be configured through environment variables:

```
# Server Configuration
NODE_ENV=development                    # Environment (development, production)
MCP_PORT=3000                           # Port to run the server on

# Database Configuration
DB_FILE=./dev.sqlite3                   # SQLite database file path (development)
DB_HOST=localhost                       # PostgreSQL host (production)
DB_PORT=5432                            # PostgreSQL port (production)
DB_USER=postgres                        # PostgreSQL user (production)
DB_PASSWORD=postgres                    # PostgreSQL password (production)
DB_NAME=opal                            # PostgreSQL database name (production)

# Authentication Configuration
JWT_SECRET=opal_development_secret      # Secret key for JWT signing
JWT_EXPIRY=24h                          # JWT token expiry time

# MCP Configuration
MACHPOINT_MODE=persistent               # MCP mode (persistent, ephemeral)
MACHPOINT_EPHEMERAL_TIMEOUT=1800000     # Timeout for ephemeral sessions (ms)

# API Integration Configuration
MCP_API_COUNT=1                         # Number of API integrations
MCP_API_0_NAME=OpenAI                   # Name of the API
MCP_API_0_BASE_URL=https://api.openai.com/v1 # Base URL
MCP_API_0_AUTH_TYPE=bearer_token        # Auth type
MCP_API_0_AUTH_VALUE=your_openai_key    # Auth value
```

## Usage

### Running locally

```bash
# Install dependencies
npm install

# Run migrations to set up the database
npx knex migrate:latest

# Seed the database with initial data
npx knex seed:run

# Start the server
npm start
```

### Building and running with Docker

**Quick Start (Recommended):**
```bash
# Copy environment file
cp .env.docker.example .env

# Edit .env with your configuration
# Then start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f opal-server
```

**Manual Docker Commands:**
```bash
# Build the Docker image
docker build -t opal-server:latest .

# Run the Docker container
docker run -d \
  --name opal-server \
  -p 3000:3000 \
  -v opal-data:/data \
  -e NODE_ENV=development \
  -e JWT_SECRET=your_secret_key \
  opal-server:latest
```

**Windows Users:**
```cmd
REM Build the image
docker-build.bat

REM Run the server
docker-run.bat
```

For detailed Docker documentation, see [docs/DOCKER.md](docs/DOCKER.md)

### Building as a standalone component

This MCP server image is designed to be completely self-contained and can be built independently:

```bash
# Navigate to the mcp-server-image directory
cd path/to/mcp-server-image

# Build the Docker image
docker build -t opal-server:latest .
```

When used with MachPoint, this image serves as a template for dynamically created instances. MachPoint will use this image to create containers on demand with appropriate configuration.

### Accessing the Admin Panel

Once the server is running, you can access the admin panel at:

```
http://localhost:3000/admin
```

Default admin credentials:
- Username: admin
- Password: admin123

## MCP Protocol Compliance

The OPAL server implements the **MCP 2025-06-18 specification** with full support for all features:

### Base Protocol
- **JSON-RPC 2.0**: Standard message format for all communications
- **Protocol Version**: MCP 2025-06-18 with backward compatibility for 2025-03-26
- **Initialization**: Session management with capability negotiation
- **WebSocket & HTTP**: Support for both real-time and request-response communication
- **Error Handling**: Standardized error codes and messages
- **Rate Limiting**: Protection against API abuse

### Tools API
- **tools/list**: List available tools with pagination support
- **tools/call**: Execute tools with parameter validation
- **Structured Output**: Tools can return both human-readable content and structured JSON data
- **Output Schema**: Tools can declare their output format with JSON Schema
- **list_changed Notifications**: Real-time updates when tool availability changes
- **Content Types**: Support for text, image, audio, resource, and resource_link content types
- **Content Annotations**: Metadata support with audience, priority, and timestamps

### Resources API
- **resources/list**: List available resources with pagination and filtering
- **resources/read**: Read resource content with proper content type handling
- **resources/set**: Create or update resources with validation
- **resources/delete**: Remove resources securely
- **resources/subscribe**: Subscribe to resource changes
- **resources/unsubscribe**: Unsubscribe from resource changes
- **resources/templates**: Support for template fields and completions
- **list_changed Notifications**: Real-time updates when resource availability changes

### Prompts API
- **prompts/list**: List available prompts with pagination
- **prompts/get**: Retrieve prompts with argument substitution
- **prompts/set**: Create or update prompts with validation
- **prompts/delete**: Remove prompts securely
- **prompts/arguments**: Get available arguments for a prompt
- **prompts/complete**: Get completions for prompt arguments
- **list_changed Notifications**: Real-time updates when prompt availability changes

### Client Features (NEW in 2025-06-18)
- **elicitation/create**: Server-initiated user input requests with schema validation
- **Title Fields**: Human-friendly display names for tools, resources, and prompts
- **Resource Links**: Tools can reference resources with annotations
- **Structured Content**: Separate structured data from human-readable content

### Security
- **Authentication**: Secure access through API tokens
- **Input Validation**: Thorough validation of all parameters
- **Rate Limiting**: Configurable rate limits per endpoint
- **Audit Logging**: Comprehensive logging of all API operations

## What's New in MCP 2025-06-18

The OPAL server has been updated to support the latest MCP specification. Key improvements include:

- **Structured Tool Output**: Tools can now return both human-readable content and machine-readable structured data
- **Resource Links**: New `resource_link` content type for referencing resources with metadata
- **Content Annotations**: Add audience, priority, and timestamps to any content
- **Elicitation Support**: Servers can request user input with schema validation
- **Title Fields**: Optional display names for better UX
- **Output Schemas**: Tools can declare their output format

For detailed information, see:
- [MCP 2025-06-18 Update Summary](docs/MCP_2025-06-18_Update_Summary.md)
- [Quick Reference Guide](docs/MCP_2025-06-18_Quick_Reference.md)

## Memory Management

The OPAL server provides a comprehensive memory management system for AI context:

- **Create Memories**: Store important context for AI models
- **Edit Memories**: Update existing memories with new information
- **Delete Memories**: Remove outdated or incorrect memories
- **Search Memories**: Find relevant context based on keywords or semantic search
- **Metadata**: Attach custom metadata to memories for organization

## Security

The OPAL server implements comprehensive security measures:

- **User Authentication**: Secure login system for admin panel access
- **API Token Management**: Create, revoke, and manage API tokens with specific permissions
- **JWT Authentication**: Secure JSON Web Tokens for API authentication
- **Password Hashing**: Bcrypt hashing for secure password storage
- **Audit Logging**: Track all tool executions for security compliance
- **Database Backups**: Regular database backups to prevent data loss
- **Input Validation**: Thorough validation of all user inputs to prevent injection attacks
- **CORS Protection**: Configurable CORS settings to prevent unauthorized access
