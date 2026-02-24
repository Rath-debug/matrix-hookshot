# Matrix Hookshot + Synapse Setup Guide

This document describes the setup and configuration of the Matrix Hookshot bridge with a local Synapse homeserver.

## Architecture Overview

### Services, Containers, and Servers Explained

**Terminology:**
- **Server** = Software that listens on a port and responds to requests (e.g., Synapse is a server)
- **Container** = Isolated environment running one or more servers (e.g., Docker container)
- **Service** = A named container in docker-compose that can communicate with other services

### Components in This Setup

| Component | Type | What It Is | Port | In Container? |
|-----------|------|-----------|------|---------------|
| **Synapse** | Server + Container | Matrix homeserver (authenticates users, stores messages) | 8008 | Yes |
| **Bridge** | Server + Container | Hookshot bridge (connects Matrix to webhooks) | 9993 | Yes |
| **PostgreSQL** | Server + Container | Database (stores Synapse data) | 5432 (internal) | Yes |
| **Valkey** | Server + Container | Cache (stores bridge temporary data) | 6379 (internal) | Yes |
| **Webhooks** | Port on Bridge Container | Webhook listener (receives GitHub, GitLab events) | 9001 | Yes |

**Key Point**: Every service above is a `docker-compose` service. Some are internal (only available between containers), others are exposed to your host machine.

## Understanding Ports and URLs

### What is a Port?

A **port** is a virtual "door" that a server listens on. Think of it like a service desk with multiple numbered windows:
- **localhost:8008** = Window 8008
- **localhost:9993** = Window 9993
- **localhost:9001** = Window 9001

Multiple servers can run on the same machine if they use different ports.

### Ports Explained: Standard vs Custom Ports

