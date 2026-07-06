# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

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
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
RUN bunx --bun prisma generate
RUN bun build /usr/src/app/app/frontend/index.html --minify --public-path=/ --outdir=/usr/src/app/dist/frontend

# [optional] tests & build
ENV NODE_ENV=ci
ENTRYPOINT [ "bun", "dev" ]

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
COPY --from=prerelease /usr/src/app/dist/frontend ./dist/frontend
COPY --from=prerelease /usr/src/app/assets ./assets

ARG BUILD_VERSION
ARG COMMIT_SHA

ENV VERSION=$BUILD_VERSION
ENV COMMIT_SHA=$COMMIT_SHA
ENV NODE_ENV=production
ENV LOG_FOLDER="/usr/src/log"
ENV PORT=3000

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "start" ]
