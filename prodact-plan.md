# カードリンクプレビュー プロダクト仕様書

Oct 3, 2026 · @Hol1kgmg

## 概要

自分のサイトのURLを入力すると、OGP・Xカード・oEmbedの3種類のカードリンクが正しく表示されるかを1画面で判定するWebアプリを作る。公開前や更新後に、SNSやブログカードでの見え方と不具合をすぐ確認できることが目的。

| 項目 | 内容 |
| --- | --- |
| 対象ユーザー | サイトの作成者本人 |
| チェック対象 | 自分のサイトのページ（許可ドメインに限定） |
| 対応カード | OGP / Xカード / oEmbed |
| 対象外（初版） | 複数URLの一括チェック、履歴保存、JSON-LDの検証、JS実行後のHTMLの解析 |
| デプロイ先 | Cloudflare Workers |

## 機能要件

画面は1ページで、URL入力欄の下にOGP・Xカード・oEmbedの3セクションを縦に並べる。XカードがOGPにフォールバックする関係が読み取れるよう、この順番で固定する。

**入力エリア**

- URL入力欄と「チェック」ボタン
- 入力値が不正な場合（URL形式でない、許可外のドメイン）は、送信前にエラーを表示
- チェック中はボタンを無効化し、ローディングを表示

**各セクションの表示内容**

1. 判定バッジ（OK / 警告 / NG）
2. カードのプレビュー（各サービスでの見え方を再現）
3. 問題点のリスト（修正方法のヒント付き）
4. 検出したタグの一覧（タグ名と値）

**プレビューの種類**

| セクション | プレビューの形 |
| --- | --- |
| OGP | 横長画像＋タイトル＋説明＋ドメイン（Facebook・Slack風） |
| Xカード | `summary` は小さい正方形画像、`summary_large_image` は大きい横長画像 |
| oEmbed | エンドポイントが返したタイトル、サムネイル、作成者名を使ったブログカード風 |

プレビューは各サービスの表示を完全に再現するものではなく、「画像・タイトル・説明が正しく拾われているか」を目で確認するためのものとする。

## 判定ルール

各セクションの判定は、NGが1件でもあればNG、NGがなく警告があれば警告、どちらもなければOKとする。NGは「カードが表示されない・壊れる」もの、警告は「表示はされるが品質が下がる」もの。

**OGP**

| チェック項目 | 判定 |
| --- | --- |
| `og:title` がない | NG |
| `og:image` がない | NG |
| `og:image` を取得できない（404など） | NG |
| `og:image` が相対パス | NG |
| `og:image` が `http://`（非HTTPS） | 警告 |
| 画像の幅が600px未満 | 警告 |
| 画像の比率が1.91:1から大きくずれる | 警告 |
| `og:description` がない | 警告 |
| `og:url` がない、またはリダイレクト後の実URLと不一致 | 警告 |
| `og:type` 、`og:site_name` がない | 警告 |

**Xカード**

| チェック項目 | 判定 |
| --- | --- |
| `twitter:card` がない | 警告（`summary` として扱われる） |
| `twitter:card` の値が不正 | NG |
| タイトルが `twitter:title` と `og:title` のどちらにもない | NG |
| `summary_large_image` なのに画像がない・取得できない | NG |
| `summary_large_image` の画像比率が2:1から大きくずれる | 警告 |
| 画像の容量が5MBを超える | NG |

XカードのタグがなくOGPで代用された項目は、問題とはせず「フォールバック」として表示する。

**oEmbed**

| チェック項目 | 判定 |
| --- | --- |
| discoveryタグ（`application/json+oembed`）がない | 警告（未対応として表示） |
| エンドポイントが200以外を返す | NG |
| レスポンスがJSONとして解析できない | NG |
| `version` が `1.0` でない、または `type` がない | NG |
| `type` に応じた必須項目がない（`rich` / `video` は `html`・`width`・`height`、`photo` は `url`・`width`・`height`） | NG |
| `title` や `thumbnail_url` がない | 警告 |

判定基準の数値（推奨サイズや容量上限）は各サービスの仕様変更で変わるため、`lib/checkers/rules.ts` に定数としてまとめ、実装時に公式ドキュメントで確認する。

