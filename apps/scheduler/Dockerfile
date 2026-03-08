FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps apps
COPY packages packages
COPY connectors connectors
RUN pnpm install
RUN pnpm --filter @claricore/scheduler build
CMD ["pnpm","--filter","@claricore/scheduler","start"]
