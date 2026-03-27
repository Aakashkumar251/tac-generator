# ============================================================
# @ctac/app-shell — Standalone Dockerfile
# Build context MUST be the project root:
#   docker build -t ctac-app -f packages/app-shell/Dockerfile .
# ============================================================

# ----------------------------------------------------------
# Stage 1: Install workspace dependencies
# ----------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json        ./packages/shared/package.json
COPY packages/core-compiler/package.json ./packages/core-compiler/package.json
COPY packages/visualizers/package.json   ./packages/visualizers/package.json
COPY packages/optimizers/package.json    ./packages/optimizers/package.json
COPY packages/app-shell/package.json     ./packages/app-shell/package.json

RUN npm ci --ignore-scripts

# ----------------------------------------------------------
# Stage 2: Build the app-shell
# ----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules       ./node_modules
COPY --from=deps /app/packages/shared/node_modules        ./packages/shared/node_modules
COPY --from=deps /app/packages/core-compiler/node_modules  ./packages/core-compiler/node_modules
COPY --from=deps /app/packages/visualizers/node_modules    ./packages/visualizers/node_modules
COPY --from=deps /app/packages/optimizers/node_modules     ./packages/optimizers/node_modules
COPY --from=deps /app/packages/app-shell/node_modules      ./packages/app-shell/node_modules

COPY . .

RUN npm run build --workspace=@ctac/app-shell

# ----------------------------------------------------------
# Stage 3: Serve with Nginx
# ----------------------------------------------------------
FROM nginx:1.27-alpine AS production

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/packages/app-shell/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
