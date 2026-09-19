# Phase 1 — Oracle Cloud instance

Provisions the box the backend runs on. Nothing here deploys Eatlify; that is
[README.md](README.md), which you run once this is finished.

Written for someone who has never used Oracle Cloud. Two steps in here trip up
almost everyone — **§5 capacity** and **§7 the host firewall** — so read those
even if you skim the rest.

---

## 1. What Always Free actually gives you

Oracle's free tier has no expiry date and no credit clock, which is why it is
worth the slightly awkward signup.

| Resource | Always Free allowance |
|---|---|
| **Ampere A1 compute (ARM)** | **4 OCPUs and 24 GB RAM total**, as one VM or split across up to four |
| AMD compute | 2 × VM.Standard.E2.1.Micro (1 GB each) — too small here, ignore them |
| Block storage | 200 GB total, including boot volumes |
| **Outbound transfer** | **10 TB/month** |
| Public IP | One per instance |

We want **one A1 instance with the whole 4 OCPU / 24 GB allowance**.

For context, the stack idles at roughly 870 MB. 24 GB is about 27× what it
needs, so none of the swap juggling or `--parallel=1` build constraints that a
1 GB box would force apply here. Builds run fully parallel.

**ARM is a non-issue for this codebase.** The backend has no native addons —
verified, zero compiled `.node` binaries — and all six images have already been
built and run as `linux/arm64`.

### The catch

Oracle asks for a **credit or debit card at signup** to verify identity. It
places a small temporary authorisation (around ₹100 / $1) and reverses it.
Always Free resources do not bill against it. Indian cards sometimes fail here
for the same reasons they fail elsewhere — international transactions disabled,
or RBI e-mandate rules. Use a credit card if you have one.

---

## 2. Sign up

Go to **oracle.com/cloud/free** and register.

**The one irreversible decision is your home region.** You choose it at signup
and **it cannot be changed afterwards**. Always Free A1 capacity only exists in
your home region, so this also decides where your server physically is.

- **India → `India South (Hyderabad)` or `India West (Mumbai)`.**
- Hyderabad is often the better pick: Mumbai is Oracle's most oversubscribed
  Indian region, which directly affects §5.

Verification usually completes in a few minutes but can take up to a few hours.

---

## 3. Create an SSH key

On your Mac:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/aws/eatlify-oracle -C "eatlify-oracle"
chmod 400 ~/.ssh/aws/eatlify-oracle
pbcopy < ~/.ssh/aws/eatlify-oracle.pub    # public key now on your clipboard
```

Oracle has no downloadable key like AWS — you paste the **public** key during
instance creation. The private key never leaves your machine.

---

## 4. Launch the instance

**Menu → Compute → Instances → Create instance.**

### Name and placement
- Name: `eatlify-prod`
- Leave compartment at the default (root)
- Availability domain: note which one you picked — it matters in §5

### Image and shape → **Edit**

- **Image:** Change image → **Canonical Ubuntu 24.04**
  Confirm the build is **aarch64**, not x86_64.
- **Shape:** Change shape → **Ampere** → **VM.Standard.A1.Flex**
  - **OCPUs: 4**
  - **Memory: 24 GB**

The **"Always Free eligible"** label must be showing. If it disappears when you
raise the OCPUs, you have exceeded the allowance — you get 4 OCPUs total across
every A1 instance in the account, not per instance.

### Networking
- Let it **create a new VCN** — the wizard builds the network for you
- **Assign a public IPv4 address: Yes** ← without this the box is unreachable

### SSH keys
- **Paste public keys**, and paste what you copied in §3

### Boot volume
- Tick **Specify a custom boot volume size** and set **100 GB**
  The default is ~47 GB, and you have 200 GB free. 100 GB leaves room for a
  second instance later while giving Docker plenty of space.
- Leave VPU at the default (Balanced)

**Create.**

---

## 5. If it says "Out of host capacity"

This is the single most common Oracle free-tier frustration, and it is not
something you did wrong. Free A1 capacity is genuinely exhausted in popular
regions much of the time.

In order of effort:

**a. Change availability domain and retry.** If your region has AD-1, AD-2 and
AD-3, try each. Takes seconds.

**b. Ask for less.** Try 2 OCPU / 12 GB, or even 1 OCPU / 6 GB. Smaller shapes
find capacity far more often, and **6 GB still comfortably runs this stack** —
it needs under 1 GB. You can scale up later without rebuilding (§11).

**c. Retry on a schedule.** Capacity frees up unpredictably. Rather than
clicking for hours, retry every few minutes and walk away.

**d. Upgrade to Pay As You Go — the actual fix.** In the console, **Billing →
Upgrade and Manage Payment → Upgrade to Paid**.

This sounds alarming and is the step people avoid, but: **Always Free resources
stay free on a paid account.** What changes is that PAYG accounts get
*priority* for A1 capacity, so the error usually disappears immediately. It
also stops Oracle reclaiming idle instances (§12).

The real risk is that you can now accidentally create something billable. Set a
budget alarm straight after: **Billing → Budgets → Create Budget**, ₹100 / $1,
alert at 100%. Anything that fires means you created a non-free resource.

---

## 6. Open the ports in the cloud firewall

**Instance page → the subnet link under "Primary VNIC" → Security Lists → the
default list → Add Ingress Rules.**

Add two:

| Stateless | Source CIDR | Protocol | Destination port |
|---|---|---|---|
| No | `0.0.0.0/0` | TCP | `80` |
| No | `0.0.0.0/0` | TCP | `443` |

Port 22 is already open in the default rules. Tighten it if you like: edit the
existing SSH rule and set the source to your own IP. Note it will break when
your home IP changes.

**Do not open 5001–5006, 5672 or 15672.** Nothing needs them — the compose file
publishes only nginx, and the services reach each other on Docker's private
network.

---

## 7. Open the ports on the instance too — the step everyone misses

**Oracle's Ubuntu images ship with their own iptables rules that block
everything except SSH.** Opening the Security List is only half the job. If you
skip this, port 443 will be open in the cloud console, `docker compose ps` will
show nginx running, and your browser will still time out with no useful error
anywhere.

SSH in first:

```bash
ssh -i ~/.ssh/aws/eatlify-oracle ubuntu@<YOUR_PUBLIC_IP>
```

Look at what is already there:

```bash
sudo iptables -L INPUT --line-numbers
```

You will see a `REJECT` rule near the bottom. Anything not accepted before it is
dropped. Insert the two rules at the top so they are evaluated first:

```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
```

Then **persist them**, or they vanish on reboot:

```bash
sudo apt-get update && sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

