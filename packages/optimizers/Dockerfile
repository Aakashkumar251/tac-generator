# ============================================================
# @ctac/optimizers — Standalone Dockerfile
# Build context MUST be the project root:
#   docker build -t ctac-optimizers -f packages/optimizers/Dockerfile .
# ============================================================

FROM node:20-alpine

WORKDIR /app

# Copy workspace manifests (includes transitive deps)
COPY package.json package-lock.json ./
COPY packages/shared/package.json        ./packages/shared/package.json
COPY packages/core-compiler/package.json ./packages/core-compiler/package.json
COPY packages/optimizers/package.json    ./packages/optimizers/package.json

# Install dependencies
RUN npm ci --ignore-scripts

# Copy source for shared, core-compiler (transitive), and optimizers
COPY packages/shared/        ./packages/shared/
COPY packages/core-compiler/ ./packages/core-compiler/
COPY packages/optimizers/    ./packages/optimizers/

# Default command: run the optimizers test suite
CMD ["npm", "run", "test", "--workspace=@ctac/optimizers"]
