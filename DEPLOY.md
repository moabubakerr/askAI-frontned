# Deploying the Ask AI web client

A static SPA served by nginx, in a container, on the same VM as the API. The
container serves the app **and** proxies `/api` to the API, so the browser only
ever talks to one origin and the API's missing CORS middleware never matters.

| | |
| --- | --- |
| Host port | **17000** (17900 is the API, 17800 is taken) |
| Container port | 8080 (nginx, unprivileged) |
| Image | `askai-web:latest`, built on the VM |
| Network | `kap_shared_network`, external — the API is already on it |
| Upstream | `API_UPSTREAM`, default `http://askai-api:8000` |
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

# The API, through the proxy, on the same origin as the app
curl -sS http://localhost:17000/api/health

# Not root
docker exec askai-web whoami        # -> nginx

# Health status
docker inspect --format '{{.State.Health.Status}}' askai-web
```

If `/api/health` returns JSON, the proxy and the network are both right.

## The upstream

`localhost` inside the container is *that container*, never the VM — so the
upstream is a service name, not a port on the host.

- **`http://askai-api:8000`** (default) — the frontend joins
  `kap_shared_network` and reaches the API by its Compose service name, on the
  API's own container port. This is the intended path and needs nothing extra.

- **`http://host.docker.internal:17900`** — fallback, only if the two cannot
  share a network. Uncomment the `extra_hosts` block in
  `docker-compose.frontend.yml`, then:

  ```bash
  API_UPSTREAM=http://host.docker.internal:17900 \
    docker compose -f docker-compose.frontend.yml up -d --force-recreate
  ```

`API_UPSTREAM` takes no trailing slash: `/api/ask` is appended to it as-is.

Two things to know about nginx and DNS. It resolves the upstream name when it
starts, so if the API container is not up yet the frontend exits with
`host not found in upstream` — `restart: unless-stopped` retries until the API
is there. And it caches that address for the container's lifetime, so **if the
API container is recreated and lands on a new IP, restart the frontend**:

```bash
docker compose -f docker-compose.frontend.yml restart
```

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
| Container restarts, log says `host not found in upstream "askai-api"` | The API is not running, or is not on `kap_shared_network` |
| App loads, every question fails with a 502 | The upstream name resolves but nothing answers on that port — check `API_UPSTREAM` and that the API listens on 8000 *inside* its container |
| App loads, questions fail with 404 | `API_UPSTREAM` has a trailing slash, so the path was rewritten |
| `network kap_shared_network declared as external, but could not be found` | Bring the API stack up first; it owns the network |
| Deploy ran, browser still shows the old app | The `--force-recreate` was skipped, or the browser cached `index.html` — it is served `no-store`, so hard-refresh once |

## What is in the image

Two stages. The build stage (`node:22.11.0-alpine3.20`) installs from
`package-lock.json` with `npm ci` — which fails rather than re-resolving, so the
VM gets exactly what was built and tested — type-checks, and produces `dist/`.
The runtime stage (`nginxinc/nginx-unprivileged:1.27.2-alpine`) carries only
`dist/` and the nginx config: no sources, no dev dependencies, no npm cache, no
Node at all. It runs as uid 101 and needs no network access of its own — fonts
and every other asset are bundled at build time, and nothing in the shipped HTML
points at a CDN.
