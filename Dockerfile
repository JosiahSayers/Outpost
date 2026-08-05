# syntax=docker/dockerfile:1
# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y gdal-bin unzip && rm -rf /var/lib/apt/lists/*

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
ARG COMMIT_SHA
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
RUN bunx --bun prisma generate
# The frontend Sentry DSN is a public identifier (safe to embed in
# client-side code) and this app only has one deployed environment, so
# these are hardcoded rather than threaded through as build args/CI secrets.
RUN NODE_ENV=production \
    BUN_PUBLIC_SHA=$COMMIT_SHA \
    BUN_PUBLIC_SENTRY_DSN=https://c2fd120dcf22ae492553be8f8ebbc47f@o1160609.ingest.us.sentry.io/4511841888763904 \
    BUN_PUBLIC_ENVIRONMENT=staging \
    bun build /usr/src/app/app/frontend/index.html --minify --sourcemap=external --public-path=/ --outdir=/usr/src/app/dist/frontend --env='BUN_PUBLIC_*'

# [optional] tests & build
ENV NODE_ENV=ci
ENTRYPOINT [ "bun", "dev" ]

# Inject Sentry Debug IDs and upload source maps (needs @sentry/cli, a
# devDependency only present here — the release stage below only installs
# production deps). Separate from prerelease because docker-compose.ci.yml
# builds --target prerelease directly for Playwright CI, which stops before
# this stage and never needs it or has the secret available.
FROM prerelease AS sourcemaps
ARG COMMIT_SHA
# SENTRY_AUTH_TOKEN is a secret (org/project slugs aren't) — pulled in only
# for this instruction via a BuildKit secret mount, not baked into a layer.
ENV SENTRY_ORG=josiah-sayers
ENV SENTRY_PROJECT=outpost
RUN --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
    bunx --bun @sentry/cli sourcemaps inject ./dist/frontend && \
    bunx --bun @sentry/cli sourcemaps upload --release=$COMMIT_SHA ./dist/frontend && \
    find ./dist/frontend -name '*.map' -delete

# copy production dependencies and source code into final image
FROM base AS release
# deps
COPY --from=install /temp/prod/node_modules node_modules
# single files
COPY --from=prerelease /usr/src/app/index.ts .
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/tsconfig.json .
COPY --from=prerelease /usr/src/app/prisma.config.ts .
COPY --from=prerelease /usr/src/app/postcss.config.cjs .
COPY --from=prerelease /usr/src/app/version .
# folders
COPY --from=prerelease /usr/src/app/app ./app
COPY --from=prerelease /usr/src/app/prisma ./prisma
COPY --from=prerelease /usr/src/app/generated ./generated
COPY --from=sourcemaps /usr/src/app/dist/frontend ./dist/frontend
COPY --from=prerelease /usr/src/app/assets ./assets

ARG BUILD_VERSION
ARG COMMIT_SHA

ENV VERSION=$BUILD_VERSION
ENV COMMIT_SHA=$COMMIT_SHA
ENV NODE_ENV=production
ENV PORT=3000

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "start" ]
