# Stage 0: Build the thing
# Need debian based image to build the native rust module
# as musl doesn't support cdylib
# Stage 0: Build the thing
FROM node:22-slim AS builder

WORKDIR /src

# Install system dependencies first
RUN apt-get update && apt-get install -y build-essential cmake curl pkg-config libssl-dev git python3

# Install Rust - rustup installs to ~/.cargo/bin
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal

# Set PATH so cargo is available in all subsequent RUN commands
ENV PATH="/root/.cargo/bin:${PATH}"

# Verify Rust/Cargo is available
RUN cargo --version && rustc --version

# arm64 builds consume a lot of memory if `CARGO_NET_GIT_FETCH_WITH_CLI` is not
# set to true, so we expose it as a build-arg.
ARG CARGO_NET_GIT_FETCH_WITH_CLI=false
ENV CARGO_NET_GIT_FETCH_WITH_CLI=$CARGO_NET_GIT_FETCH_WITH_CLI

# Copy package files
COPY package.json yarn.lock ./

# Install JavaScript dependencies (skip build scripts for now)
RUN yarn config set yarn-offline-mirror /cache/yarn && \
    yarn --ignore-scripts --network-timeout 900000

# Copy entire source code
COPY . ./

# Fix line endings and permissions for shell scripts
RUN find . -type f -name "*.sh" -exec sed -i 's/\r$//' {} + && \
    find . -type f -name "*.sh" -exec chmod +x {} +

# Full build: cargo build for Rust, then TypeScript compilation
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
