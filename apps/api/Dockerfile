# Built with the monorepo root as build context (see RAILWAY_DOCKERFILE_PATH
# in the deploy setup) so `npm ci` can resolve the npm-workspaces dependency
# on @alpha-trade/shared-types.
FROM node:20-slim

WORKDIR /repo
COPY . .

RUN npm ci
RUN npm run build --workspace=packages/shared-types

# prisma generate only needs DATABASE_URL to be a well-formed connection
# string at build time (no live DB connection is made) — apps/api/src/prisma
# isn't wired into any module yet, but the file still needs generated types
# to typecheck during `nest build`.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate --schema packages/database/prisma/schema.prisma

RUN npm run build --workspace=apps/api

WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
