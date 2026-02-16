FROM node:20-alpine AS build

WORKDIR /app

RUN chown -R node:node /app

COPY --chown=node:node package.json package-lock.json* ./

USER node

# TODO: When a lockfile exists, prefer `npm ci` for reproducible builds.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src

RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]


