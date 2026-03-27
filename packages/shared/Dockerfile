# ============================================================
# @ctac/shared — Standalone Dockerfile
# Build context MUST be the project root:
#   docker build -t ctac-shared -f packages/shared/Dockerfile .
# ============================================================

FROM node:20-alpine

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json   ./packages/shared/package.json

# Install dependencies
RUN npm ci --ignore-scripts

# Copy source
COPY packages/shared/ ./packages/shared/

# Default command: run the shared test suite
CMD ["npm", "run", "test", "--workspace=@ctac/shared"]
