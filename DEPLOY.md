# Deploying the Ask AI web client

A static SPA served by nginx, in a container, on the same VM as the API. The
container serves the app **and** proxies `/api` to the API, so the browser only
ever talks to one origin. That is what makes the API's missing CORS middleware a
non-issue: no cross-origin request is ever made, so no preflight is ever sent.

| | |
| --- | --- |
| Host port | **17000** (17900 and 17800 are taken) |
| Container port | 8080 (nginx, unprivileged) |
| Image | `askai-web:latest`, built on the VM |
| Upstream | `API_UPSTREAM`, default `http://host.docker.internal:18000` |
| Path mapping | `/api/chat` → `<upstream>/chat`, `/api/health` → `<upstream>/health` |
| Caller identity | `CALLER_ID`, default `askai-web`, set on the proxied request server-side |

## Deploy

```bash
cd ~/askai-frontned
git pull
docker compose -f docker-compose.frontend.yml build
docker compose -f docker-compose.frontend.yml up -d --force-recreate
docker compose -f docker-compose.frontend.yml logs -f --tail=50
```

`--force-recreate` matters. Without it Compose keeps the running container when
the service definition has not changed, and the previous image keeps serving —
a rebuilt image alone does not replace anything.

Then open `http://<vm-host>:17000/` and ask a question.

## Check it

```bash
# The app itself
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:17000/

# The API through the proxy, on the same origin as the app
curl -sS http://localhost:17000/api/health

# A real question — what the browser does. Allow up to ~15s for the first one.
curl -sS -X POST http://localhost:17000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"What is the latest value of Real GDP?","session_id":"smoke","conversation_context":""}'

# Not root
docker exec askai-web whoami        # -> nginx

# Health status
docker inspect --format '{{.State.Health.Status}}' askai-web
```

`/api/health` returning `{"status":"ok"}` means the proxy and the route mapping
are both right. Note what it does *not* mean: that endpoint answers as soon as
the process is up and proves nothing about the database or the models — the UI
says "service responding" for the same reason, and never more than that.

## The upstream

`localhost` inside the container is *that container*, never the VM, so the
upstream is never `localhost`.

- **`http://host.docker.internal:18000`** (default) — the API on the VM host's
  published port. `extra_hosts: host-gateway` in the compose file is what makes
  that name resolve on Linux.

  This is the default on purpose. It does not depend on the API's container name
  or on the two sharing a network, and the name always resolves from
  `/etc/hosts`, so **nginx always starts**. An API that is down then shows as a
  502 on `/api` while the app itself keeps serving.

- **`http://<api-service-name>:8000`** — over a shared Docker network instead,
  if you prefer service names:

  ```bash
  API_UPSTREAM=http://<api-service-name>:8000 \
    docker compose -f docker-compose.frontend.yml up -d --force-recreate
  ```

  Tidier, with one real cost: nginx resolves that name **at startup** and exits
  if it cannot, so the whole site goes down — not just `/api` — whenever the API
  is absent or has been recreated under a different name. It also caches the
  address for the container's lifetime, so an API that comes back on a new IP
  needs `docker compose -f docker-compose.frontend.yml restart` here.

`API_UPSTREAM` takes no trailing slash: the proxy adds one when it strips the
`/api` prefix.

## If the VM cannot reach the npm registry

Build the image on a machine that can, ship it as a file, load it there.

```bash
# on my machine
docker build -t askai-web:local .
docker save askai-web:local | gzip > askai-web.tar.gz

# copy askai-web.tar.gz to the VM, then on the VM
docker load < askai-web.tar.gz
docker tag askai-web:local askai-web:latest
docker compose -f docker-compose.frontend.yml up -d --force-recreate --no-build
```

`--no-build` is what stops Compose rebuilding the image it was just handed.

## Rolling back

Images are tagged `latest`, so keep the previous one before a build if you want
a way back:

```bash
docker tag askai-web:latest askai-web:previous     # before building
# …and to go back
docker tag askai-web:previous askai-web:latest
docker compose -f docker-compose.frontend.yml up -d --force-recreate --no-build
```

## Common failures

| Symptom | Cause |
| --- | --- |
| App loads, every question fails with a 502 | Nothing is answering on `API_UPSTREAM` — check the API is up and published on 18000 |
| App loads, questions fail with 404 | `API_UPSTREAM` has a trailing slash, so the path was rewritten wrongly |
| Container restarts, log says `host not found in upstream` | Only happens on the service-name upstream: the API is down, renamed, or off the shared network. The default upstream cannot fail this way |
| Questions time out after ~90s | The service is not answering. The first request after an API restart is slow (~10s) but not that slow |
| `network kap_shared_network declared as external, but could not be found` | Bring up whichever stack owns that network first |
| Deploy ran, browser still shows the old app | `--force-recreate` was skipped, or the browser held the old JS — `index.html` is served `no-store`, so hard-refresh once |
| A pulled commit did not change anything | You are on a branch that is not tracking the one that moved. `git branch -vv`, and check the build does **not** report `CACHED` for `COPY . .` |

## What is in the image

Two stages. The build stage (`node:22.11.0-alpine3.20`) installs from
`package-lock.json` with `npm ci` — which fails rather than re-resolving, so the
VM gets exactly what was built and tested — type-checks, and produces `dist/`.
The runtime stage (`nginxinc/nginx-unprivileged:1.27.2-alpine`) carries only
`dist/` and the nginx config: no sources, no dev dependencies, no npm cache, no
Node at all. It runs as uid 101 and needs no network access of its own — fonts
and every other asset are bundled at build time, and nothing in the shipped HTML
points at a CDN.
