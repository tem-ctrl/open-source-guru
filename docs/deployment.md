# Deploying to the VPS

Production runs [`docker-compose.prod.yml`](../docker-compose.prod.yml) on one VPS (see PLAN.md §14),
behind the [nginx shared](#shared-nginx) with the other apps on that server.

| Service | Image | Role |
|---|---|---|
| web | `open-source-guru-web` | Next.js. Forwards `/api/*` to the api over the Docker network |
| api | `open-source-guru-backend` | Fastify + Better Auth |
| worker | `open-source-guru-backend` | pg-boss jobs |
| migrate | `open-source-guru-backend` | Applies migrations and exits; api and worker start after it succeeds |
| postgres | `postgres` | Data and job queue, on an internal network with no route out |

nginx serves `open-source-guru.dev` → web and `api.open-source-guru.dev` → api, and redirects
`www.open-source-guru.dev` → `open-source-guru.dev`. Two images are built: `backend` (api, worker
and migrate differ only by command) and `web`. Their Dockerfiles are in [`docker/`](../docker); both are built from the repo root.

## How a release works

Merging a PR to `main` (any push to `main`) runs the **Release** workflow
(`.github/workflows/release.yml`). Each step runs only if the previous one succeeded:

1. **CI** (`ci.yml`): lint, typecheck, tests and build.
2. **Docker Build Push** (`docker-build-push.yml`): pushes both images to GitHub Container
   Registry, tagged with the commit SHA and `latest`.
3. **Deploy** (`deploy.yml`): connects to the VPS over SSH, copies `docker-compose.prod.yml` to the
   deploy directory, then runs
   `docker compose -f docker-compose.prod.yml up -d --pull always --remove-orphans --wait`.
   `--wait` fails the step if a container doesn't become healthy.
4. **IndexNow** (`indexnow.yml`): asks Bing and other IndexNow search engines to recrawl the
   sitemap. It runs last because it checks that the live site serves the IndexNow key. If it
   fails, the deploy is not undone.

A newer push waits for the running release to finish. Each step can also be run by hand from the
Actions tab: run **Deploy** to redeploy, or **IndexNow** with a list of paths to submit only those
pages (locally: `pnpm --filter @osg/web indexnow`).

To roll back, on the VPS from the deploy directory, point the images at an older commit SHA
(`sed -i 's/:latest/:<commit-sha>/' docker-compose.prod.yml`) and run
`docker compose -f docker-compose.prod.yml up -d --wait`. The next release overwrites the file.

## Shared nginx

TLS and routing come from the nginx installed on the VPS and shared by its apps. Its configuration
lives in its own project, **vps-nginx**: this app's server blocks are in
`conf.d/open-source-guru.conf`, and its README explains how to get the certificate.

This stack publishes two ports, on 127.0.0.1 only, for nginx: web on `WEB_PORT` (default 3100)
and api on `API_PORT` (default 4100). Nothing else is reachable from the host, and nothing at all
from outside. Changing a port means changing `open-source-guru.conf` too.

## One-time server setup

The server needs Docker Engine with the Compose plugin, the [shared nginx](#shared-nginx), and a
firewall that only allows 22, 80 and 443. Docker-published ports bypass
`ufw`, which is why this stack only publishes on 127.0.0.1.

1. **DNS and certificate**: point `open-source-guru.dev`, `www.open-source-guru.dev` and
   `api.open-source-guru.dev` to the VPS (A/AAAA records), then add the site to nginx as described
   in vps-nginx's README.

2. **Deploy user**: a non-root user in the `docker` group, logging in with an SSH key used only
   for deployments:

   ```bash
   ssh-keygen -t ed25519 -f osg-deploy -C osg-deploy -N ''   # on your machine
   # On the server, append osg-deploy.pub to ~deploy/.ssh/authorized_keys
   ```

3. **Deploy directory** (default `/opt/open-source-guru`, owned by the deploy user):

   ```text
   /opt/open-source-guru/
   ├─ .env                       from .env.production.example, filled in (chmod 600)
   └─ secrets/github-app.pem     written by the Deploy workflow from PRIVATE_KEY_GITHUB_APP
   ```

   The containers run as the `node` user (uid 1000) and read the key as a Docker secret, so the
   workflow makes the file owned by uid 1000 with mode 400. If the deploy user's uid (`id -u`)
   isn't 1000, it runs `sudo -n chown 1000`, so allow that one command without a password, e.g.
   in `/etc/sudoers.d/osg-deploy`:
   `deploy ALL=(root) NOPASSWD: /usr/bin/chown 1000 /opt/open-source-guru/secrets/github-app.pem.new`.

4. **GitHub App**: use the production app from [github-app.md](github-app.md), with the callback
   URL `https://open-source-guru.dev/api/auth/callback/github`.

5. **GitHub environment**: in **Settings → Environments**, create `production` with:

   | Kind | Name | Value |
   |---|---|---|
   | Secret | `VPS_HOST` | Server hostname or IP |
   | Secret | `VPS_USER` | Deploy user |
   | Secret | `VPS_SSH_KEY` | Contents of `osg-deploy` (the private key) |
   | Secret | `VPS_KNOWN_HOSTS` | Output of `ssh-keyscan <host>`, checked against the server's real host keys |
   | Secret | `PRIVATE_KEY_GITHUB_APP` | Contents of the production GitHub App's `.pem` |
   | Variable | `VPS_PORT` | Only if SSH doesn't listen on 22 |
   | Variable | `DEPLOY_PATH` | Only if not `/opt/open-source-guru` |

   Under **Deployment branches and tags**, allow `main` only, so workflows from other branches
   can't read these secrets. Add required reviewers if deployments should be approved.

   To rotate the GitHub App key, update `PRIVATE_KEY_GITHUB_APP` and run **Deploy**: when the key
   changed, it recreates api and worker so they load it.

The repository is public, so its images are public too and the server could pull them without
logging in. The workflow logs in anyway with the job's `GITHUB_TOKEN`, which expires when the job
ends, so no registry credential is stored on the server.

## Operating

From the deploy directory:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api worker
docker compose -f docker-compose.prod.yml exec postgres psql -U osg osg
```

### Admins

The admin dashboard (`/admin-dashboard`) is only open to users with the admin role. To create the
first admin, set `ADMIN_LOGINS` in `.env` to your GitHub login and restart the API: the account
gets the role at startup, or on its first sign-in. Grant the role to others from
**Admin → Users**; admins can't change their own role, so there is always at least one. Removing
a login from `ADMIN_LOGINS` doesn't remove the role: do it from the dashboard. Once the first
admin exists, you can empty `ADMIN_LOGINS` (a GitHub login can be renamed and taken by someone
else).

Logs are rotated by Docker (5 × 10 MB per container).

Backups aren't set up yet: PLAN.md §14 calls for daily `pg_dump` to off-server object storage.
