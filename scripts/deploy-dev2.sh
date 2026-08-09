#!/usr/bin/env bash
#
# Merge a feature branch into main, build locally, ship to dev2.
#
#   ./scripts/deploy-dev2.sh Keshava_08-08-2026          # full run
#   ./scripts/deploy-dev2.sh Keshava_08-08-2026 --dry-run # stop before pushing/shipping
#   ./scripts/deploy-dev2.sh --redeploy                   # rebuild + ship current main, no merge
#
# The app is ALWAYS built here and shipped as a prebuilt standalone bundle.
# Never run `next build` on dev2 — it is a shared box and the build has wedged
# it hard enough to require a reboot (see docs in the repo memory / README).
#
# Credentials: never hardcoded. Either
#   a) set up SSH keys (recommended):  ssh-copy-id -p 50022 viki@dev2.skolo.in
#   b) or export DEV2_PASS=... (falls back to sshpass)
#
set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
DEV2_HOST="${DEV2_HOST:-dev2.skolo.in}"
DEV2_USER="${DEV2_USER:-viki}"
DEV2_PORT="${DEV2_PORT:-50022}"
DEV2_DIR="${DEV2_DIR:-/home/viki/CollegeERP-Next}"
PM2_APP="${PM2_APP:-collegeerp}"
APP_PORT="${APP_PORT:-3001}"          # loopback port the standalone server binds
PUBLIC_URL="${PUBLIC_URL:-https://dev2.skolo.in:3000}"
NODE_BIN="${NODE_BIN:-\$HOME/.nvm/versions/node/v20.20.2/bin}"  # remote PATH prefix

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BRANCH="${1:-}"
DRY_RUN=0
REDEPLOY_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)  DRY_RUN=1 ;;
    --redeploy) REDEPLOY_ONLY=1; BRANCH="" ;;
  esac
done
[[ "${BRANCH:-}" == --* ]] && BRANCH=""

if [[ -z "$BRANCH" && $REDEPLOY_ONLY -eq 0 ]]; then
  echo "usage: $0 <branch-to-merge> [--dry-run]   |   $0 --redeploy" >&2
  exit 2
fi

say()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ── Remote helpers (SSH key if available, else sshpass) ───────────────────────
SSH_OPTS=(-o StrictHostKeyChecking=no -p "$DEV2_PORT")
if [[ -n "${DEV2_PASS:-}" ]]; then
  command -v sshpass >/dev/null || die "DEV2_PASS set but sshpass not installed (brew install sshpass)"
  rsh()   { sshpass -p "$DEV2_PASS" ssh "${SSH_OPTS[@]}" "$DEV2_USER@$DEV2_HOST" "$@"; }
  rsyncp(){ sshpass -p "$DEV2_PASS" rsync "$@"; }
else
  rsh()   { ssh "${SSH_OPTS[@]}" "$DEV2_USER@$DEV2_HOST" "$@"; }
  rsyncp(){ rsync "$@"; }
fi
RSH_CMD="ssh ${SSH_OPTS[*]}"

# ── 1. Preflight ─────────────────────────────────────────────────────────────
say "Preflight"
[[ -z "$(git status --porcelain)" ]] || die "working tree is dirty — commit or stash first"
git rev-parse --abbrev-ref HEAD | grep -qx main || die "not on main (checkout main first)"
rsh true >/dev/null 2>&1 || die "cannot reach $DEV2_USER@$DEV2_HOST:$DEV2_PORT (set DEV2_PASS or SSH keys)"
ok "clean tree, on main, dev2 reachable"

read -r AVAIL_MB DISK_USE < <(rsh "free -m | awk 'NR==2{print \$7}'; df -h / | awk 'NR==2{print \$5}'" | paste -sd' ' -)
echo "  dev2: ${AVAIL_MB}MB RAM available, disk ${DISK_USE} used"
[[ "${AVAIL_MB:-0}" -lt 300 ]] && warn "dev2 RAM is very low — restart may be slow"

# ── 2. Merge ─────────────────────────────────────────────────────────────────
BEFORE="$(git rev-parse HEAD)"
if [[ $REDEPLOY_ONLY -eq 0 ]]; then
  say "Merging origin/$BRANCH into main"
  git fetch origin --prune
  git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1 || die "no such remote branch: origin/$BRANCH"

  # Record the pre-merge state of things that have silently regressed before.
  EVAL_HDR_BEFORE=$(grep -c 'eval-header'    src/app/globals.css || true)
  EVAL_THM_BEFORE=$(grep -c 'data-eval-theme' src/app/globals.css || true)
  MARK_BEFORE=$(grep -c -- '--mark'           src/app/globals.css || true)

  if git merge-base --is-ancestor HEAD "origin/$BRANCH"; then
    git merge --ff-only "origin/$BRANCH"
    ok "fast-forwarded to $(git rev-parse --short HEAD)"
  else
    warn "branch has diverged from main — this needs a real merge commit"
    git merge --no-edit "origin/$BRANCH" || die "merge conflicts — resolve by hand, then rerun with --redeploy"
    ok "merged (merge commit $(git rev-parse --short HEAD))"
  fi

  [[ "$(git rev-parse HEAD)" == "$BEFORE" ]] && { warn "already up to date — nothing to deploy"; exit 0; }

  say "Post-merge checks"
  git diff --stat "$BEFORE..HEAD" | tail -1

  # Evaluator theme tokens live only in globals.css and have no test covering
  # them; a careless restyle merge silently drops them.
  for pair in "eval-header:$EVAL_HDR_BEFORE" "data-eval-theme:$EVAL_THM_BEFORE" "--mark:$MARK_BEFORE"; do
    tok="${pair%:*}"; was="${pair##*:}"
    now=$(grep -c -- "$tok" src/app/globals.css || true)
    if [[ "$now" -lt "$was" ]]; then
      die "evaluator token '$tok' dropped in globals.css ($was → $now) — inspect before deploying"
    fi
  done
  ok "evaluator theme tokens intact"

  if ! git diff --quiet "$BEFORE..HEAD" -- package.json package-lock.json; then
    warn "dependencies changed — running npm install"
    npm install
    NEEDS_REMOTE_CI=1
  else
    ok "package.json/lockfile unchanged — skipping install"
    NEEDS_REMOTE_CI=0
  fi
