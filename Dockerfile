ARG NODE_VERSION=22.21.1

# Use AWS ECR Public mirror of the official Docker Library images (avoids Docker Hub token outages)
FROM public.ecr.aws/docker/library/node:${NODE_VERSION}-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Install pnpm
ARG PNPM_VERSION=10.14.0
RUN npm i -g pnpm@${PNPM_VERSION}

FROM base AS build

# Build deps
RUN apt-get update -qq \
  && apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 \
  && rm -rf /var/lib/apt/lists/*

# Install deps
COPY .npmrc package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Build-time environment variables (passed via docker build --build-arg)
ARG CLERK_PUBLISHABLE_KEY
ARG VITE_PUBLIC_BUILDER_KEY

# Copy source
COPY . .

# Pass build args as environment variables to the build step
ENV CLERK_PUBLISHABLE_KEY="${CLERK_PUBLISHABLE_KEY}"
ENV VITE_PUBLIC_BUILDER_KEY="${VITE_PUBLIC_BUILDER_KEY}"

# Build - Vite uses these env vars to embed them into the client bundle
RUN pnpm run build

# Prune dev deps for runtime image
RUN pnpm prune --prod

FROM base AS runtime

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json

# Keep a safe default for PORT (can be overridden by container environment)
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/server/node-build.mjs"]
