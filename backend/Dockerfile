FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig*.json ./
COPY backend/package*.json ./backend/
COPY backend/tsconfig*.json ./backend/

RUN npm ci

COPY backend/ ./backend/
COPY prisma/ ./prisma/

WORKDIR /usr/src/app/backend
RUN npx prisma generate --schema=../prisma/schema.prisma
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY prisma/ ./prisma/

RUN npm ci --only=production

COPY --from=builder /usr/src/app/backend/dist ./backend/dist
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

WORKDIR /usr/src/app/backend
CMD ["node", "dist/index.js"]
