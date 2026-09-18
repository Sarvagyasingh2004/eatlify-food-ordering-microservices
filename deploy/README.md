# Deploying Eatlify

Backend runs as eight containers on one Linux box behind nginx. Frontend deploys
to Vercel with its **Root Directory set to `front-end`**, so Vercel never sees
`services/` or `deploy/`.

```
                  Vercel (HTTPS)  ·  front-end/
                              │
                              ▼
            https://<subdomain>.duckdns.org
                     nginx :443  (Let's Encrypt)
                              │  path routing, one hostname
   ┌──────────┬──────────┬────┴─────┬──────────┬──────────┐
   ▼          ▼          ▼          ▼          ▼          ▼
 auth    restaurant    utils    realtime    rider      admin
 :5001      :5002      :5003     :5004      :5005      :5006
   └──────────┴─────┬────┴──────────┴──────────┴──────────┘
                    ▼
             rabbitmq :5672          MongoDB Atlas (external)
```

**Only nginx publishes ports.** The six services publish nothing and reach each
other by container name on a private bridge network.

## Routing

nginx routes on the prefixes the services already use, so one hostname and one
certificate cover the whole backend.

| Path | Service |
|---|---|
| `/api/auth/`, `/api/health` | auth |
| `/api/restaurant/`, `/api/item/`, `/api/cart/`, `/api/address/`, `/api/order/` | restaurant |
| `/api/payment/` | utils |
| `/socket.io/` | realtime |
| `/api/rider/` | rider |
| `/api/v1/admin/` | admin |
| `/api/v1/internal/`, `/api/upload` | **denied — see below** |

Two routes are deliberately unreachable from the internet:

- **`/api/v1/internal/emit`** emits any event to any socket room, guarded only by
  a shared key.
- **`/api/upload`** has no authentication at all and writes to a billable
  Cloudinary account. The browser never calls it — only `restaurant` and `rider`
  do, over the private network.

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | The eight-container stack |
| `../services/Dockerfile` | One parameterised image build for all six services |
| `nginx/templates/default.conf.template` | TLS termination and path routing |
| `.env.example` | Every backend variable, one shared file |
| `init-tls.sh` | Issues the first certificate |

## Prerequisites

- A Linux box with Docker Engine and the Compose plugin, ports 80 and 443 open
- A DuckDNS subdomain pointing at its public IP
- MongoDB Atlas, with **the box's IP added under Network Access**
- Cloudinary, Google OAuth, and Razorpay and/or Stripe credentials

### Sizing

The stack idles at roughly **870 MB**: ~510 MB across the six Node services,
~130 MB for RabbitMQ's Erlang VM, ~220 MB for the OS and Docker itself.

- **2 GB or more** — comfortable, nothing special needed.
- **1 GB** — works at idle but will not survive `docker compose build`, because
  six parallel `tsc` runs need far more than the remainder. Add 4 GB of swap and
  build with `--parallel=1`.

Built image sizes: 255–527 MB each (auth is largest — `googleapis` is heavy).

## Deploy

### 1. Install Docker (Ubuntu)

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in for the group change to apply.

On **1 GB** machines, add swap first:

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Clone and configure

```bash
git clone git@github.com:Sarvagyasingh2004/eatlify-food-ordering-microservices.git
cd eatlify-food-ordering-microservices/deploy
cp .env.example .env
```

Fill in `.env`. The three that cause the most confusion when wrong:

- **`JWT_SECRET`** must be byte-identical to whatever issued your existing
  tokens. Change it and every session is invalidated.
- **`CORS_ORIGIN`** must include your Vercel origin, or the browser is refused
  with no useful error in the response body.
- **`RABBITMQ_URL`** must carry the same credentials as `RABBITMQ_USER` /
  `RABBITMQ_PASS`, with `rabbitmq` as the host, not `localhost`.

### 3. Point DuckDNS at the box

Set the subdomain to the public IP at duckdns.org, then confirm from the box:

```bash
getent hosts your-subdomain.duckdns.org
curl -s https://api.ipify.org; echo
```

**These must match before step 4**, or Let's Encrypt cannot validate the domain.

