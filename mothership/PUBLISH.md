# Mothership — Figma Community 公開準備 (#14)

> このファイル＝Community掲載のコピー＆手順の正本。掲載フォームにそのまま貼れる形でまとめてある。
> 方針：まず **B案（Org内・私的公開／審査不要）でテスト → A案（Community本公開）**。
> 対象＝**パワーユーザー**（Claude Code Pro/Max ＋ Figma ＋ Node ＋ relay 起動が前提）。

---

## 1. アセット（作成済み・ドラフト）
| 用途 | 仕様 | パス | 状態 |
|---|---|---|---|
| アイコン | 128×128 PNG | `assets/community/icon.png` | ✅ 近黒角丸＋金∞ |
| カバー | 1920×960 PNG | `assets/community/cover.png` | ✅ ∞＋MOTHERSHIP＋tagline |
| （元データ） | SVG | `assets/community/icon.svg` / `cover.svg` | 編集用。再書き出しは下記コマンド |

**再書き出しコマンド**（mac標準qlmanage）:
```sh
cd assets/community
qlmanage -t -s 128  -o . icon.svg  && mv icon.svg.png icon.png
qlmanage -t -s 1920 -o . cover.svg && sips -c 960 1920 cover.svg.png --out cover.png && rm cover.svg.png
```
※カバーSVGは 1920×1920 正方canvasの中央960バンドに描画→中央クロップ（qlmanageの正方パディング対策）。
※**本番はMothership自身でFigmaボード生成→書き出しが映える**（CLAUDE.md方針）。今のPNGは審査を通せる品質のドラフト。

---

## 2. 掲載コピー（EN ＝ 主 / JP ＝ 副）

### Name
`Mothership`

### Tagline（1行・〜なるべく短く）
- **EN:** Chat your way to real, editable Figma nodes.
- **JP:** チャットから、編集できる本物のFigmaノードへ。

### Description（本文）

**EN**
> **Mothership turns one source-of-truth JSON into real, editable Figma nodes — driven by Claude Code, no MCP.**
>
> Talk to it in plain language and your design gets built: text, auto layout, corner radii, gradients, tokens — all as native layers you can keep editing. Not a pasted SVG blob.
>
> **How it works**
> A tiny zero-dependency relay (`node relay.js`) watches a single `mothership.json`. Claude Code (Pro or Max) edits that file; this plugin renders it natively into Figma and keeps it in sync. The intelligence is your Claude Code subscription — no separate API key, no extra billing.
>
> **Three faces, one panel**
> • Chat — generate and revise by talking.
> • Polish (studio) — overlay a reference image and nail whitespace & type by the numbers.
> • Library — store polished patterns and pour them back into Figma.
>
> **You need**
> Claude Code (Pro or Max) · Figma · Node.js. Setup is ~3 minutes (steps below).
>
> *Judgment is human. Translation is AI.*  — Kinoshita Studio

**JP**
> **設計の唯一の原本(JSON)を、編集できる本物のFigmaノードへ。Claude Codeが翻訳、MCP不要。**
>
> 普通の言葉で話しかけるとデザインが建つ——テキスト・オートレイアウト・角丸・グラデ・トークンまで、すべて編集可能なネイティブレイヤーで。SVG貼り付けの“塊”ではありません。
>
> **仕組み**：依存ゼロの小さなrelay(`node relay.js`)が `mothership.json` を監視。Claude Code(Pro/Max)がそのファイルを編集し、本プラグインがFigmaにネイティブ生成して同期し続けます。頭脳はあなたのClaude Codeサブスク＝別APIキー不要・追加課金なし。
>
> **ひとつのパネルに3つの面**：チャット（話して生成・修正）／詰める studio（参照画像を重ねて余白とタイポを数値で詰める）／ライブラリ（詰めたパターンを貯めてFigmaへ流し込む）。
>
> **必要なもの**：Claude Code(Pro/Max)・Figma・Node.js。セットアップ約3分。
>
> *判断は人、翻訳はAI。* — 木下スタジオ

### Setup（掲載本文末尾 or 最初のコメントに）
```
1) Figma → Plugins → Development → Import plugin from manifest… → mothership/manifest.json
2) Terminal:  cd mothership && node relay.js   ( → http://localhost:4575 )
3) Run the plugin → press “Connect” next to http://localhost:4575
4) Type: “make a simple 3-plan pricing table.”  → it builds natively in Figma.
```

