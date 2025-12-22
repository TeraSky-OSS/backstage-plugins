# Before building this image, be sure to have run the following commands in the repo root:
#
# yarn install
# yarn tsc
# yarn build:backend
#

FROM cgr.dev/chainguard/wolfi-base:latest
LABEL org.opencontainers.image.source="https://github.com/TeraSky-OSS/backstage-plugins"
LABEL org.opencontainers.image.licenses=Apache-2.0
LABEL org.opencontainers.image.description="Demo App for TeraSky OSS Backstage Plugins"

ENV NODE_VERSION=22
ENV PYTHON_VERSION=3.12

RUN apk add nodejs-$NODE_VERSION yarn

RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    --mount=type=cache,target=/var/lib/apk,sharing=locked \
    apk update && \
    apk add curl tini wget sqlite-dev python-$PYTHON_VERSION py3-pip python-3-dev py3-setuptools build-base gcc libffi-dev glibc-dev openssl-dev brotli-dev c-ares-dev nghttp2-dev icu-dev zlib-dev gcc-12 libuv-dev && \
    yarn config set python /usr/bin/python3

ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN pip3 install mkdocs-techdocs-core==1.3.5

WORKDIR /app
RUN chown nonroot:nonroot /app
USER nonroot

ENV NODE_ENV=production

COPY --chown=nonroot:nonroot .yarn ./.yarn
COPY --chown=nonroot:nonroot .yarnrc.yml ./

COPY --chown=nonroot:nonroot yarn.lock package.json packages/backend/dist/skeleton.tar.gz ./

RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

RUN --mount=type=cache,target=/home/node/.yarn/berry/cache,sharing=locked,uid=1000,gid=1000 \
    yarn workspaces focus --all --production

COPY --chown=nonroot:nonroot packages/backend/dist/bundle.tar.gz app-config*.yaml ./

RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

ENTRYPOINT ["tini", "--"]
CMD ["node", "packages/backend", "--config", "app-config.yaml"]