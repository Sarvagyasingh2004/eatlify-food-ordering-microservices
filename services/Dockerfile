# One image definition for all six services. They are structurally identical -
# tsc compiles src/ to dist/ and `node dist/index.js` starts them - so a single
# parameterised Dockerfile beats six near-identical copies.
#
# Build context is the `services/` directory; pick the service with SERVICE:
#   docker build --build-arg SERVICE=auth -t eatlify-auth services/
#
# node:24-alpine is multi-arch, so this builds natively on both x86_64 and
# arm64 (Oracle Ampere, Apple Silicon) with no cross-compilation.
#
# The tag matters: node:22-alpine bundles npm 10, which resolves the googleapis
# dependency tree differently from the npm 11 that generated these lockfiles
# and rejects them with EUSAGE. Node 24 ships npm 11 and `npm ci` succeeds.
ARG NODE_VERSION=24-alpine

# ---------- build ----------
FROM node:${NODE_VERSION} AS builder
ARG SERVICE
WORKDIR /app

# Copy manifests first so `npm ci` is cached until dependencies actually change
COPY ${SERVICE}/package.json ${SERVICE}/package-lock.json ./
RUN npm ci

COPY ${SERVICE}/tsconfig.json ./
COPY ${SERVICE}/src ./src
RUN npm run build

# ---------- runtime ----------
FROM node:${NODE_VERSION} AS runtime
ARG SERVICE
ENV NODE_ENV=production
WORKDIR /app

COPY ${SERVICE}/package.json ${SERVICE}/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# No service writes to disk (multer uses memoryStorage), so drop root.
USER node

# Alpine has neither curl nor wget, so probe the port with node itself.
HEALTHCHECK --interval=30s --timeout=3s --start-period=45s --retries=3 \
    CMD node -e "const s=require('net').connect(Number(process.env.PORT),'127.0.0.1');s.on('connect',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1))"

CMD ["node", "dist/index.js"]