## 技術スタックとアーキテクチャ

画面はViteでビルドしたReactのSPAとし、Cloudflare Workersの静的アセット配信で届ける。BFFは同じWorkerの `fetch` ハンドラが `POST /api/check` を直接処理する。SSRは不要なためフレームワーク（Next.js等）は使わない。ブラウザは外部サイトに直接アクセスせず、BFFが取得・判定・整形までを担う。

| 領域 | 採用技術 |
| --- | --- |
| ツールチェーン | Vite+（`vp`：vite / vitest / lint / format を一本化）、TypeScript |
| フロント | React（SPA、ルーターなし） |
| BFF | Workerの `fetch` ハンドラ（`worker/index.ts`）。ルートは1本なのでルーターは使わない |
| 実行環境 | Cloudflare Workers + 静的アセット（`wrangler` の `assets` 設定、`run_worker_first: ["/api/*"]`） |
| HTML解析 | `HTMLRewriter`（Workers標準。`<head>` 内の `meta` / `link` の属性を収集するだけ） |
| 画像サイズ判定 | `image-size`（画像の先頭バイトから判定） |
| スタイル | 素のCSS（1画面のため。Tailwindは必要になったら追加） |
| テスト | Vitest + `@cloudflare/vitest-pool-workers`（workerd上で動かし、`HTMLRewriter` や `fetch` をそのままテスト） |

ルートが3本以上になったら Hono、ページが2枚以上になったら TanStack Router を検討する。それまでは入れない。

&#91;embedded content: アーキテクチャ · BFFの4ステップと外部の取得先\]

②で取得したHTMLから画像URLとoEmbedのエンドポイントがわかるため、③は②の後に実行する（③の中の画像とoEmbedは並列で取得）。

## API仕様

BFFのエンドポイントは `POST /api/check` の1本で、OGP・Xカード・oEmbedの結果を1回のレスポンスで返す。型は `lib/types.ts` に置き、フロントとBFFで共有する。

**リクエスト**

```json
{ "url": "https://example.com/post/1" }
```

**レスポンスの型**

```ts
type Status = "ok" | "warn" | "ng";

type Issue = {
  level: "warn" | "ng";
  code: string;      // 例: "OG_IMAGE_RELATIVE"
  message: string;   // 画面に出す説明
  hint?: string;     // 修正方法
};

type ImageInfo = {
  url: string;
  reachable: boolean;
  width?: number;
  height?: number;
  bytes?: number;
  contentType?: string;
};

type CheckResponse = {
  requestedUrl: string;
  finalUrl: string;          // リダイレクト後
  fetchedAt: string;         // ISO 8601
  ogp: {
    status: Status;
    tags: Record<string, string>;
    image?: ImageInfo;
    issues: Issue[];
  };
  twitter: {
    status: Status;
    cardType: string;          // summary / summary_large_image など
    tags: Record<string, string>;
    fallbacks: string[];       // OGPで代用した項目
    image?: ImageInfo;
    issues: Issue[];
  };
  oembed: {
    status: Status;
    endpoint: string | null;
    data: Record<string, unknown> | null;
    issues: Issue[];
  };
};
```

**エラーレスポンス**

| HTTPステータス | 発生条件 | `error.code` |
| --- | --- | --- |
| 400 | URLの形式が不正 | `INVALID_URL` |
| 403 | 許可ドメイン外 | `DOMAIN_NOT_ALLOWED` |
| 502 | 対象ページが200以外を返した、またはHTMLではなかった | `UPSTREAM_ERROR` |
| 504 | 対象ページの取得がタイムアウト | `UPSTREAM_TIMEOUT` |

エラー時の本文は `{ "error": { "code": string, "message": string } }` とする。画像やoEmbedの取得失敗はエラーレスポンスにせず、各セクションの `issues` に入れて200で返す。

## ディレクトリ構成

取得（fetchers）と判定（checkers）を分け、判定ロジックはネットワークに依存しない純粋関数にする。これにより、判定ルールはHTML文字列を渡すだけで単体テストできる。

