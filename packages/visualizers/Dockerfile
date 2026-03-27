# ============================================================
# @ctac/visualizers — Standalone Dockerfile
# Build context MUST be the project root:
#   docker build -t ctac-visualizers -f packages/visualizers/Dockerfile .
# ============================================================

FROM node:20-alpine

WORKDIR /app

# Copy workspace manifests (includes transitive deps)
COPY package.json package-lock.json ./
COPY packages/shared/package.json        ./packages/shared/package.json
COPY packages/core-compiler/package.json ./packages/core-compiler/package.json
COPY packages/visualizers/package.json   ./packages/visualizers/package.json

# Install dependencies
RUN npm ci --ignore-scripts

# Copy source for shared, core-compiler (transitive), and visualizers
COPY packages/shared/        ./packages/shared/
COPY packages/core-compiler/ ./packages/core-compiler/
COPY packages/visualizers/   ./packages/visualizers/

# Default command: run the visualizers test suite
CMD ["npm", "run", "test", "--workspace=@ctac/visualizers"]
