FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time placeholders — `prisma generate` and `next build` don't need to
# reach the database; the schema's `env(...)` references are resolved at
# runtime, not at generate time. Keeping a dummy value defensively.
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webbuilder
ARG DIRECT_URL=postgresql://postgres:postgres@localhost:5432/webbuilder
ENV DATABASE_URL=${DATABASE_URL}
ENV DIRECT_URL=${DIRECT_URL}

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && exec npm run start"]
