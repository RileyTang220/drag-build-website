FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# prisma.config.ts 在加载时需要 DATABASE_URL；镜像构建阶段无需真实数据库
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webbuilder
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && exec npm run start"]
