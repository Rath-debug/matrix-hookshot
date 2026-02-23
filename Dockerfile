# Stage 0: Build the thing
# Need debian based image to build the native rust module
# as musl doesn't support cdylib
# Stage 0: Build the thing
FROM node:22-slim AS builder

# Add git to the install list here!
RUN apt-get update && apt-get install -y build-essential cmake curl pkg-config libssl-dev git

RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --profile minimal
ENV PATH="/root/.cargo/bin:${PATH}"

# arm64 builds consume a lot of memory if `CARGO_NET_GIT_FETCH_WITH_CLI` is not
# set to true, so we expose it as a build-arg.
ARG CARGO_NET_GIT_FETCH_WITH_CLI=false
ENV CARGO_NET_GIT_FETCH_WITH_CLI=$CARGO_NET_GIT_FETCH_WITH_CLI


WORKDIR /src

COPY package.json yarn.lock ./
RUN yarn config set yarn-offline-mirror /cache/yarn
RUN yarn --ignore-scripts --pure-lockfile --network-timeout 900000

COPY . ./
RUN find . -type f -name "*.sh" -exec sed -i 's/\r$//' {} +
RUN yarn install --network-timeout 900000
RUN yarn build


# Stage 1: The actual container
FROM node:22-slim

WORKDIR /bin/matrix-hookshot

RUN apt-get update && apt-get install -y openssl ca-certificates

COPY --from=builder /src/yarn.lock /src/package.json ./
COPY --from=builder /cache/yarn /cache/yarn
RUN yarn config set yarn-offline-mirror /cache/yarn

RUN yarn --network-timeout 900000 --production --pure-lockfile && yarn cache clean

COPY --from=builder /src/lib ./
COPY --from=builder /src/public ./public
COPY --from=builder /src/assets ./assets

# Copy startup script and make it executable
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV NODE_ENV="development"

EXPOSE 9993
EXPOSE 7775

ENTRYPOINT ["/docker-entrypoint.sh"]
