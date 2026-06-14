FROM node:20-slim

# Chrome dependencies pour Puppeteer
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-freefont-ttf \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.js ./

# Dossier de sessions persistantes (monter un volume ici en prod)
RUN mkdir -p sessions

EXPOSE 3001

CMD ["node", "index.js"]
