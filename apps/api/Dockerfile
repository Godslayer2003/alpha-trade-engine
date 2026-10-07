# Built with the monorepo root as the Render Docker context so `npm ci` can
# resolve the npm-workspaces dependency
# on @alpha-trade/shared-types.
FROM node:24-slim AS api-build

# Prisma's schema/query engine binaries need OpenSSL to be present in the
# image — node:24-slim doesn't ship it, which makes both `prisma generate`
# and `prisma migrate deploy` fail at runtime with a schema engine error.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
COPY . .

RUN npm ci
RUN npm run build --workspace=packages/shared-types

# prisma generate only needs DATABASE_URL to be a well-formed connection
# string at build time (no live DB connection is made) — the real DATABASE_URL
# is injected only when the container runs.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate --schema packages/database/prisma/schema.prisma

RUN npm run build --workspace=apps/api

ENV NODE_ENV=production
USER node
EXPOSE 3001

# Staged deployment targets. The migration job receives the owner URL; the API
# receives only the restricted runtime URL. Neither receives the other's secret.
FROM api-build AS migration
CMD ["./node_modules/.bin/prisma", "migrate", "deploy", "--schema", "packages/database/prisma/schema.prisma"]

FROM api-build AS runtime
CMD ["node", "apps/api/dist/main.js"]

# Keep the existing deployment contract until the separate job and runtime role
# have been configured and verified. Select --target runtime for the transition.
FROM api-build AS legacy
# Apply any pending migrations against the real runtime DATABASE_URL before
# starting the server, so new deploys pick up schema changes automatically.
CMD ["sh", "-c", "npx prisma migrate deploy --schema packages/database/prisma/schema.prisma && cd apps/api && npm run start:prod"]
