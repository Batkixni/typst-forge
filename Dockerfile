FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates xz-utils \
  && rm -rf /var/lib/apt/lists/*

RUN wget -qO- https://github.com/typst/typst/releases/download/v0.13.1/typst-x86_64-unknown-linux-gnu.tar.xz \
  | tar -xJ -C /tmp && \
  mv /tmp/typst-x86_64-unknown-linux-gnu/typst /usr/local/bin/typst && \
  rm -rf /tmp/typst-x86_64-unknown-linux-gnu

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates xz-utils \
  && rm -rf /var/lib/apt/lists/*

RUN wget -qO- https://github.com/typst/typst/releases/download/v0.13.1/typst-x86_64-unknown-linux-gnu.tar.xz \
  | tar -xJ -C /tmp && \
  mv /tmp/typst-x86_64-unknown-linux-gnu/typst /usr/local/bin/typst && \
  rm -rf /tmp/typst-x86_64-unknown-linux-gnu

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
