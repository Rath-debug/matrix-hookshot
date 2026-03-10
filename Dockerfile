# Stage 0: Build the thing
# Need debian based image to build the native rust module
# as musl doesn't support cdylib
# Stage 0: Build the thing
FROM node:22-slim AS builder

WORKDIR /src

# Install system dependencies first (needed for building)
RUN apt-get update && apt-get install -y build-essential cmake curl pkg-config libssl-dev git python3

# Install Rust via rustup
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | bash -s -- -y --profile minimal && \
    . $HOME/.cargo/env && \
    cargo --version

ENV PATH="/root/.cargo/bin:${PATH}"

# arm64 builds consume a lot of memory if `CARGO_NET_GIT_FETCH_WITH_CLI` is not
# set to true, so we expose it as a build-arg.
ARG CARGO_NET_GIT_FETCH_WITH_CLI=false
ENV CARGO_NET_GIT_FETCH_WITH_CLI=$CARGO_NET_GIT_FETCH_WITH_CLI

# Copy package files
COPY package.json yarn.lock ./

# Set up yarn cache and install dependencies (skip scripts since source isn't copied yet)
RUN yarn config set yarn-offline-mirror /cache/yarn && \
    yarn --ignore-scripts --network-timeout 900000

# Copy entire source code
COPY . ./

# Fix line endings and permissions for shell scripts
RUN find . -type f -name "*.sh" -exec sed -i 's/\r$//' {} + && \
    find . -type f -name "*.sh" -exec chmod +x {} +

# Build everything (Rust native module + TypeScript)
RUN yarn build


# Stage 1: The actual container
FROM node:22-slim

WORKDIR /bin/matrix-hookshot

RUN apt-get update && apt-get install -y openssl ca-certificates gettext-base

COPY --from=builder /src/yarn.lock /src/package.json ./
COPY --from=builder /src/scripts ./scripts
RUN yarn --network-timeout 900000 --production --pure-lockfile && yarn cache clean

COPY --from=builder /src/lib ./
COPY --from=builder /src/public ./public
COPY --from=builder /src/assets ./assets
COPY --from=builder /src/*.node ./
COPY --from=builder /src/public ./public

# Copy production config files (with environment variable placeholders)
# These will be expanded at runtime by docker-entrypoint.sh using envsubst
COPY config.railway.production.yml /bin/matrix-hookshot/config.railway.production.yml
COPY registration.railway.production.yml /bin/matrix-hookshot/registration.railway.production.yml

# Copy startup script and make it executable
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create /data directory
RUN mkdir -p /data

ENV NODE_ENV="production"

EXPOSE 9993

ENTRYPOINT ["/docker-entrypoint.sh"]
