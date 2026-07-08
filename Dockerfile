# Stage 1: Build the client
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy package files first
COPY client/package.json .

# Install client dependencies using npm install (no package-lock in subdir)
RUN npm install

# Copy client source
COPY client/ ./

# Build client
RUN npm run build

# Stage 2: Build the server
FROM node:20-alpine AS server-builder

WORKDIR /app/server

# Copy package files first
COPY server/package.json .

# Install server dependencies using npm install (no package-lock in subdir)
RUN npm install

# Copy server source
COPY server/ ./

# Build TypeScript
RUN npm run build

# Stage 3: Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built client from client-builder
COPY --from=client-builder /app/client/dist ./client/dist

# Copy built server from server-builder
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package.json ./

# Create .env from example if it doesn't exist
COPY server/.env.example .env

# Expose port
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production
ENV CLIENT_ORIGIN=http://0.0.0.0:4000

# Start the application
CMD ["node", "dist/index.js"]
