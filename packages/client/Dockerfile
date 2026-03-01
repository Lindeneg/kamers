# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy workspace root + package manifests for install
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/client/package.json packages/client/

RUN npm ci -w packages/shared -w packages/client

# Copy source
COPY packages/shared/ packages/shared/
COPY packages/client/ packages/client/

# Build shared (needed by vite.config.ts and client code)
RUN npm run build -w packages/shared

# Create .env so loadEnv succeeds during vite build
# API_URL is only used for the Vite dev proxy, not in the built output
RUN echo "API_URL=http://localhost:3000" > packages/client/.env

RUN npm run build -w packages/client

# Production stage — static files served by nginx
FROM nginx:alpine
COPY --from=build /app/packages/client/dist /usr/share/nginx/html
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
