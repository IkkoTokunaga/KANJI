FROM node:22-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS dev
ARG HOST_HOME=/home/ikk
ARG HOST_UID=1000
ARG HOST_GID=1000
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
# Claude Code itself is provided by mounting the host's native install
# (~/.local/bin/claude) at the same path — see compose.yaml. We only install
# the extra global tooling here.
RUN npm install -g @fission-ai/openspec@latest
# Align the container's HOME/UID with the host so the shared ~/.claude.json
# (installMethod: native) resolves the same ~/.local/bin/claude path.
ENV HOME=${HOST_HOME}
ENV PATH=${HOST_HOME}/.local/bin:${PATH}
RUN mkdir -p ${HOST_HOME}/.local/bin \
 && chown -R ${HOST_UID}:${HOST_GID} ${HOST_HOME}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
