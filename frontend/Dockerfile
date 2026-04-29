FROM node:18-alpine AS build
WORKDIR /app

ARG REACT_APP_API_URL
ARG REACT_APP_ELECTION_NAME
ARG REACT_APP_BLOCKCHAIN_EXPLORER

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_ELECTION_NAME=$REACT_APP_ELECTION_NAME
ENV REACT_APP_BLOCKCHAIN_EXPLORER=$REACT_APP_BLOCKCHAIN_EXPLORER

COPY package.json package-lock.json* ./
RUN npm ci

COPY public ./public
COPY src ./src

RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────
FROM nginx:alpine AS production
COPY --from=build /app/build /usr/share/nginx/html

# SPA routing: redirect all requests to index.html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' \
    > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
