# List recipes
list:
    @just --list

# Install skills into .claude/skills
skills:
    nix run .#skills-install-local

# List installed skills
skills-list:
    nix run .#skills-list

# Re-pin skill sources
skills-update:
    nix run .#skills-sources-lock

# Update all locks, then check
update:
    nix flake update
    nix run .#skills-sources-lock
    nix flake check

# Merge template updates from upstream
sync:
    #!/usr/bin/env bash
    set -euo pipefail
    git remote get-url upstream >/dev/null 2>&1 \
        || git remote add upstream https://github.com/Hol1kgmg/claude-temp.git
    git fetch --no-tags upstream main
    # 初回（共通祖先なし）はテンプレート生成由来の同一ファイルが全部 both added で衝突するため、
    # upstream 側を採用する。2 回目以降は独自変更を守るため通常マージ。
    # マージコミットであることが必須。squash / rebase すると共通祖先が失われ、
    # 次回以降ツリー全体が衝突する（adr/from-template/0001）
    if git merge-base HEAD upstream/main >/dev/null 2>&1; then
        git merge upstream/main --no-edit
    else
        git merge upstream/main --allow-unrelated-histories --no-edit -X theirs
    fi

# Scan working tree for secrets
scan:
    gitleaks dir --verbose

# Scan staged changes for secrets
scan-staged:
    gitleaks protect --staged --verbose

# Serve markdown at http://localhost:8080
docs *ARGS:
    markserv . -p 8080 -a 0.0.0.0 --browser=false {{ARGS}}

# --- web/ (card link checker) ---

# Install web dependencies
web-install:
    cd web && pnpm install

# Dev server: Vite (5173, proxies /api) + wrangler (8787)
web-dev:
    cd web && (pnpm exec wrangler dev & pnpm dev; kill %1)

# Type-check, lint, test
web-check:
    cd web && pnpm exec tsc -p . && pnpm lint && pnpm test

# Format web sources
web-format:
    cd web && pnpm format

# Build SPA then run the Worker locally at http://localhost:8787
web-preview:
    cd web && pnpm preview

# Build and deploy to Cloudflare Workers
web-deploy:
    cd web && pnpm deploy
