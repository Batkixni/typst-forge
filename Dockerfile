FROM node:22-alpine AS builder

RUN apk add --no-cache wget tar xz python3 make g++

RUN wget -qO- https://github.com/typst/typst/releases/download/v0.13.1/typst-x86_64-unknown-linux-musl.tar.xz \
  | tar -xJ -C /tmp && \
  mv /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst && \
  rm -rf /tmp/typst-x86_64-unknown-linux-musl

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner

RUN apk add --no-cache wget tar xz

RUN wget -qO- https://github.com/typst/typst/releases/download/v0.13.1/typst-x86_64-unknown-linux-musl.tar.xz \
  | tar -xJ -C /tmp && \
  mv /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst && \
  rm -rf /tmp/typst-x86_64-unknown-linux-musl

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output already includes traced dependencies
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Ensure wasm assets are present if emitted outside standalone trace
COPY --from=builder /app/.next/server ./.next/server

RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]
