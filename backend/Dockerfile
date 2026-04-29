FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src/ ./src/

# Create logs dir
RUN mkdir -p logs

EXPOSE 5000

CMD ["node", "src/server.js"]
