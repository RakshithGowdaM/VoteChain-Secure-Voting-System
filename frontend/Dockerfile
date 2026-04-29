FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY public/ ./public/
COPY src/ ./src/

ARG REACT_APP_API_URL
ARG REACT_APP_ELECTION_NAME="General Election 2025"
ARG REACT_APP_BLOCKCHAIN_EXPLORER=https://etherscan.io/tx

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_ELECTION_NAME=$REACT_APP_ELECTION_NAME
ENV REACT_APP_BLOCKCHAIN_EXPLORER=$REACT_APP_BLOCKCHAIN_EXPLORER

RUN npm run build

# ── Serve with nginx ──────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

# React Router support
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
  location /api { proxy_pass http://backend:5000; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
