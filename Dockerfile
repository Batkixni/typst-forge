FROM node:20-alpine AS builder

RUN apk add --no-cache wget tar xz

RUN wget -qO- https://github.com/typst/typst/releases/download/v0.13.1/typst-x86_64-unknown-linux-musl.tar.xz \
  | tar -xJ -C /tmp && \
  mv /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst && \
  rm -rf /tmp/typst-x86_64-unknown-linux-musl

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache wget tar xz

RUN wget -qO- https://github.com/typst/typst/releases/download/v0.13.1/typst-x86_64-unknown-linux-musl.tar.xz \
  | tar -xJ -C /tmp && \
  mv /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst && \
  rm -rf /tmp/typst-x86_64-unknown-linux-musl

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000
CMD ["next", "start"]
