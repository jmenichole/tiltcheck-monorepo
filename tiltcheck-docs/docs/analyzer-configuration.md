# Analyzer Configuration

Configuration guide for the **Gameplay Analyzer** service environment variables and deployment.

---

## Environment Variables

### Session Security

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SESSION_SIGNING_SECRET` | Yes | Ed25519 private key (64 hex chars) for signing sessions | `a1b2c3...` |
| `SESSION_PUBLIC_KEY` | Optional | Ed25519 public key (64 hex chars); derived from secret if not provided | `d4e5f6...` |

**Generate a signing secret:**

```bash
openssl rand -hex 32
```

**Derive public key programmatically:**

```bash
node -e 'const {getPublicKey}=require("@noble/ed25519"); const sec="YOUR_SECRET"; getPublicKey(Buffer.from(sec,"hex")).then(p=>console.log(Buffer.from(p).toString("hex")));'
```

### Networking

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `7072` | HTTP API port for `/analyze`, `/api/spins`, `/api/seeds` |
| `WSS_PORT_CHAIN` | `7071,7073,7074` | Comma-separated WebSocket server ports (tries in order until one binds) |
| `WSS_PORT` | First from chain | Override WebSocket port explicitly |
| `GAMEPLAY_ANALYZER_PUBLIC_ORIGIN` | `http://localhost:7072` | Public-facing origin for `/analyze` links (set to deployed domain) |

**Example production setup:**

```bash
export GAMEPLAY_ANALYZER_PUBLIC_ORIGIN=https://analyzer.tiltcheck.it.com
export API_PORT=7072
export WSS_PORT_CHAIN=7073
```

### Casino & Detection

| Variable | Default | Description |
|----------|---------|-------------|
| `CASINO_ID` | `stake-us` | Primary casino identifier for adapter matching |
| `GRADE_INTERVAL` | `500` | Spins between grading snapshots |
| `RTP_WINDOW_SIZE` | `400` | Rolling window size for RTP drift detection |
| `EXPECTED_RTP` | `-0.02` | Expected mean net win per spin (negative = house edge) |
| `DETECTION_WINDOW` | `100` | Spins analyzed per anomaly detection run |
| `DETECTION_INTERVAL` | `200` | Spins between anomaly detection runs |
| `RTP_DRIFT_THRESHOLD` | `0.5` | Deviation ratio threshold for RTP drift alerts |

### Database & Storage

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `data/gameplay-analyzer.db` | SQLite database file path |
| `SESSIONS_FILE` | `data/sessions.json` | Session persistence file (bot-side) |
| `SEED_FILE_PATH` | `data/seeds/${CASINO_ID}.json` | Seed rotation archive path |

---

## Common Issues

### "Not Found" on `/analyze`

**Cause:** Bot generates link with `GAMEPLAY_ANALYZER_PUBLIC_ORIGIN` but deployed analyzer runs on different host/port.

**Fix:**

1. Set `GAMEPLAY_ANALYZER_PUBLIC_ORIGIN` to match your deployed analyzer domain.
2. For local dev:
   ```bash
   export GAMEPLAY_ANALYZER_PUBLIC_ORIGIN=http://localhost:7072
   ```
3. For production:
   ```bash
   export GAMEPLAY_ANALYZER_PUBLIC_ORIGIN=https://analyzer.tiltcheck.it.com
   ```

### "Session Invalid: Public key not configured"

**Cause:** Analyzer cannot derive public key from `SESSION_SIGNING_SECRET` or `SESSION_PUBLIC_KEY`.

**Fix:**

Ensure at least one of these is set:

```bash
export SESSION_SIGNING_SECRET=<64-hex-private-key>
# OR
export SESSION_PUBLIC_KEY=<64-hex-public-key>
```

### WebSocket Connection Errors

**Cause:** Port conflict or firewall blocking WebSocket port.

**Fix:**

1. Change `WSS_PORT_CHAIN` to avoid conflicts:
   ```bash
   export WSS_PORT_CHAIN=9001,9002
   ```
2. Ensure firewall allows inbound on chosen port.
3. For production behind reverse proxy (nginx, Cloudflare), configure WebSocket upgrade headers:
   ```nginx
   location /ws {
       proxy_pass http://localhost:7073;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "Upgrade";
   }
   ```

### "EADDRINUSE" on API or WebSocket Port

**Cause:** Another process is using the port.

**Quick fix:**

```bash
# Kill process on port 7072
lsof -ti:7072 | xargs kill -9

# Or use alternate ports
export API_PORT=7082
export WSS_PORT_CHAIN=7083,7084
```

---

## Deployment Checklist

- [ ] Generate and securely store `SESSION_SIGNING_SECRET`
- [ ] Set `GAMEPLAY_ANALYZER_PUBLIC_ORIGIN` to deployed domain
- [ ] Configure `API_PORT` and `WSS_PORT_CHAIN` to avoid conflicts
- [ ] Ensure database directory exists and is writable: `mkdir -p data`
- [ ] Verify Discord bot has matching `SESSION_SIGNING_SECRET`
- [ ] Test `/analyze` link generation via Discord command
- [ ] Confirm WebSocket connection in browser dev console (no CORS/upgrade errors)

---

## Related Documentation

- [Session Management](./sessions.md) — Session creation & validation flows
- [API Reference](./api/tiltcheck.md) — Full endpoint documentation
- [Trust Engines](./8-trust-engines.md) — CollectClock & provisional tracking
