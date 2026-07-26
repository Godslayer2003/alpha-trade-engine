# Built with the monorepo root as build context (see RAILWAY_DOCKERFILE_PATH
# in the deploy setup) so `npm ci` can resolve the npm-workspaces dependency
# on @alpha-trade/shared-types.
FROM node:20-slim

# Prisma's schema/query engine binaries need OpenSSL to be present in the
# image — node:20-slim doesn't ship it, which makes both `prisma generate`
# and `prisma migrate deploy` fail at runtime with a schema engine error.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
COPY . .

RUN npm ci
RUN npm run build --workspace=packages/shared-types

# prisma generate only needs DATABASE_URL to be a well-formed connection
# string at build time (no live DB connection is made) — the real DATABASE_URL
# is injected at runtime by Railway and used below to apply migrations.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate --schema packages/database/prisma/schema.prisma

RUN npm run build --workspace=apps/api

EXPOSE 3001
# Apply any pending migrations against the real runtime DATABASE_URL before
# starting the server, so new deploys pick up schema changes automatically.
CMD ["sh", "-c", "npx prisma migrate deploy --schema packages/database/prisma/schema.prisma && cd apps/api && npm run start:prod"]
