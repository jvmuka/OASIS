# ----------------------------------------------------
# Stage 1: Build da aplicacao NestJS
# ----------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ----------------------------------------------------
# Stage 2: Imagem final de execucao
# ----------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Diretorio para persistencia de uploads de imagens
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "dist/main.js"]