### Category（候補）
`Productivity` または `Design tools`（AI/automation寄り）。

### Tags（候補）
`AI` `automation` `design systems` `JSON` `auto layout` `Claude` `generative` `productivity` `developer`

### Support contact
`https://kinoshita.studio/#contact`

### Website
`https://kinoshita.studio/mothership/`

---

## 3. networkAccess（審査ポイント・判断材料）
- **現状（2026-06-23 変更）：`allowedDomains: ["http://localhost:4575"]`**。reasoning を「生成本体はネットワーク不要・通信はライブモードのrelayのみ」と EN+JP で明確化（manifest.json）。
- 旧 `["*"]` はワイルドカードで審査の減点ポイントだったため (a) に縮退。
  - (a) **採用**：任意URLの画像差し込みは当面オフ（`createImageAsync` は try/catch で握り潰すのでフレーム生成は壊れない）。審査が最も軽い。
  - (b) `*` 維持＋reasoning明記 → 将来、画像機能を売りにするなら戻す。指摘されたら再縮退。
- **判断**：初回公開を通すことを優先し (a)。画像は v2 で復活検討。

---

## 4. 提出チェックリスト
- [x] アイコン128×128 PNG
- [x] カバー1920×960 PNG
- [x] EN+JP 説明文・tagline
- [x] サポート/サイトURL
- [x] manifest reasoning 明確化（EN+JP）
- [ ] **本番アイコン/カバーをMothership自身でFigma生成→差し替え**（任意・品質UP）
- [ ] manifest の `id` 最終確認（現 `mothership-kinoshita-studio`）
- [ ] **B案：Org内 private publish でテスト**（審査不要・実機確認）
- [ ] **再提出：「Notes to reviewer」に §5 の EN/JP 文を貼る**（最重要・取り違え防止）
- [ ] **A案：Community publish**（上記コピー貼付・カテゴリ/タグ選択・送信）
- [ ] 公開後：world.html/guide.html の「申請中」バッジを「公開済み＋導入リンク」に差し替え

---

## 5. 再提出メモ（2026-06-23 拒否 → 対応）
Figmaから**定型のソフト拒否**（具体指摘なし・ガイドラインリンクのみ）。原因＝**レビュアーがセットアップ無しでテストできない**（ライブモードがrelay＋Claude Code前提で、開いても何も動かせない）と判断。対応:
- **① ゼロセットアップのデモ導線を追加**（`ui.html`）：
  - **ヘッダーに常時表示の「⚡ サンプル生成 / Build sample」ボタン**（`#demohead`）＝チャット履歴があっても消えない。どの状態で開いても必ず見える本命の導線。
  - チャット初期画面（`#hello`）にも大きな「**⚡ サンプルをFigmaに生成（セットアップ不要）**」（`#trydemo`）。
  - いずれも `buildSample()` = **postMessageのみ・通信なし**でサンプルを生成。
  - 初回オンボーディングの先頭を「**まず試す**」スライドにし、その場で生成できる `⚡` ボタンを設置。relay/接続/チャットは「**ライブモード（任意）**」に格下げ。
  - → レビュアーは開いて1クリックで本物のネイティブノードが建つ＝機能を即証明。
- **② networkAccess を `["http://localhost:4575"]` に縮小**（上記§3）。
- **③ ブランド表現を中立化**（`ui.html`）：「Claude Codeそのもの／It's Claude Code itself」→「あなたの Claude Code（Pro/Max）と連携／Works with your own Claude Code」。提携誤認の回避。

### 再提出フォームの「Notes to reviewer / レビュアーへの補足」にそのまま貼る
> **EN:** To test instantly, click **“⚡ Build sample”** in the header — it generates native, editable Figma nodes with **no setup, no account, no network**. The chat (“Live” mode) is an **optional** power-user feature that needs a local relay (`node relay.js`) and the user’s own Claude Code subscription; it is **not** required to evaluate the core feature.
>
> **JP:** すぐ試すには、ヘッダーの **「⚡ Build sample」** を押してください。**セットアップ・アカウント・通信なし**で、編集可能な本物のFigmaノードが生成されます。チャット（"Live"モード）はローカルrelay（`node relay.js`）とユーザー自身のClaude Codeサブスクを使う**任意の上級者向け機能**で、コア機能の評価には**不要**です。

