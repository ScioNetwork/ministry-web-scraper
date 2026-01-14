# Use Node.js 20 LTS
FROM node:20-bullseye

# Install dependencies required by Playwright/Chromium
RUN apt-get update && apt-get install -y \
    wget gnupg2 libnss3 libatk1.0-0 libcups2 \
    libx11-xcb1 libxcomposite1 libxrandr2 \
    libasound2 libpangocairo-1.0-0 \
    fonts-liberation libgbm1 libgtk-3-0 \
    libxshmfence1 libatk-bridge2.0-0 \
    libdrm2 libxrender1 libxext6 \
    libxfixes3 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Install Chromium for Playwright
RUN npx playwright install chromium

# Set Cloud Run port
ENV PORT=8080
EXPOSE 8080

# Run server
CMD ["node", "server.js"]
