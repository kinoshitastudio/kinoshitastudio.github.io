```
 ███╗   ███╗███████╗██╗  ██╗██╗   ██╗██████╗ ██╗
 ████╗ ████║██╔════╝██║ ██╔╝██║   ██║██╔══██╗██║      日めくり献立
 ██╔████╔██║█████╗  █████╔╝ ██║   ██║██████╔╝██║      ──────────────────
 ██║╚██╔╝██║██╔══╝  ██╔═██╗ ██║   ██║██╔══██╗██║      weekly menu
 ██║ ╚═╝ ██║███████╗██║  ██╗╚██████╔╝██║  ██║██║      local-first
 ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝      kinoshita studio · 2026
```

<p align="center">
  <img src="https://img.shields.io/badge/stack-vanilla_JS-37352f?style=flat-square" alt="stack">
  <img src="https://img.shields.io/badge/deps-tailwind_cdn-37352f?style=flat-square" alt="deps">
  <img src="https://img.shields.io/badge/storage-localStorage-c2410c?style=flat-square" alt="storage">
  <img src="https://img.shields.io/badge/offline-first-c2410c?style=flat-square" alt="offline">
  <img src="https://img.shields.io/badge/license-MIT-37352f?style=flat-square" alt="license">
</p>

---

「今日なにする？」を、もう考えない。

お気に入りを中心に **一週間のリズム** を作るローカル完結型の献立アプリ。
アカウント不要、サーバー不要、HTML ファイル一枚。

```
open index.html     # 製品紹介ページ
open app.html       # アプリ本体
```

---

## 構成（2 ファイル）

```
himekuri_kondate/
├── index.html     ← プロダクト紹介ページ（ランディング）
├── app.html       ← アプリ本体（週間献立 + カタログ + お気に入り）
├── og-image.svg   ← OGP 画像（1200×630）
└── README.md      ← ここ
```

---

## 必須機能（v1.0）

```
レシピカタログ     20 品の日本食レシピ（100 まで拡張可能な構造）
                  主菜 · 丼もの · 一品 · 副菜 · 汁物 に分類

★ お気に入り      ワンタップで登録、サイドバーの上段に固定
                  検索で絞り込み可、カテゴリ別表示

📅 週間カレンダー  月〜日 × 昼・夜 = 14 枠
                  今日の日はヘッダに小さな橙線

💾 週セット保存    名前を付けて localStorage に永続化
                  チップ表示から呼び出し、重複時は確認ダイアログ

💡 ひらめき        お気に入り以外から 3 品をランダム提案
                  マンネリ打破の軽い提案、再ロール可能

✕ クリア           「今週の献立をすべて外す」操作（確認あり）
```

---

## 技術スタック

```
フレームワーク   なし（vanilla JS）
CSS             Tailwind CSS v3 (CDN)
日本語フォント   Noto Sans JP (Google Fonts)
英語フォント     Inter (Google Fonts)
永続化           localStorage キー `mekuri.v1`
絵文字           レシピのビジュアル識別（画像を使わない軽量化）
依存             ゼロ · ビルドなし · サーバーなし
```

---

## データモデル

```
mekuri.v1                                 (localStorage)
├── favs          recipe ID の配列（お気に入り）
├── menu
│   ├── mon.lunch    recipe ID or null
│   ├── mon.dinner   recipe ID or null
│   ├── tue.lunch    ...
│   └── ...          (月〜日 × 昼・夜 = 14 枠)
└── saved
    └── [
          { id, name, menu, savedAt }
        ]

mekuri.landing.lang                       (localStorage · landing only)
└── "en" | "ja"                            (紹介ページの言語設定)
```

**レシピ 1 件**

```js
{
    id: 'r01',              // 不変 ID
    name: '鮭の塩焼き',       // 表示名
    emoji: '🐟',             // 視覚的識別子
    cat: '主菜',             // カテゴリ
    time: 15,                // 調理時間（分）
    tags: ['魚','焼き物']      // 検索用
}
```

カタログは `RECIPES` 配列として `app.html` 冒頭の script ブロックに定義。20 → 100 の拡張はこの配列に追加するだけ。

---

## 使い方

### 30 秒で始める

```
1. app.html を開く
2. サイドバーから気に入ったレシピに ★ を付ける
3. カレンダーの枠をタップ → お気に入りから選ぶ
4. 1 週間埋めたら、名前を付けて「保存」
```

次の週以降、マンネリを感じたら右上の **💡 ひらめき** で
お気に入り以外から 3 品をランダム提案。

### 週セットを使い回す

- `定番の週` — 普段のリズム
- `子どもが好きな週` — 週末や子どもが来る時用
- `夫婦だけの週` — ちょっと凝った時用

保存した週セットはチップで並ぶので、ワンクリックで呼び戻せます。

---

## Notion 的デザイン方針

```
・ 白背景 + 細いグレーの境界線
・ タイポ: Noto Sans JP + Inter
・ 余白たっぷり · ホバーで淡く背景が変わる
・ アクセント色は #c2410c（muted brick）と ★ の #f59e0b のみ
・ 昼は amber 系、夜は indigo 系の淡い背景で 2 食を視覚的に区別
```

---

## ショートカット

```
Enter             名前入力で保存
Esc               ピッカーモーダルを閉じる
(サイドバーの ★ クリック)   お気に入りのトグル
(サイドバーの行クリック)     最初の空き枠へレシピを自動登録
(カレンダー枠クリック)       ピッカーを開く
```

---

## 拡張予定（未実装 · 検討中）

```
─ レシピ数 20 → 100 へ拡充
─ 昼・夜以外の「朝」枠（朝食）を任意で追加
─ 買い物リスト自動生成（選んだ週セットから食材を抽出）
─ 調理メモ・アレルギーフラグ
─ 印刷用レイアウト（冷蔵庫に貼れる A4 サイズ）
─ iCloud / Drive での手動バックアップ（export data）
─ 複数週（今週・来週・再来週）の切替
```

---

## Deploy

GitHub Pages。サーバーなし、ビルドなし、設定なし。

```
https://kinoshita-studio.github.io/mekuri-kondate/
```

---

## Contact

```
feedback    blackmirror.board@gmail.com   (共用スタジオ inbox)
            subject: 日めくり献立 Feedback

studio      kinoshita studio · shiga · japan
x           @bmboards                      x.com/bmboards
instagram   @bmboard.official              instagram.com/bmboard.official
```

---

<p align="center">
  <em>今日の献立を、明日の自分に残す。 — kinoshita studio / 2026-04-21</em>
</p>
