
ARG NODE_VERSION=22.21.1

FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app

# Needed for pnpm installs
ARG PNPM_VERSION=latest
RUN npm install -g pnpm@${PNPM_VERSION}

# -------------------------
# Build stage
# -------------------------
FROM base AS build

# Build deps (for native modules)
RUN apt-get update -qq && \
  apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 && \
  rm -rf /var/lib/apt/lists/*

# Install deps
COPY .npmrc package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Copy source
COPY . .

# Vite build-time env (optional, but supported)
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_PUBLIC_BUILDER_KEY

# Make them available to the build step (vite reads import.meta.env)
ENV VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}
ENV VITE_PUBLIC_BUILDER_KEY=${VITE_PUBLIC_BUILDER_KEY}

# Build
RUN pnpm run build

# Prune dev deps for runtime image
RUN pnpm prune --prod

# -------------------------
# Runtime stage
# -------------------------
FROM base AS runtime
ENV NODE_ENV=production

# Copy only what we need to run
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json

# Railway provides PORT; app should listen on process.env.PORT.
# Expose is informational; your logs show 8080, so keep it.
EXPOSE 8080

# Use the same entrypoint that your logs show working
CMD ["node", "dist/server/node-build.mjs"]