If the IP is not static, install the updater so the record follows it:

```bash
mkdir -p ~/duckdns
echo 'curl -fsS "https://www.duckdns.org/update?domains=<SUB>&token=<TOKEN>&ip=" -o ~/duckdns/duck.log' > ~/duckdns/duck.sh
chmod +x ~/duckdns/duck.sh
( crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1" ) | crontab -
~/duckdns/duck.sh && cat ~/duckdns/duck.log   # expect: OK
```

### 4. Issue the certificate and start

```bash
./init-tls.sh
```

nginx cannot start without a certificate and so cannot serve the challenge that
produces one. The script breaks that loop: it verifies DNS, runs certbot
standalone on port 80 with nginx down, then brings the stack up. Renewal after
that is automatic — the `certbot` service retries twice daily over webroot.

On a 1 GB box, build first to avoid the OOM killer:

```bash
docker compose build --parallel=1 && ./init-tls.sh
```

### 5. Verify

```bash
curl -sS https://your-subdomain.duckdns.org/api/health          # expect 200
curl -s -o /dev/null -w '%{http_code}\n' \
  https://your-subdomain.duckdns.org/api/v1/internal/emit        # expect 403
docker compose ps                                               # all Up
```

### 6. Frontend on Vercel

Import the repo, then:

- **Root Directory: `front-end`** ← the whole thing fails without this
- Build command `npm run build`, output `dist` (auto-detected)
- Environment variables:
  - `VITE_API_BASE_URL=https://your-subdomain.duckdns.org`
  - `VITE_GOOGLE_CLIENT_ID`
  - `VITE_STRIPE_PUBLISHABLE_KEY`

Then, easy to forget:

- Add the Vercel origin to **Authorized JavaScript origins** in Google Cloud
  Console, or login fails silently.
- Set `CORS_ORIGIN` and `FRONTEND_URL` in `deploy/.env` to the Vercel URL and
  `docker compose up -d` to apply.

## Operating it

```bash
docker compose ps                      # status
docker compose logs -f restaurant      # one service
docker compose up -d --build           # redeploy after a pull
docker compose restart nginx           # after editing the nginx template
docker compose down                    # stop (volumes survive)
```

`docker compose up -d` re-reads `.env`, so that is how you apply a variable
change. Editing the nginx template needs a `restart`, not just an `up`.

## When something breaks

| Symptom | Likely cause |
|---|---|
| Browser calls blocked, server logs look fine | `CORS_ORIGIN` missing the Vercel origin |
| One service 401s while others work | `JWT_SECRET` differs in that service |
| Every service times out on startup | Box IP not in the Atlas allowlist — presents as a timeout, not an auth error |
| `restaurant` or `rider` restart-looping | RabbitMQ not healthy; `restaurant` awaits it at module load and `rider` exits without it |
| Order status never updates live | WebSocket upgrade failing — the client requests `websocket` transport with no polling fallback |
| Image uploads fail around 1 MB | `client_max_body_size` — already set to 50m, check you did not override it |
| Admin panel shows no pending approvals | `DB_NAME` not `Food_Ordering_db`, so admin reads an empty database |
| Certbot renewal fails | Port 80 closed, or the `/.well-known/acme-challenge/` location redirecting |

## Notes on this build

`node:24-alpine`, not 22. Node 22 bundles npm 10, which resolves the
`googleapis` dependency tree differently from the npm 11 that generated these
lockfiles and rejects them with `EUSAGE`. Node 24 ships npm 11 and `npm ci`
succeeds. If you regenerate a lockfile with a different npm major, expect to
revisit this.

The image is multi-arch, so it builds natively on **arm64** (Oracle Ampere,
Apple Silicon) as well as x86_64. The backend has no native addons — verified,
zero compiled `.node` binaries — so ARM needs no special handling.

Containers run as **uid 1000 (`node`)**, not root. No service writes to disk
(`multer` uses `memoryStorage`).

If you build images on Apple Silicon to push to an x86_64 host, cross-compile:

```bash
docker buildx build --platform linux/amd64 --build-arg SERVICE=auth \
  -t <registry>/eatlify-auth:latest --push services/
```