- （掲載本文の Setup 冒頭にも「**まず『⚡ Build sample』で動作確認 → ライブモードはrelay起動後**」を1行足すと初手が明確。）

## 6. 再提出メモ②（2026-06-23 拒否＝具体指摘あり → 解消済み）
拒否理由が今回は**具体的**：レビュアー添付スクショ＝起動時に `GET http://localhost:4575/chat-busy net::ERR_CONNECTION_REFUSED` が**大量**。Resource ID `1650150569984509789` / Status solved。

### 原因
`ui.html` の **3つのポーリングが起動時から無条件で走る**：`setInterval(pollChat,1500)` / `setInterval(pollBusy,700)` / 自動接続→`setInterval(poll,1200)`。relay未起動（＝レビュアー環境）だと全部が `localhost:4575` を叩いて `ERR_CONNECTION_REFUSED` をループ出力。`try/catch` してもブラウザは fetch失敗をコンソールに必ず記録するため、**接続するまで一切 fetch しない**しかない。

### 修正（`ui.html` のみ・再審査対象）
- **起動時の自動接続を撤廃** → 起動直後は未接続＝fetchゼロ。
- **「接続」ボタンを疎通確認ファースト** → 押下時に `/pull` を一度だけ試し、relay未起動なら繋がず「待機中」表示（ループ無し）。
- `pollChat`/`pollBusy`/`loadChatLog`/`saveChat`/`navTo`/`chatSend` を **`if(!connected)` でガード**（未接続中は fetch しない）。
- 結果：**レビュアー環境（relay起動なし）でコンソールにプラグイン由来のエラーが一切出ない**（検証済み）。
- 仕様変更：実ユーザーは毎回「接続」を1クリック（オンボーディングStep 2が案内済み）。ゼロエラー保証の唯一の方法。

### 残る表示は全て Figma 本体由来（無害・取れない）
- `[Local fonts] using agent`（`vendor-core…min.js`）＝Figmaのログ。
- ⚠ `Unrecognized feature: 'local-network-access'`（`figma_app_beta…min.js`）＝localhost接続を要求するプラグインにFigmaが付ける iframe許可属性の警告。**relay機能を持つ以上は構造的に出る／エラーではなくwarning**。

### 再Publish の「Release notes / 変更点」にそのまま貼る
> **EN:** Fixed: the plugin no longer makes any network requests on launch, so the console stays clean when the optional local relay isn't running. Live mode now connects only after you click **Connect** (with a one-time reachability check).
>
> **JP:** 修正：起動時にネットワーク要求を一切行わないようにし、任意のローカルrelayが未起動でもコンソールがクリーンになりました。ライブモードは**「接続」を押したときだけ**（疎通確認の上で）つながります。

### 「Notes to reviewer」に1行追記
> The previous console errors on launch are fixed — the plugin makes **zero network requests until you click Connect**. To test the core feature with no setup, just click **“⚡ Build sample”**.

### レビュアー会話スレッド（Figma support request）への返信＝**再申請の送信後**に貼る
**EN:**
> Hi Priscila, thank you for the detailed feedback.
> I've fixed the console errors on launch and just submitted a new version for review.
> Root cause: the plugin was polling the optional local relay (localhost:4575) on startup, which logged connection errors when the relay wasn't running. The plugin now makes zero network requests until the user explicitly clicks "Connect" (with a one-time reachability check), so the console stays completely clean on launch.
> To evaluate the core feature with no setup, just open the plugin and click "⚡ Build sample" — it generates real, editable Figma layers with no relay, no account, and no network.
> Thanks again for your time!

**JP（控え）:**
> Priscilaさん、丁寧なフィードバックありがとうございます。起動時のコンソールエラーを修正し、新バージョンを再申請しました。原因は任意のローカルrelay(localhost:4575)を起動時にポーリングしていたことです。現在は「接続」を押すまで一切ネットワーク要求を行わないため起動時のコンソールは完全にクリーンです。セットアップ不要での確認は「⚡ Build sample」を押すだけで編集可能な本物のFigmaレイヤーが生成されます。

## メモ
- 公開後のアップデートはバージョンを上げて再Publish（初回審査が最重・以降は軽い）。
- Bundle/manifest 以外の `library/` 等は公開バンドルに不要なら同梱しない（Figmaはmanifestで参照されるファイルのみ取り込む）。
