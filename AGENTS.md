# Project Overview
{プロジェクトの概要を記述 (例: Dotfiles management project for macOS using Nix and Home-Manager)}

# Setup and Basic Usage
Setup instructions and basic usage are documented in [README.md](./README.md).

# Directory Structure
{※ディレクトリ構造のドキュメントが不要な場合はこのセクションごと削除}
See [{DIRECTORY_STRUCTURE_FILE}.md](./{DIRECTORY_STRUCTURE_FILE}.md) for details.

# Troubleshooting
{※トラブルシューティングのドキュメントが不要な場合はこのセクションごと削除}
- Setup and daily usage issues: See [{TROUBLESHOOTING_FILE}.md](./{TROUBLESHOOTING_FILE}.md)

# Work Rules
1. Propose implementation plan
2. Wait for approval
3. Start implementation

# Comment Policy
- コードには How
- テストコードには What
- コミットログには Why
- コードコメントには Why not

コードコメントの細則:
- コードから読み取れない理由 (why / why not) だけを書く。何をするか・どう動くかの説明は書かない。
- 書く前に「この行を消してもコードから分かるか」を確認し、分かるなら書かない。
- 残すのは背景や制約: 外部ライブラリの仕様、ブラウザ互換、過去の不具合の再発防止など。
- 1 行に収める。長くなるなら設計の問題なのでコードを直す。

# Tool Usage Policy
**Prefer dedicated tools for file operations by default** (not enforced via `permissions.deny` — occasional Bash use is fine when it's genuinely more convenient):
- `ls`, `find` → `Glob` tool
- `cat`, `head`, `tail` → `Read` tool
- `grep` → `Grep` tool
- `sed`, `awk` → `Edit` tool
- File writing → `Write` tool
- `curl` → `WebFetch` tool

# Language Settings
- Responses: `.claude/settings.json` - `language`
- Thinking: English (for token reduction)
