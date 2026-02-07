FROM node:18-alpine

# Install build dependencies and runtime tools
RUN apk add --no-cache \
    wget \
    python3 \
    make \
    g++ \
    sqlite

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install ALL dependencies (needed for migrations and native modules)
# Remove --production flag to include knex and other dev dependencies
RUN npm ci

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code and configuration files
COPY src/ ./src/
COPY knexfile.js ./
COPY migrations/ ./migrations/
COPY seeds/ ./seeds/

# Build TypeScript to JavaScript
RUN npm run build

# Create public directory for static files
RUN mkdir -p ./src/public

# Create data directory for database persistence
RUN mkdir -p /data && \
    mkdir -p /app/database && \
    chmod -R 755 /data

VOLUME /data

# Expose MCP server port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV MCP_PORT=3000
ENV DB_FILE=/data/opal.sqlite3
# Keep original environment variables for backward compatibility
ENV MACHPOINT_MODE=persistent
ENV MACHPOINT_EPHEMERAL_TIMEOUT=1800000
# Add new OPAL-branded environment variables
ENV OPAL_MODE=persistent
ENV OPAL_EPHEMERAL_TIMEOUT=1800000
ENV JWT_SECRET=opal_development_secret
ENV JWT_EXPIRY=24h

# Create a startup script
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Start the server using the entrypoint script
CMD ["/app/docker-entrypoint.sh"]
