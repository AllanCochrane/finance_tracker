FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies (including devDependencies for building)
COPY package*.json ./
# Native modules like better-sqlite3 may require python/make if pre-built binaries are not available for the host platform.
# We install standard build tools just in case.
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the frontend (Vite) and backend (esbuild)
RUN npm run build

# --- Production Image ---
FROM node:22-slim

WORKDIR /app

# Install runtime tools needed for native modules just in case (optional, but node handles pre-built sqlite binaries)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the built output from the builder stage
COPY --from=builder /app/dist ./dist

# Create a volume directory for data (like the sqlite database)
# The application expects the database in the root or a configurable path. 
# Inside server_db.ts, it uses `expenses.db` by default. 
# We'll set up a volume at /app/data and an env var so you can mount persistent storage.
ENV NODE_ENV=production
ENV CUSTOM_PORT=3000

# Make sure the application accesses the port from environment variables
EXPOSE 3000

# Start the Node.js server
CMD ["npm", "start"]