```
index.html                 Viteのエントリ
src/                       フロント（React SPA）
  main.tsx
  App.tsx                  画面本体：URL入力の下に3セクション
  components/
    UrlForm.tsx            URL入力とボタン
    ResultSection.tsx      バッジ・問題点・タグ一覧の共通枠
    previews/
      OgpPreview.tsx
      TwitterPreview.tsx
      OembedPreview.tsx
worker/
  index.ts                 BFF本体：POST /api/check → 入力検証 → 取得 → 判定 → 整形
lib/                       フロントとWorkerで共有
  types.ts                 フロントとBFFで共有する型
  security/
    validateUrl.ts         URL形式・許可ドメインの検証
  fetchers/
    fetchHtml.ts           HTML取得（タイムアウト・サイズ上限付き）
    fetchImage.ts          画像の取得可否とサイズ判定
    fetchOembed.ts         oEmbedエンドポイントの取得
  parsers/
    parseMeta.ts           metaタグとlinkタグの抽出（HTMLRewriter）
  checkers/
    rules.ts               判定基準の定数
    checkOgp.ts
    checkTwitter.ts
    checkOembed.ts
    summarize.ts           issues から status を決める
__tests__/
  checkers/                判定ロジックの単体テスト
  fixtures/                テスト用のHTML
wrangler.jsonc             Cloudflare設定（assets、run_worker_first、許可ドメインなどの環境変数）
vite.config.ts             Vite / Vitest（workers pool）設定
```

## 非機能要件・セキュリティ

最優先は、BFFが任意のURLへアクセスする「踏み台」として悪用されること（SSRF）を防ぐこと。そのため、チェックできるURLを許可ドメインに限定する。

| 項目 | 仕様 |
| --- | --- |
| 許可ドメイン | 環境変数 `ALLOWED_HOSTS`（カンマ区切り）で指定。ページ本体は許可ドメインのみ取得する |
| リダイレクト | 自動追従せず手動で最大5回まで追う。移動先も毎回許可ドメインか確認する |
| 画像・oEmbedの取得先 | CDNなど別ドメインの場合があるため、`ALLOWED_ASSET_HOSTS` で別途許可する |
| プロトコル | `https:` と `http:` のみ。IPアドレス直接指定と `localhost` は拒否 |
| タイムアウト | HTML 5秒、画像・oEmbed 各5秒（`AbortSignal.timeout` を使用） |
| サイズ上限 | HTMLは先頭2MBまで読む。画像はサイズ判定に必要な先頭部分だけ読み、容量は `Content-Length` で確認 |
| User-Agent | 独自のUA（例：`CardLinkChecker/1.0`）を付ける。SNSクローラーのUAを切り替える機能は初版では入れない |
| レート制限 | 初版は無し。外部公開する場合はCloudflareの Rate Limiting ルールで対応 |
| アクセス制限 | 自分だけが使う前提なら Cloudflare Access で保護すると安全 |

実行環境はCloudflare Workersのため、Node.js専用のライブラリ（`jsdom` など）は使わず、Web標準の `fetch` と Workersで動くライブラリに限定する。

## 未決事項と今後の拡張

**未決事項**

- [ ] 許可ドメイン（`ALLOWED_HOSTS`）に入れる自分のサイトのドメイン
- [ ] 画像を配信しているCDNのドメインの有無
- [ ] アプリをCloudflare Accessで自分専用にするかどうか
- [ ] Vite+ 同梱のVitestと `@cloudflare/vitest-pool-workers` のバージョン互換（初期セットアップ時に `vp test` で確認。合わなければVitestを単体で入れる）

**決定済み**

- HTML解析は `HTMLRewriter`（`cheerio` は不採用。workers pool でテストできるため）
- Next.js / OpenNext、TanStack Redact は不採用

**今後の拡張候補**

- sitemap.xml を読み込んで全ページを一括チェック
- チェック結果の履歴保存（Cloudflare D1 や KV）
- JSON-LD（構造化データ）の検証を追加
- SNSクローラーのUser-Agentで取得し、UAごとの差分を表示
- デプロイ時にCIから自動チェック
