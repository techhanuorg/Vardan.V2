FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY frontend/tsconfig*.json ./frontend/
COPY frontend/vite.config.ts ./frontend/

RUN npm ci

COPY frontend/ ./frontend/

WORKDIR /usr/src/app/frontend
RUN npm run build

FROM nginx:alpine

COPY --from=builder /usr/src/app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
