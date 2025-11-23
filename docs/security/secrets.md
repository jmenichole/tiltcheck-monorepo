# Secrets Management

This repository uses multiple layers of defense against secret leakage:

## 1. GitHub Actions Secret Scanning
Workflow: `.github/workflows/secret-scan.yml` runs on PRs, pushes, and nightly schedule.
It performs:
- Verified secret scanning via TruffleHog (`--only-verified`) to reduce false positives.
- Non-blocking entropy heuristic (length >= 40 base64-like).
- SARIF upload for GitHub Security tab visibility.

## 2. File Ignoring
`.gitignore` excludes `.env`, runtime JSON stores, private key material, and age key files.

## 3. Encrypted Artifacts with SOPS + age
Configuration: `.sops.yaml` defines rules.

### Generate age Key Pair
```sh
age-keygen -o age.agekey
grep public age.agekey  # Extract public key (after 'public key:')
```
Update `.sops.yaml` replacing `AGE_PUBLIC_KEY_PLACEHOLDER` with the extracted public key.

### Encrypt a Secret File
Put plaintext at `secrets/service.yaml`, then:
```sh
sops -e secrets/service.yaml > secrets/service.yaml.enc
rm secrets/service.yaml  # keep only encrypted
```

### Decrypt for Local Use
```sh
sops -d secrets/service.yaml.enc > secrets/service.yaml
```

### Environment Files
For environment variables, create `app.secret.env`, then:
```sh
sops -e app.secret.env > app.secret.env.enc
rm app.secret.env
```

## 4. Rotation Procedures
If a credential appears in a commit:
1. Rotate at provider (e.g., Discord portal).
2. Purge from history (git filter-repo).
3. Trigger secret scan workflow manually (`workflow_dispatch`).

## 5. 1Password CLI (Optional Alternative)
Instead of SOPS you can store values in 1Password and inject at runtime:
```sh
op run --env-file=ops.env -- node services/app/dist/index.js
```
Where `ops.env` contains reference syntax like `DISCORD_TOKEN=op://TiltCheck/Discord Bot/token`.

## 6. CI Decryption Example
Add an Action step (self-hosted runner or GitHub-hosted with AGE key in repository secret `AGE_PRIVATE_KEY`):
```yaml
      - name: Prepare age key
        run: |
          echo "$AGE_PRIVATE_KEY" > age.agekey
          chmod 600 age.agekey
      - name: Decrypt secrets
        run: |
          sops -d secrets/service.yaml.enc > secrets/service.yaml
```

## 7. Policy Suggestions
- Enforce PR check must pass before merge.
- Add CODEOWNERS requiring security review for `secrets/**` changes.
- Consider adding `trufflesecurity/trufflehog@v3.21.3` as required status.

## 8. Future Enhancements
- Integrate Open Policy Agent to validate secret format.
- Add automated rotation reminders for aged credentials.
- Add detection of high-risk patterns (JWT, Slack tokens) via custom regex.

---
Keep plaintext secrets ephemeral; use encrypted files or external vaults.