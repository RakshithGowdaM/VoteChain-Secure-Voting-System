FROM node:18-alpine AS base
WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY src ./src

# Create logs directory
RUN mkdir -p logs

EXPOSE 5000

CMD ["node", "src/index.js"]
