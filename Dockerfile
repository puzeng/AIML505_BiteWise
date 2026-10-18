FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json

RUN npm ci

COPY client client
COPY server server

RUN npm run build \
  && chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=8080
ENV BITEWISE_DB=/tmp/bitewise.sqlite

USER node
EXPOSE 8080

CMD ["npm", "start"]
