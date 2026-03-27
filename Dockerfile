# ============================================================
# Insight Builder v4.0 — Root Dockerfile
# Multi-stage build: installs all workspaces, builds the
# app-shell, and serves the static output via Nginx.
# ============================================================

# ----------------------------------------------------------
# Stage 1: Dependencies
# ----------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only manifests first (better layer caching)
COPY package.json package-lock.json ./
COPY packages/shared/package.json        ./packages/shared/package.json
COPY packages/core-compiler/package.json ./packages/core-compiler/package.json
COPY packages/visualizers/package.json   ./packages/visualizers/package.json
COPY packages/optimizers/package.json    ./packages/optimizers/package.json
COPY packages/app-shell/package.json     ./packages/app-shell/package.json

RUN npm ci --ignore-scripts

# ----------------------------------------------------------
# Stage 2: Build
# ----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Bring in installed node_modules
COPY --from=deps /app/node_modules       ./node_modules
COPY --from=deps /app/packages/shared/node_modules        ./packages/shared/node_modules
COPY --from=deps /app/packages/core-compiler/node_modules  ./packages/core-compiler/node_modules
COPY --from=deps /app/packages/visualizers/node_modules    ./packages/visualizers/node_modules
COPY --from=deps /app/packages/optimizers/node_modules     ./packages/optimizers/node_modules
COPY --from=deps /app/packages/app-shell/node_modules      ./packages/app-shell/node_modules

# Copy all source code
COPY . .

# Build the app-shell (Vite production build)
RUN npm run build --workspace=@ctac/app-shell

# ----------------------------------------------------------
# Stage 3: Production — Nginx
# ----------------------------------------------------------
FROM nginx:1.27-alpine AS production

# Remove default Nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from the builder stage
COPY --from=builder /app/packages/app-shell/dist /usr/share/nginx/html

# Copy custom Nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
