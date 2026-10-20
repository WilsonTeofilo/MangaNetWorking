# ==========================================
# STAGE 1: Build da Aplicação React com Node 22
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

# Otimização de cache do npm
COPY package.json package-lock.json ./
RUN npm ci

# Copia código-fonte e compila (tsc + vite build)
COPY . .
RUN npm run build

# ==========================================
# STAGE 2: Servidor Nginx Alpine de Produção
# ==========================================
FROM nginx:1.27-alpine
LABEL maintainer="MangaNetWorking Team"

# Remove configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copia configuração customizada com proxy reverso e SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos compilados do estágio anterior
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=20s --timeout=3s --retries=3 \
  CMD wget --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
