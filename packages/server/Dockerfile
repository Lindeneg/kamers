# Build stage
FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache python3 make g++

# Copy workspace root + package manifests for install
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/

RUN npm ci -w packages/shared -w packages/server

# Copy source
COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/

# Build shared → generate prisma client → build server (esbuild bundle)
RUN npm run build -w packages/shared
RUN cd packages/server && npx prisma generate --config prisma.config.docker.ts
RUN npm run build -w packages/server

# Production stage
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/

RUN npm ci -w packages/shared -w packages/server --omit=dev

# Copy built shared package
COPY --from=build /app/packages/shared/dist packages/shared/dist

# Copy bundled server output (single file from esbuild)
COPY --from=build /app/packages/server/dist/index.js packages/server/dist/index.js

# Copy prisma artifacts (generated client, schema, migrations, docker config)
COPY --from=build /app/packages/server/src/generated packages/server/src/generated
COPY --from=build /app/packages/server/prisma packages/server/prisma
COPY --from=build /app/packages/server/prisma.config.docker.ts packages/server/prisma.config.docker.ts

WORKDIR /app/packages/server

# Create empty .env so loadEnv doesn't fail (env vars injected by docker/k8s)
RUN touch .env

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --config prisma.config.docker.ts && node dist/index.js"]
