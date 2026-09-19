# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Ask AI — web client
#
# This is a static SPA (Vite + React, no server-side rendering), so the runtime
# is nginx serving the built files and proxying /api to the service. There is no
# Node in the runtime image at all.
#
# Two stages: the first has the toolchain and the sources, the second has only
# the built output and its server.
# ---------------------------------------------------------------------------

# ---- build ----------------------------------------------------------------
# Pinned to an exact tag: the VM must build what was built and tested here, not
# whatever `latest` happens to be that morning.
FROM node:22.11.0-alpine3.20 AS build

WORKDIR /app

# Manifest and lockfile first, on their own layer. A source edit then re-runs
# only the build below, not the whole dependency resolution — which is what
# makes a rebuild on the VM quick.
COPY package.json package-lock.json ./

# `npm ci` installs exactly the lockfile and fails if package.json has drifted
# from it. `npm install` would quietly re-resolve and could ship something that
# was never tested. Same reason the backend uses `uv sync --locked`.
RUN npm ci

COPY . .

# Not 'true', so the build calls the real service at /api rather than answering
# from the sample fixtures. Stated explicitly rather than left to a stray .env
# — .dockerignore keeps those out of the context, and this is the belt.
ENV VITE_USE_FIXTURES=false

# `npm run build` type-checks first, so a type error fails the image build
# rather than shipping. Fonts and every other asset are fetched here, at build
# time: the runtime image needs no network access of its own.
RUN npm run build

# ---- runtime --------------------------------------------------------------
# The unprivileged variant runs as uid 101 (nginx) out of the box and listens on
# 8080, so nothing needs to start as root and drop later.
FROM nginxinc/nginx-unprivileged:1.27.2-alpine AS runtime

# Read at container start by the base image's entrypoint, which renders
# /etc/nginx/templates/*.template through envsubst.
#
# http://host.docker.internal:18000
#     — the v2 API on the VM host's published port. The default, because it
#       survives the API being recreated under a different container name or on
#       a different network, and because host.docker.internal always resolves
#       (it comes from /etc/hosts via extra_hosts), so nginx always starts.
# http://<service-name>:8000
#     — by Compose service name, if both containers share a network. Tidier,
#       but nginx resolves the name at startup and exits if it cannot, which
#       takes the whole site down whenever the API is absent.
#
# Never localhost: inside a container that is this container, not the VM.
ENV API_UPSTREAM=http://host.docker.internal:18000
ENV CALLER_ID=askai-web

# Only these two are substituted. Everything else in the template starting with
# a dollar — $host, $remote_addr, $request_uri — is nginx's own syntax and must
# survive untouched.
ENV NGINX_ENVSUBST_FILTER='^(API_UPSTREAM|CALLER_ID)$'

COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Only the built output. No sources, no dev dependencies, no npm cache.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

# The app's own root, from inside the container. wget is in the base image's
# busybox, so this adds nothing to the image and needs no network beyond
# loopback.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider --tries=1 http://127.0.0.1:8080/ || exit 1

# Inherited from the base image, stated here so it is visible: this container
# never runs as root.
USER 101