(`iptables-persistent` asks whether to save current rules during install —
answer **Yes** to both prompts.)

Verify:

```bash
sudo iptables -L INPUT --line-numbers | head -8   # your two ACCEPTs should be at the top
```

---

## 8. Set up an SSH alias

On your Mac, add to `~/.ssh/config`:

```
Host eatlify
    HostName <YOUR_PUBLIC_IP>
    User ubuntu
    IdentityFile ~/.ssh/aws/eatlify-oracle
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then it is just `ssh eatlify`.

---

## 9. Prepare the box

On the instance:

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo hostnamectl set-hostname eatlify-prod
sudo timedatectl set-timezone Asia/Kolkata
```

Install Docker:

```bash
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
```

**Log out and back in**, then check:

```bash
docker compose version     # v2.x, note the space
docker run --rm hello-world
dpkg --print-architecture  # arm64 — confirms you are on Ampere
```

Cap container logs so one chatty service cannot fill the disk:

```bash
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
sudo systemctl restart docker
sudo systemctl enable docker containerd
```

No swap file is needed. That was a 1 GB-box workaround; you have 24 GB.

---

## 10. Point DuckDNS at the box

At **duckdns.org**, sign in and create a subdomain, then set its IP to the
instance's public IP.

Oracle public IPs are **ephemeral by default** — they can change if the instance
is stopped and started. Install the updater so the record follows:

```bash
mkdir -p ~/duckdns
cat > ~/duckdns/duck.sh <<'EOF'
curl -fsS "https://www.duckdns.org/update?domains=<SUBDOMAIN>&token=<TOKEN>&ip=" -o ~/duckdns/duck.log
EOF
chmod 700 ~/duckdns/duck.sh
( crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1" ) | crontab -
~/duckdns/duck.sh && cat ~/duckdns/duck.log    # expect: OK
```

Leaving `ip=` empty makes DuckDNS use the source IP of the request, which is
what you want.

Confirm from the box before moving on:

```bash
getent hosts <SUBDOMAIN>.duckdns.org
curl -s https://api.ipify.org; echo
```

**These two must match**, or Let's Encrypt cannot validate the domain.

If you prefer a fixed address, you can reserve the IP: **Instance → Primary VNIC
→ IP addresses → edit the public IP → change Ephemeral to Reserved.** Free, and
it survives stop/start.

---

## 11. Resizing later

A1.Flex is flexible, so if you started small in §5 you can grow without
rebuilding: **Instance → More actions → Edit → Edit shape**, raise OCPUs and
memory up to the 4/24 allowance, then reboot. The boot volume and everything on
it survives.

---

## 12. Keeping it alive and free

**Oracle reclaims idle Always Free compute.** If an instance averages under 20%
CPU, under 20% network *and* under 20% memory utilisation over a 7-day window,
it can be stopped and reclaimed. A demo app with little traffic is squarely in
that range.

Two ways to avoid it:

- **Upgrade to Pay As You Go** (§5d). Reclamation only applies to Always Free
  accounts. Resources stay free.
- Or keep the box doing something measurable.

Beyond that, there is nothing to watch — no credit clock, no expiry. Just check
**Billing → Cost Analysis** occasionally reads zero.

---

## Done when

- [ ] A1.Flex instance running Ubuntu 24.04 aarch64, "Always Free eligible"
- [ ] Security List allows 80 and 443
- [ ] **iptables on the instance allows 80 and 443, and is persisted**
- [ ] `ssh eatlify` works
- [ ] `docker compose version` reports v2.x without sudo
- [ ] `dpkg --print-architecture` says arm64
- [ ] DuckDNS resolves to the instance's public IP, updater in cron
- [ ] Budget alarm set if you upgraded to PAYG

**Before the next phase**, add the instance's public IP to
**MongoDB Atlas → Network Access**. Every service fails to connect until you do,
and it presents as a connection *timeout* rather than an auth error, so it reads
like a networking bug.

Then continue with [README.md](README.md) — clone, fill `deploy/.env`, and run
`./init-tls.sh`.
