# ----------------------------------------------------
# Stage 1: Build do frontend React / Vite
# ----------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_MODO_DEMO=false
ENV VITE_MODO_DEMO=$VITE_MODO_DEMO
RUN npm run build

# ----------------------------------------------------
# Stage 2: Servidor Nginx em producao
# ----------------------------------------------------
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
