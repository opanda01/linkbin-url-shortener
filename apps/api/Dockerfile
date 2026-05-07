# Stage 1: bağımlılık yükle
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: çalıştır
FROM node:22-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "src/server.js"]
