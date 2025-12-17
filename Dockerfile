# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV NODE_ENV="production"

ARG PNPM_VERSION=latest
RUN npm install -g pnpm@$PNPM_VERSION


FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

COPY .npmrc package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

COPY . .
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_PUBLIC_BUILDER_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_PUBLIC_BUILDER_KEY=$VITE_PUBLIC_BUILDER_KEY
RUN pnpm run build

RUN pnpm prune --prod


FROM base

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json

EXPOSE 80

ENV PORT=80

CMD [ "node", "dist/server/production.mjs" ]
