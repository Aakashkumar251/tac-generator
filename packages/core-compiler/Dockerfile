# ============================================================
# @ctac/core-compiler — Standalone Dockerfile
# Build context MUST be the project root:
#   docker build -t ctac-compiler -f packages/core-compiler/Dockerfile .
# ============================================================

FROM node:20-alpine

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json        ./packages/shared/package.json
COPY packages/core-compiler/package.json ./packages/core-compiler/package.json

# Install only the deps needed by shared + core-compiler
RUN npm ci --ignore-scripts

# Copy source for shared (transitive dependency) and core-compiler
COPY packages/shared/        ./packages/shared/
COPY packages/core-compiler/ ./packages/core-compiler/

# Default command: run the compiler test suite
CMD ["npm", "run", "test", "--workspace=@ctac/core-compiler"]