**Standard Ports** (you don't need to type them):
- **Port 80** = HTTP (web pages). Example: `http://example.com` (port 80 is assumed)
- **Port 443** = HTTPS (encrypted web). Example: `https://example.com` (port 443 is assumed)

**Non-Standard Ports** (you MUST specify them):
- **Port 8008** = Synapse uses this custom port. Must write: `http://localhost:8008`
- **Port 9993** = Bridge uses this custom port. Must write: `http://localhost:9993`

**If you didn't specify ports, where would requests go?**
```
http://localhost         → Assumes port 80 (NO SERVER THERE!)
http://localhost:8008    → Explicitly goes to port 8008 (SYNAPSE IS HERE!)
```

### Custom Hostnames (like `.app` or DNS names)

Sometimes instead of `localhost:8008`, systems use custom hostnames:

**Example setup (NOT our setup):**
```
synapse.app:443         → Uses standard HTTPS port (443), so `:443` is optional
synapse.app             → Assumes port 443, so `:443` is implied
bridge.app:8443         → Custom port, must be explicit
```

**Why this works:** The machine's networking (DNS) resolves `.app` to an IP address and port.

**Our setup uses plain `localhost` with explicit ports because:**
- `localhost` = Built-in hostname meaning "this machine"
- We're using non-standard ports (8008, 9993, 9001)
- So we MUST specify them: `localhost:8008`, `localhost:9993`, etc.

### Why These Specific Ports?

- **8008** = Synapse's standard development/testing port (Matrix protocol)
- **9993** = Hookshot bridge's standard port (where it receives calls from Synapse)
- **9001** = Webhook listener (where external services like GitHub send events)
- **5432** = PostgreSQL standard port (only internal, not exposed to host)
- **6379** = Valkey/Redis standard port (only internal, not exposed to host)

### URL Structure: `protocol://hostname:port`

Examples from our setup:
```
http://localhost:8008              → Your computer, port 8008 (Synapse server)
http://host.docker.internal:8008   → From inside a container, reach host's port 8008
http://localhost:9993              → Your computer, port 9993 (Bridge server)
http://synapse.local:8008          → If you had DNS entry for synapse.local
http://192.168.1.5:8008            → If you used IP address instead of hostname
```

**Breaking it down:**
- `http://` = Protocol (hypertext, unencrypted)
- `localhost` or `host.docker.internal` or `synapse.local` = Hostname/address
- `:8008` = The port number (the ":" is the separator)
- **You MUST include `:8008` because 8008 is not a standard port**

### Docker Networking vs Host Machine Networking

**Your Host Machine Network:**
```
Your Windows/Mac/Linux Computer
├── You can access: localhost:8008, 127.0.0.1:8008, your-computer-ip:8008
├── This is the "real" network from your OS perspective
└── When you open browser: http://localhost:8008 → connects to host's port 8008
```

**Docker Internal Network:**
```
Docker Container (running Synapse)
├── Has its own "localhost" (means the container, not your host!)
├── Can't directly access host's localhost:8008
├── Would reach: Docker's internal network, not your host
└── Solution: Use "host.docker.internal" to say "the machine running Docker"
```

**Why we talk about Docker Network, not Host Network:**
- **Containers are isolated** - Each container has its own network namespace
- **Container's localhost ≠ Host's localhost** - They're completely separate
- **We need Docker's special DNS** - `host.docker.internal` bridges the gap
- **If we used host IP directly** - Example: `http://192.168.1.5:8008` could work BUT:
  - It's not portable (different on every machine)
  - It wouldn't work if the container tries to use it (routing issues)
  - Docker's solution is more reliable

### Private Network vs Public Network

**Private Networks** (Only between containers or host-to-container):
```
┌─────────────────────────────────────────────────┐
│ Your Host Machine                               │
├─────────────────────────────────────────────────┤
│ Docker Network (Private, only container to host) │
│  ├─ Synapse Container → Can only talk to        │
│  │  Bridge Container and Database Container    │
│  ├─ Bridge Container → Can talk to Synapse      │
│  └─ Database Container → Only Synapse accesses  │
│                                                  │
│ PostgreSQL:5432 = PRIVATE (container to container)
│ Valkey:6379 = PRIVATE (container to container)  |
└─────────────────────────────────────────────────┘
```

**Public Networks** (Accessible from outside):
```
┌───────────────────────────────────────────────────┐
│ Your Home Network / Internet                      │
├───────────────────────────────────────────────────┤
│ Your Computer (Host Machine)                      │
│  ├─ Port 8008 (Synapse) → EXPOSED to your        │
│  ├─ Port 9993 (Bridge) → EXPOSED (if you want)  │
│  ├─ Port 9001 (Webhooks) → EXPOSED to internet   │
│  └─ Port 5432 → NOT EXPOSED (behind firewall)   │
└───────────────────────────────────────────────────┘
```

**How Networking Works:**
```
User at Home (192.168.1.100)
         ↓
Tries: http://localhost:8008
         ↓
       Fails! (localhost = their computer, not your host)

Better: http://your-host-ip:8008  or  http://your-hostname:8008
         ↓
Reaches Your Host Machine
         ↓
Port 8008 is exposed (by docker-compose)
         ↓
Request goes to Synapse Container
         ↓
Response comes back
```

**Private Data Never Exposed:**
- PostgreSQL (5432) → Only Synapse accesses, NOT exposed to public
- Valkey (6379) → Only Bridge accesses, NOT exposed to public
- These stay inside Docker's private network

**In docker-compose.yml, exposed ports:**
```yaml
ports:
  - "8008:8008"   # HOST port 8008 → Container port 8008 (EXPOSED)
  - "9001:9001"   # HOST port 9001 → Container port 9001 (EXPOSED)
  - "9993:9993"   # HOST port 9993 → Container port 9993 can be EXPOSED

# NOT exposed = not in "ports" section:
# - PostgreSQL (only accessible within Docker network)
# - Valkey (only accessible within Docker network)
```

### Docker Networking: Why `host.docker.internal`?

When code runs **inside a container**, `localhost` means "the container itself", not your host machine.

```
Your Host Machine               Docker Container
──────────────────           ─────────────────────
localhost:8008 (Synapse)      localhost = Container itself
Real network interface         Can't access host directly!
                              ↓
                              To reach Synapse on host:
                              Use: host.docker.internal:8008
                              (Special DNS name Docker provides)
```

**Without `host.docker.internal`, the bridge couldn't reach Synapse because it was looking at the wrong place.**

**Comparison:**
```
From Your Computer:
  http://localhost:8008                    ✓ Works (reaches host's port 8008)
  http://host.docker.internal:8008         ✗ Doesn't work (your OS doesn't know this name)

From Inside a Container:
  http://localhost:8008                    ✗ Fails (reaches container's port 8008, not host)
  http://host.docker.internal:8008         ✓ Works (Docker translates this to host's port 8008)
  http://synapse:8008                      ✓ Could work (if "synapse" is container service name)
```

## Architecture

- **Synapse Server**: Matrix homeserver listening on **localhost:8008**
- **Bridge Server**: Hookshot bridge listening on **localhost:9993**
- **Webhook Endpoint**: Listening on **localhost:9001**
- **PostgreSQL Service**: Database inside container (port 5432, not exposed)
- **Valkey Service**: Cache inside container (port 6379, not exposed)

## Deep Dive: Server Communication, Networks, and Firewalls

### How Servers Communicate with Machines

**What is a Machine?**
A machine is any device with an IP address:
- Your Windows/Mac/Linux computer = a machine
- A Docker container = also a machine (with its own isolated network)
- A cloud server = also a machine
- Your phone = also a machine

**Every machine has:**
- An IP address (like 192.168.1.5 or 127.0.0.1)
- Network interfaces (ways to send/receive data)
- Ports (virtual doors for services to listen on)

### IP Addresses Explained

**Localhost / 127.0.0.1 (The Loopback)**
```
127.0.0.1 = "This is ME, talking to myself"

┌─────────────────────────┐
│ Your Computer           │
├─────────────────────────┤
│ 127.0.0.1 = Loopback   │
│ (only reaches this PC)  │
│                         │
│ If you're on this PC:   │
│ 127.0.0.1:8008 → OK    │
│                         │
│ From another PC:        │
│ 127.0.0.1:8008 → FAIL  │
│ (reaches their own PC)  │
└─────────────────────────┘
```

**Local Network IP (192.168.x.x, 10.x.x.x)**
```
192.168.1.5 = "This specific computer in my home"

┌──────────────────────────────────────────┐
│ Your Home Network                        │
├──────────────────────────────────────────┤
│ Router 192.168.1.1 - Controls network    │
│ Your PC   192.168.1.5 - Where Synapse is│
│ Your Phone 192.168.1.8 - Can reach you  │
│ Friend's PC 192.168.1.10 - Can reach you│
│                                          │
│ From your PC:                            │
│ 192.168.1.5:8008 → Reaches self (OK)   │
│                                          │
│ From friend's PC:                        │
│ 192.168.1.5:8008 → Reaches your PC (OK)│
│ 192.168.1.8:8008 → Reaches their PC    |
└──────────────────────────────────────────┘
```

**Public Internet IP (your.isp.ip.address)**
```
203.0.113.5 = "My public internet address"

┌────────────────────────────────────────────┐
│ Internet (Worldwide)                       │
├────────────────────────────────────────────┤
│ Your computer has router which has:        │
│  - Public IP: 203.0.113.5                  │
│  - Local IP:  192.168.1.5                  │
│                                            │
│ From anywhere on internet:                 │
│ 203.0.113.5:8008 → Could reach your PC   │
│ (but router ports must be forwarded first) │
└────────────────────────────────────────────┘
```

### Localhost vs Real IP vs Docker IPs

**Who Can Access What?**
```
┌─────────────────────────────────────────────────────────────────┐
│ Your Computer (Windows/Mac/Linux Host)                          │
├─────────────────────────────────────────────────────────────────┤
│ IP Addresses:                                                   │
│  - 127.0.0.1 = localhost (loopback, self only)                 │
│  - 192.168.1.5 = your local network IP                         │
│  - 203.0.113.5 = public internet IP (through router)           │
│                                                                 │
│ Services listening:                                             │
│  - Synapse:8008                                                │
│  - Bridge:9993                                                 │
│  - Webhook:9001                                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Docker Network (Internal bridge)                               │
├─────────────────────────────────────────────────────────────────┤
│ Synapse Container IP: 172.19.0.2 (internal docker network)     │
│  - localhost (within container) = 127.0.0.1 (container's own) │
│  - host.docker.internal = 192.168.1.5 (points back to host)  │
│  - 172.19.0.2 = its own docker network IP                     │
│                                                                 │
│ Bridge Container IP: 172.19.0.3 (internal docker network)      │
│ Database Container IP: 172.19.0.4 (internal docker network)    │
│ Valkey Container IP: 172.19.0.5 (internal docker network)      │
└─────────────────────────────────────────────────────────────────┘
```

### How Network Communication Works: Step by Step

**Scenario 1: You opening browser to `http://localhost:8008`**
```
Step 1: Browser on your computer
        ↓
        "I want to connect to localhost:8008"
        ↓
Step 2: Operating System translates 'localhost' to 127.0.0.1
        ↓
Step 3: OS looks locally: "Is there anything listening on 127.0.0.1:8008?"
        ↓
Step 4a: YES → Synapse server is listening on that port!
        → Browser gets a response
        ↓
Step 5a: Browser displays page
        ✓ Connection successful

Step 4b: NO → Nothing listening there
        → Browser gets "Connection refused"
        ✓ Connection failed
```

**Scenario 2: Bridge container trying to reach Synapse**
```
Step 1: Inside Bridge container
        ↓
        Code says: "Connect to http://localhost:8008"
        ↓
Step 2: Container's OS translates 'localhost' to 127.0.0.1
        ↓
Step 3: Looks for 127.0.0.1:8008 WITHIN the container
        ↓
        ✗ Not found! (Synapse is on the HOST, not in container)
        → Connection refused error!

INSTEAD:
Step 1: Inside Bridge container
        ↓
        Code says: "Connect to http://host.docker.internal:8008"
        ↓
Step 2: Docker's DNS translates 'host.docker.internal' to host's gateway IP
        ↓
Step 3: Container tries to reach that IP on port 8008
        ↓
Step 4: Docker's networking layer routes to actual host machine
        ↓
Step 5: Host machine receives request on port 8008
        ↓
Step 6: Synapse server responds
        ✓ Connection successful!
```

**Scenario 3: GitHub trying to send a webhook to your Synapse**
```
Step 1: GitHub (on internet)
        ↓
        "Send webhook to http://yourpc.com:9001"
        ↓
Step 2: GitHub's DNS looks up "yourpc.com" → finds 203.0.113.5
        ↓
Step 3: GitHub connects to 203.0.113.5:9001
        ↓
Step 4: GitHub's request reaches your router (203.0.113.5)
        ↓
Step 5: Router forwards to internal machine 192.168.1.5:9001
        (ONLY if you configured port forwarding!)
        ↓
Step 6: Your host machine receives on port 9001
        ↓
Step 7: Docker exposes 9001 → Bridge container receives it
        ↓
Step 8: Bridge processes webhook
        ✓ Webhook received!

WITHOUT port forwarding:
Step 5: Router with no forwarding rule
        ↓
        Drops the request
        ✗ Webhook never arrives
```

### Network Layers and Firewalls

**Network Layers (like layers in a building):**
```
Layer Model: Internet → Router → Host Machine → Docker → Container

┌─────────────────────────────────────────────────────────────┐
│ INTERNET (Layer 1)                                          │
│ - Global, worldwide                                         │
│ - Uses public IP addresses (203.0.113.5)                   │
│ - Routers connect networks                                  │
├─────────────────────────────────────────────────────────────┤
│ ROUTER (Layer 2) - Your Home Gateway                        │
│ - Sits between internet and your devices                    │
│ - Has public IP (203.0.113.5) facing internet              │
│ - Has local IP (192.168.1.1) for your devices             │
│ - Controls what comes in/out (port forwarding)             │
├─────────────────────────────────────────────────────────────┤
│ YOUR HOST MACHINE (Layer 3)                                │
│ - Windows/Mac/Linux                                        │
│ - Has local network IP (192.168.1.5)                      │
│ - Has localhost (127.0.0.1 - internal only)               │
│ - Has Windows Firewall / macOS Firewall                    │
├─────────────────────────────────────────────────────────────┤
│ DOCKER DAEMON (Layer 4)                                    │
│ - Manages containers                                       │
│ - Creates internal network bridge (172.19.0.x)            │
│ - Exposes ports to host                                    │
├─────────────────────────────────────────────────────────────┤
│ CONTAINERS (Layer 5)                                       │
│ - Isolated environments                                    │
│ - Each has own localhost (127.0.0.1)                      │
│ - Share Docker network (172.19.0.x)                       │
│ - Can reach host via host.docker.internal                 │
└─────────────────────────────────────────────────────────────┘
```

### Firewalls at Each Layer

**Firewall Layer 1: Router Firewall**
```
Router (Firewall enabled by default)
│
├─ Port 80 (HTTP) → BLOCKED
│   ✗ Requests to your public IP:80 are dropped
│
├─ Port 8008 → BLOCKED (unless you port-forward)
│   ✗ Requests to 203.0.113.5:8008 get dropped
│   ✓ Can enable port forwarding: 203.0.113.5:8008 → 192.168.1.5:8008
│
└─ Port 443 (HTTPS) → Usually OPEN for internet access
    ✓ Requests reach your devices
```

**Firewall Layer 2: Host Machine Firewall (Windows Firewall, etc.)**
```
Your PC Firewall Settings
│
├─ Inbound (incoming requests)
│  ├─ Port 8008 → If blocked: even local network can't reach
│  │   Solution: "Allow port 8008 in Windows Firewall"
│  │
│  └─ Port 9001 → If blocked: webhooks won't arrive
│      Solution: "Allow port 9001 in Windows Firewall"
│
└─ Outbound (outgoing requests)
   └─ Usually less restricted
       (Bridge can usually reach anything)
```

**Firewall Layer 3: Docker Internal Network**
```
Docker by default creates a private network
│
├─ Container to Container: ✓ Can access directly
│  Example: Synapse can reach PostgreSQL:5432
│          (no firewall between them)
│
├─ Container to Host: ✓ Can access if exposed
│  Example: Bridge at host.docker.internal:8008
│          (Docker networking handles routing)
│
└─ External to Container: Only if port exposed
   Example: GitHub webhook → port 9001 exposed → reaches Bridge
           (port not exposed → request never reaches container)
```

### Communication Paths in Your Setup

**Path 1: You → Synapse (Loopback)**
```
YourBrowser → OS:localhost → 127.0.0.1:8008 → Host Machine
→ Docker Port Mapping → Synapse Container → Database
✓ Works: Synapse responds with status
```

**Path 2: Bridge → Synapse (Container to Host)**
```
Bridge Container → host.docker.internal:8008 → Host Machine:8008
→ Docker Port Mapping (reverse) → Synapse 127.0.0.1:8008
✓ Works: Bridge can call Synapse APIs
```

**Path 3: Synapse → Bridge (Host to Container)**
```
Synapse Container → host.docker.internal:9993 → Host Machine:9993
→ Docker Port Mapping → Bridge Container
✓ Works: Synapse can notify Bridge of events
```

**Path 4: Bridge → Database (Container to Container)**
```
Bridge Container 172.19.0.3 → PostgreSQL:5432 (direct, same Docker network)
✓ Works: Direct internal communication
✗ Blocked to external: No firewall rules expose this port
```

**Path 5: External Webhooks → You (Internet to Your PC)**
```
GitHub (external) → 203.0.113.5:9001 (public internet)
→ Router checks port forwarding rule
→ Forwards to 192.168.1.5:9001 (local network)
→ Host machine port 9001
→ Docker exposes 9001 → Bridge Container
✓ IF: Port forwarding configured
✗ IF: Router firewall blocks or no port forward rule
```

**Path 6: Synapse → PostgreSQL (Container to Container - Private)**
```
Synapse Container 172.19.0.2 → PostgreSQL Container 172.19.0.4:5432
✓ Works: Docker network connects them
✗ Hidden: Not exposed to host, internet, or firewall rules
```

### Comparison Table: Access Scenarios

| Source | Destination | URL | Works? | Why |
|--------|-------------|-----|--------|-----|
| Your browser | Synapse | `http://localhost:8008` | ✓ | Loopback, hits host port 8008 |
| Your browser | Synapse | `http://127.0.0.1:8008` | ✓ | Same as localhost |
| Your phone (WiFi) | Synapse | `http://localhost:8008` | ✗ | Phone's localhost ≠ your PC |
| Your phone (WiFi) | Synapse | `http://192.168.1.5:8008` | ✓ | Uses your PC's local IP |
| Your phone (WiFi) | Synapse | `http://yourpc.com:8008` | ✗ | DNS works but no port forward |
| Bridge container | Synapse | `http://localhost:8008` | ✗ | Container's localhost ≠ host |
| Bridge container | Synapse | `http://host.docker.internal:8008` | ✓ | Docker special hostname |
| Bridge container | Synapse | `http://synapse:8008` | ✗ | Wrong container name/no DNS |
| Synapse container | Bridge | `http://host.docker.internal:9993` | ✓ | Docker routing to host |
| Synapse container | PostgreSQL | `http://postgres:5432` | ✓ | Docker DNS resolves container name |
| External GitHub | Your Synapse | `http://203.0.113.5:9001` | ✗ | No port forwarding |
| External GitHub | Your Synapse | `http://203.0.113.5:9001` | ✓ | Port forwarding configured |

### Security Implications

**What's Exposed to the Internet?**
```
If you forward ports to your home network:

203.0.113.5:9001 (public IP) → 192.168.1.5:9001 → Bridge
│
✓ Webhooks from GitHub/GitLab can reach Bridge
✗ Also: Hackers can try to attack port 9001

203.0.113.5:8008 → No forwarding rule → Router blocks
│
✓ Synapse requires authentication, safer
✓ Still should use firewall

203.0.113.5:5432 (PostgreSQL) → NOT exposed
│
✓ Database stays hidden
✓ Only internal container access
```

**What's Hidden?**
```
Database (PostgreSQL) - Only Synapse can access
│
- Not exposed to host: ✓
- Not exposed to docker host network: ✓
- Not exposed to internet: ✓
- Only reachable via Docker's internal network: ✓

Cache (Valkey) - Only Bridge can access
│
- Not exposed to host: ✓
- Not exposed to docker host network: ✓
- Not exposed to internet: ✓
- Only reachable via Docker's internal network: ✓
```

### Your Machine Network Configuration

**Current Setup (Local Development):**
```
                        INTERNET
                           ↑
                    (No access configured)
                           │
                        ROUTER
                    (No port forwarding)
                           │
                    192.168.1.5 (Your PC)
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    Windows Firewall     Docker Daemon    PostgreSQL
         │                 │                 │
      Port 8008:          Port 8008:        Port 5432:
      ✓ Allow ✓           Synapse           ✗ Blocked
                           │
      Port 9001:          Port 9993:
      ✓ Allow ✓           Bridge
      (for webhooks)
                           │
                    Docker Network
                    (172.19.0.x)
                           │
         ┌─────────────┬───┴───┬──────────┐
         │             │       │          │
      Synapse      Bridge   PostgreSQL  Valkey
      Container   Container  Container  Container
```

## Service Communication Diagram

```
Your Computer (Host Machine)
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Matrix User (Element App)                           │
│  ↓                                                   │
│  localhost:8008 ← Synapse Server (Container)        │
│  ↑ http://host.docker.internal:8008 ← Bridge needs to reach Synapse
│  │                                                  │
│  └─ Synapse calls Bridge at:                        │
│     http://host.docker.internal:9993                │
│     ↓                                                │
│  localhost:9993 ← Bridge Server (Container)         │
│  ↓                                                   │
│  localhost:9001 ← Webhook Endpoint (on Bridge)      │
│  ↑                                                  │
│  GitHub/GitLab sends webhooks here                  │
│                                                     │
│  Inside Containers (hidden from host):              │
│  ├─ Synapse → PostgreSQL (port 5432)               │
│  └─ Bridge → Valkey (port 6379)                    │
│                                                     │
└──────────────────────────────────────────────────────┘
```

### Which URLs Go Where?

**In `config.yml` (Bridge configuration):**
```yaml
bridge:
  url: http://host.docker.internal:8008  ← Bridge uses this to reach Synapse
```
**Why `host.docker.internal`?** Because Bridge runs INSIDE a container.

**In `registration.yml` (Synapse configuration):**
```yaml
url: "http://host.docker.internal:9993"  ← Synapse uses this to reach Bridge
```
**Why `host.docker.internal`?** Because Synapse runs INSIDE a container. It needs to reach Bridge on the host.

**Public API (from your computer):**
```
http://localhost:8008    ← Use this from your browser
http://localhost:9001    ← Use this for webhooks
http://localhost:9993    ← Bridge admin interface
```
**Why `localhost`?** Because you're accessing FROM your host machine.

## Setup Steps Completed

### 1. Synapse Signing Key Generation

**Problem**: Synapse requires a signing key but faced permission errors in Docker.

**Solution**: Generated the signing key using root privileges:
```bash
docker run --rm --user 0:0 --entrypoint python \
  -v C:/Projects/.../synapse-data:/data \
  matrixdotorg/synapse:latest \
  -c "from signedjson.key import generate_signing_key, write_signing_keys; write_signing_keys(open('/data/localhost.signing.key', 'w'), [generate_signing_key('a')])"
```

**Result**: `synapse-data/localhost.signing.key` created

### 2. Permission Fixes

**Problems Fixed**:
- Media store directory permission denied
- Log file permission denied

**Solutions**:
```bash
# Create media_store directory with proper permissions
docker run --rm --user 0:0 --entrypoint sh \
  -v C:/Projects/.../synapse-data:/data \
  matrixdotorg/synapse:latest \
  -c "mkdir -p /data/media_store && chmod -R 777 /data"
```

**Log File Path**: Updated [synapse-data/localhost.log.config](synapse/synapse-data/localhost.log.config#L22) to use `/data/homeserver.log` instead of `/homeserver.log`

### 3. Docker Networking Configuration

**Problem**: Bridge container (localhost) sent requests to 127.0.0.1:8008, which is the container's own localhost, not the host.

**Solution**: Updated [config.yml](config.yml#L6) to use special Docker hostname:
```yaml
bridge:
  url: http://host.docker.internal:8008
```

This allows containers to reach services on the host machine via `host.docker.internal`.

### 4. App Service Registration

**Created**: [synapse/synapse-data/registration.yml](synapse/synapse-data/registration.yml)

```yaml
id: matrix-hookshot
as_token: 7lo0XQLbKRd9PnEiiIv9AIzxg3+FpWmnpAUydjqQTN0=
hs_token: NP9HAIwk7G9j7j3Ui4Z0MXjeFuP/hOlVD9ZL0ZwdFB8=

namespaces:
  rooms: []
  users:
    - regex: "@_github_.*:localhost"
      exclusive: false
    - regex: "@_gitlab_.*:localhost"
      exclusive: false
    - regex: "@_jira_.*:localhost"
      exclusive: false
    - regex: "@_webhooks_.*:localhost"
      exclusive: false
    - regex: "@feeds:localhost"
      exclusive: false
  aliases:
    - regex: "#hookshot.*:localhost"
      exclusive: true

sender_localpart: hookshot
url: "http://host.docker.internal:9993"
rate_limited: false

de.sorunome.msc2409.push_ephemeral: true
push_ephemeral: true
org.matrix.msc3202: true
```

**Key Points**:
- `as_token` and `hs_token` must match those in [config.yml](config.yml#L9-L10) exactly
  - If they don't match, you'll get `M_UNKNOWN_TOKEN: Invalid access token passed` errors
  - `as_token` = Bridge proves to Synapse who it is
  - `hs_token` = Synapse proves to Bridge who it is
- `url: http://host.docker.internal:9993`
  - This tells **Synapse** (running in a container) how to reach the **Bridge**
  - Uses `host.docker.internal` because Synapse is in a container
  - Must be port `9993` where Bridge is listening
  - This is different from Bridge's `url` which tells Bridge how to reach Synapse
- User and alias regexes control which Matrix IDs the Bridge manages
- These patterns define what users and rooms the Bridge owns exclusively

### 5. Homeserver Configuration

Updated [synapse/synapse-data/homeserver.yaml](synapse/synapse-data/homeserver.yaml#L36-L37) to enable app service:

```yaml
app_service_config_files:
  - /data/registration.yml

enable_registration: true
enable_registration_without_verification: true
```

## Configuration Files

### Bridge Configuration
**File**: [config.yml](config.yml)

Key settings:
```yaml
bridge:
  domain: localhost              # Domain name on your Synapse server
  url: http://host.docker.internal:8008  # How Bridge reaches Synapse
  port: 9993                    # What port Bridge listens on
  bindAddress: 0.0.0.0          # Accept connections from anywhere
  as_token: <token>             # Secret shared between Bridge and Synapse
  hs_token: <token>             # Another secret shared between Bridge and Synapse
  userId: "@hookshot:localhost" # The bot's Matrix user ID
```

**URL Explanation:**
- `url: http://host.docker.internal:8008`
  - This is how the **Bridge container** reaches the **Synapse server**
  - Uses `host.docker.internal` because Bridge is in a container
  - Uses port `8008` where Synapse listens
  - Must match what Synapse is actually listening on

**Port Explanation:**
- `port: 9993`
  - The Bridge listens on this port
  - Synapse (running on host) sends requests here
  - Webhook receivers can be configured here too

**Tokens Explanation:**
- Must match exactly with `registration.yml` tokens
- Think of them as passwords that prove Bridge and Synapse are supposed to talk to each other
- If tokens don't match, you get "Invalid access token" errors

### Synapse Homeserver Configuration
**File**: [synapse/synapse-data/homeserver.yaml](synapse/synapse-data/homeserver.yaml)

Key settings:
```yaml
server_name: localhost                    # Your Matrix domain
signing_key_path: /data/localhost.signing.key  # Key file path (inside container)
app_service_config_files:
  - /data/registration.yml                # Where to find Bridge registration
enable_registration: true                 # Allow users to register
enable_registration_without_verification: true  # No email verification needed
trusted_key_servers:
  - server_name: "matrix.org"            # Trust matrix.org for encryption keys
```

**What registration.yml does:**
- Tells Synapse about the Bridge service
- Contains tokens that Bridge will use to authenticate
- Contains the URL (http://host.docker.internal:9993) where Synapse reaches the Bridge
- Tells Synapse which Matrix IDs the Bridge manages (e.g., @_github_*, @feeds)

### Synapse Logging Configuration
**File**: [synapse/synapse-data/localhost.log.config](synapse/synapse-data/localhost.log.config)

Updated log path to write within the volume:
```yaml
handlers:
  file:
    filename: /data/homeserver.log
```

## Running the System

### Start All Services
```bash
# Start Synapse and PostgreSQL
cd synapse
docker-compose up -d

# Start Bridge, Valkey, and init-app
cd ..
docker-compose up -d
```

### Check Status
```bash
# Verify Synapse is running
docker logs synapse --tail 20

# Verify Bridge is connected
docker logs matrix-hookshot-dev-app-1 --tail 30

# Test Synapse API
curl http://localhost:8008/_matrix/client/versions
```

### Stop All Services
```bash
# From matrix-hookshot root
docker-compose down

# From synapse directory
cd synapse && docker-compose down
```

## Troubleshooting

### Bridge Cannot Connect to Synapse
**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:8008`

**Cause**: Bridge container is trying to reach 127.0.0.1 (container's own localhost)

**Fix**: Ensure [config.yml](config.yml#L6) uses `host.docker.internal`:
```yaml
url: http://host.docker.internal:8008
```

### Invalid Access Token Error
**Symptom**: `M_UNKNOWN_TOKEN: Invalid access token passed`

**Cause**: Registration file not loaded by Synapse or tokens don't match

**Fix**:
1. Verify [registration.yml](synapse/synapse-data/registration.yml) exists
2. Check tokens match in [config.yml](config.yml#L9-L10) and [registration.yml](synapse/synapse-data/registration.yml#L2-L3)
3. Ensure `app_service_config_files` is uncommented in [homeserver.yaml](synapse/synapse-data/homeserver.yaml#L36)
4. Restart Synapse:
```bash
cd synapse && docker-compose restart synapse
```

### Permission Denied Errors
**Symptom**: `PermissionError: [Errno 13] Permission denied`

**Cause**: Volume permissions issue with Docker on Windows

**Fix**: Create directories with proper permissions:
```bash
docker run --rm --user 0:0 --entrypoint sh \
  -v {path}/synapse-data:/data \
  matrixdotorg/synapse:latest \
  -c "mkdir -p /data/media_store && chmod -R 777 /data"
```

### Synapse Won't Start
**Check**: `docker logs synapse`

**Common Issues**:
- Signing key missing → Generate using step 1 above
- Config errors → Validate YAML syntax
- Database connection → Check PostgreSQL is running

## Quick Reference: URLs, Ports, and Services

### What's the Difference?

| Term | Meaning | Example |
|------|---------|---------|
| **Server** | Software listening on a port, ready to serve requests | Synapse, Bridge |
| **Container** | An isolated box running servers (like a mini-computer) | Docker container with Synapse inside |
| **Service** | A named container in docker-compose (they can talk to each other) | `synapse` service, `app` service |
| **Port** | A numbered "door" on a server (0-65535) | 8008, 9993, 9001 |

### Port Summary

| Port | Service | Direction | Used By | What It's For |
|------|---------|-----------|---------|--------------|
| **8008** | Synapse Server | ← Your device / Bridge | Matrix messages, user auth |
| **9993** | Bridge Server | ← Synapse | Bridge app service requests |
| **9001** | Webhook Listener | ← GitHub/GitLab/etc | Receive webhooks |
| **5432** | PostgreSQL | Internal only | Synapse ↔ Database |
| **6379** | Valkey Cache | Internal only | Bridge ↔ Cache |

### URL Cheat Sheet

**When Bridge needs Synapse:**
```yaml
# In config.yml
url: http://host.docker.internal:8008  # Use host.docker.internal (Bridge is in container)
```

**When Synapse needs Bridge:**
```yaml
# In registration.yml
url: http://host.docker.internal:9993  # Use host.docker.internal (Synapse is in container)
```

**When You (on your computer) need to access services:**
```
http://localhost:8008    # Synapse
http://localhost:9993    # Bridge admin interface
http://localhost:9001    # Webhook endpoint
```

**Why the difference?**
- `host.docker.internal` = "The computer that's running Docker"
- `localhost` = "Whichever machine this code is running on"
- Inside a container, `localhost` means the container itself
- So we use `host.docker.internal` to reach from container to host

## Directory Structure

```
matrix-hookshot/
├── config.yml                 # Bridge configuration
├── registration.yml           # App service registration for Synapse
├── config.sample.yml
├── registration.sample.yml
├── docker-compose.yml         # Bridge services (valkey, hookshot)
└── synapse/
    ├── docker-compose.yml     # Synapse and PostgreSQL
    ├── .env                   # Synapse environment variables
    └── synapse-data/
        ├── homeserver.yaml    # Synapse configuration
        ├── localhost.log.config
        ├── localhost.signing.key
        ├── registration.yml   # App service registration
        ├── homeserver.log     # Synapse logs
        └── media_store/       # Media storage directory
```

## Next Steps

1. **Create a Matrix account**: Register a user on the Synapse homeserver
2. **Invite the hookshot bot**: Invite @hookshot:localhost to a room
3. **Configure connections**: Use `!hookshot help` to see available commands
4. **Set up webhooks**: Configure GitHub, GitLab, Jira, or other integrations

## References

- [Matrix Hookshot Documentation](https://github.com/Half-Shot/matrix-hookshot)
- [Synapse Configuration](https://element-hq.github.io/synapse/latest/setup/installation.html)
- [Docker Networking](https://docs.docker.com/desktop/networking/)
