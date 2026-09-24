FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
COPY --chmod=755 docker-entrypoint.sh ./

USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" > /dev/null || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