else
  say "Redeploy only — no merge"
  NEEDS_REMOTE_CI=0
fi

# ── 3. Build (always local) ──────────────────────────────────────────────────
say "Building locally"
npm audit --audit-level=high || warn "npm audit found advisories (see above) — not blocking"
rm -rf .next
NODE_OPTIONS=--max-old-space-size=6144 npm run build
[[ -d .next/standalone ]] || die "build produced no .next/standalone (is output:'standalone' still set?)"
ok "build complete"

# ── 4. Assemble the standalone bundle ────────────────────────────────────────
# standalone omits static/ and public/, and the turbopack build does not trace
# every SSR chunk into it — all three copies are required on EVERY build.
say "Assembling standalone bundle"
cp -r .next/static  .next/standalone/.next/static
cp -r public        .next/standalone/public
cp -r .next/server/. .next/standalone/.next/server/
ok "$(find .next/standalone/.next/server -type f | wc -l | tr -d ' ') server files"

if [[ $DRY_RUN -eq 1 ]]; then
  say "--dry-run: stopping before push/ship"
  echo "  HEAD is $(git rev-parse --short HEAD); nothing pushed, dev2 untouched."
  exit 0
fi

# ── 5. Push ──────────────────────────────────────────────────────────────────
if [[ $REDEPLOY_ONLY -eq 0 ]]; then
  say "Pushing main"
  git push origin main
fi

# ── 6. Ship ──────────────────────────────────────────────────────────────────
# --exclude @img: this Mac is arm64, dev2 is x86_64; the linux sharp binaries
#   already on dev2 are restored in the next step.
# --exclude .env.local: dev2 points at its own backend; never overwrite it.
say "Shipping to dev2"
rsyncp -az --delete-after \
  --exclude='node_modules/@img' --exclude='.env.local' \
  -e "$RSH_CMD" \
  .next/standalone/ "$DEV2_USER@$DEV2_HOST:$DEV2_DIR/.next/standalone/"
ok "bundle synced"

if [[ $NEEDS_REMOTE_CI -eq 1 ]]; then
  rsyncp -az -e "$RSH_CMD" package.json package-lock.json "$DEV2_USER@$DEV2_HOST:$DEV2_DIR/"
  rsh "export PATH=$NODE_BIN:\$PATH; cd $DEV2_DIR && npm ci"
  ok "dev2 node_modules resynced"
fi

# ── 7. Restart ───────────────────────────────────────────────────────────────
# HOSTNAME/PORT must be explicit: an SSH login shell's \$HOSTNAME is the box's
# public IP, and standalone server.js binds to it -> EADDRNOTAVAIL crash-loop.
say "Restarting $PM2_APP"
rsh "export PATH=$NODE_BIN:\$PATH
     cd $DEV2_DIR
     cp -r node_modules/@img/. .next/standalone/node_modules/@img/
     cd .next/standalone
     node -e 'console.log(\"  sharp libvips\", require(\"sharp\").versions.vips)'
     HOSTNAME=127.0.0.1 PORT=$APP_PORT pm2 restart $PM2_APP --update-env >/dev/null
     pm2 save >/dev/null"
sleep 8
ok "restarted"

# ── 8. Verify ────────────────────────────────────────────────────────────────
say "Verifying"
FAILED=0
check() { # path expected
  code=$(rsh "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$APP_PORT$1")
  if [[ "$code" == "$2" ]]; then ok "$1 → $code"
  else printf '  \033[31m✗\033[0m %s → %s (expected %s)\n' "$1" "$code" "$2"; FAILED=1; fi
}
check /login     200   # public page must render
check /dashboard 307   # protected routes redirect when unauthenticated — healthy
check /evaluator 307

PUB=$(curl -s -o /dev/null -w '%{http_code}' "$PUBLIC_URL/login")
[[ "$PUB" == "200" ]] && ok "public $PUBLIC_URL/login → 200" \
                      || { printf '  \033[31m✗\033[0m public login → %s\n' "$PUB"; FAILED=1; }

rsh "pm2 list | grep $PM2_APP"

if [[ $FAILED -eq 1 ]]; then
  die "verification failed — check: $DEV2_DIR then 'pm2 logs $PM2_APP --lines 50'"
fi

say "Deployed $(git rev-parse --short HEAD) to $PUBLIC_URL"
echo "  Not covered by this script: authed smoke tests. Log in and click through"
echo "  anything new before calling it good."
