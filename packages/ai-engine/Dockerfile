FROM node:24-slim AS build
WORKDIR /repo
COPY . .
RUN npm ci --ignore-scripts
RUN npm run build --workspace=packages/ai-engine

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/packages/ai-engine/dist/server.js /repo/packages/ai-engine/dist/analysis.js /repo/packages/ai-engine/dist/market.js ./dist/
USER node
EXPOSE 8000
CMD ["node", "dist/server.js"]
