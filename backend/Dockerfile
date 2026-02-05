FROM node:20-bookworm-slim
WORKDIR /app

# Dependencias del sistema para Chrome/Puppeteer y fuentes
RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates \
	fonts-noto \
	fonts-noto-cjk \
	fonts-noto-color-emoji \
	libasound2 \
	libatk1.0-0 \
	libatk-bridge2.0-0 \
	libc6 \
	libdrm2 \
	libgbm1 \
	libgtk-3-0 \
	libnss3 \
	libx11-6 \
	libx11-xcb1 \
	libxcb1 \
	libxcomposite1 \
	libxdamage1 \
	libxext6 \
	libxfixes3 \
	libxrandr2 \
	libxshmfence1 \
	libxss1 \
	wget && \
	rm -rf /var/lib/apt/lists/*

# Instalar dependencias primero (mejor cache)
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copiar solo el código necesario del backend
# Copiar backend y el config de precios necesario por el backend
COPY api ./api
COPY assets/config ./assets/config
COPY reports/templates ./reports/templates

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Iniciar el servidor
CMD ["npm", "start"]
