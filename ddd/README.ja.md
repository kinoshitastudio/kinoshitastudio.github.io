```
 ██████╗  ██████╗  ██████╗
 ██╔══██╗ ██╔══██╗ ██╔══██╗      DENSITY · DAILY · DESIGN
 ██║  ██║ ██║  ██║ ██║  ██║      ──────────────────────────────
 ██║  ██║ ██║  ██║ ██║  ██║      1日5タスク・順番にだけ進む・365日
 ██████╔╝ ██████╔╝ ██████╔╝      v1.2 · kinoshita studio · 2026
 ╚═════╝  ╚═════╝  ╚═════╝       updated: 2026-04-22
```

<p align="center">
  <a href="./README.md">English →</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/stack-vanilla_JS-0B111F?style=flat-square" alt="stack">
  <img src="https://img.shields.io/badge/deps-tailwind_cdn-0B111F?style=flat-square" alt="deps">
  <img src="https://img.shields.io/badge/storage-localStorage-E13437?style=flat-square" alt="storage">
  <img src="https://img.shields.io/badge/offline-first-E13437?style=flat-square" alt="offline">
  <img src="https://img.shields.io/badge/license-MIT-0B111F?style=flat-square" alt="license">
</p>

---

**「5つで十分」** と知っている人のための、儀式のようなタスクアプリ。
HTML 1枚。順番にしか進めない。365日のピクセル密度グリッド。
**クラウドなし。アカウントなし。連続記録の強迫観念もなし — ただの鏡。**

```
open app.html
```

インストールはこれだけ。

---

## ルール

```
1日最大5タスク         はみ出たら「明日の考え」にしまう
上から順番にしか進まない 2番目は1番目を終えるまでロック
持続時間は1〜180分     タイマーは設定した分だけ走る
今日は動く、過去は残る  完了済みの日は読み取り専用
グリッドが全部見ている  密な週は光り、薄い週は薄いまま
```

---

## v1.2 の機能

```
FOCUS              今日の5つ + 日付ナビ · 未来を計画、過去を棚卸し
                   インライン編集 · 1分〜180分 · 順次アンロック

LOG                365日のピクセル密度グリッド（GitHub風・墨と赤）
                   連続記録 · ベスト日 · 稼働日数
                   セルをタップで FOCUS へジャンプ
                   ピクセル装飾（新）— 曜日アイコン × 季節レイヤー

TIMER              タイムタイマー風 · 赤い扇形が時計回りに減る
                   文字盤: 60 / 15 / 30 / 45（時計回り）
                   15分チャイム（新）— 優しい2音ベル
                   残り10秒カウントダウン（新）— 毎秒「ピッ」
                   START · STOP · COMPLETE

TERMINAL           PCは右ドック / モバイルは下ドック
                   端をドラッグでリサイズ · localStorage に保存
                   コマンド: log / focus / timer / start / stop / dur /
                             task / reset / clear / bgm / birthday /
                             about / help

BGM（新）          3種のプロシージャル音源を WAV レンダリング → <audio>
                   1: パッド · 2: ローファイビート · 3: 雨 + 鐘
                   モバイルで画面OFFでも再生継続（bgm on / off / 1 / 2 / 3）

LOG 装飾（新）     曜日のベースアイコン × 季節 / 時刻 / 記念日 レイヤー
                   月:花 · 火:チューリップ · 水:向日葵 · 木:薔薇
                   金:猫 · 土:鳥 · 日:魚
                   3-4月:桜 · 6月:雨 · 7-8月:蛍（夜）
                   10-11月:紅葉 · 12-2月:雪 · 1/1-3:初日の出
                   22-5時:夜空と月 · 5-8時:朝焼け
                   7日連続:火花 · 30日連続:グロー · 誕生日:紙吹雪

CALENDAR           独自カレンダー · 任意の日をタップでジャンプ
                   緑ドット=タスク有り · 明るい=全完了

TOUCH              左右スワイプでビュー切替（モバイル）
                   iPhoneのセーフエリア対応
```

---

## 哲学

**5つまで。** それ以上は「計画」ではなく「願望」。
**順番。** 飛ばせない — 最初を終えるか、生き方を変えるか。
**数ではなく密度。** グリッドが評価するのは「現れた日」、完璧さではない。
**ローカル。** データは自分のディスクに。サーバーも同期もスパイもなし。
**引き算。** 1ファイル。Tailwind CDN と少しの CSS。ビルド工程ゼロ。

---

## クイックスタート

```sh
# インストール不要。そのまま開く:
open app.html

# またはローカルサーバー（Safari推奨）:
python -m http.server 8000
# → http://localhost:8000/app.html
```

---

## ターミナルコマンド

```
> log / focus / timer    ビュー切替
> stats                  今日 + 履歴
> start / stop           タイマー制御（0秒でタスク完了）
> dur <min>              タイマー時間を設定（15 / 25 / 45 / 60 / 1-180）
> task <n> <text>        タスクn（1-5）を設定
> reset                  今日をリセット（緊急脱出口）
> clear                  ターミナル出力をクリア
> bgm on / off           BGM オン/オフ
> bgm <1|2|3>            1:パッド · 2:ローファイビート · 3:雨+鐘
> birthday MM-DD         誕生日を設定（その日に紙吹雪）; "off" で解除
> about                  アプリ紹介
> help                   コマンド一覧
```

---

## LOG 装飾レイヤー（v1.2）

LOG下部の小さなアイコンは、もう固定の花ではありません。
**曜日のベース**に**季節 / 時刻 / 記念日**の演出が重なります。
すべて純 CSS アニメーション、DOM 約20ノード、依存ゼロ。

```
BASE        曜日ごとに7種の SVG を循環
            （月=花 → 日=魚）

SEASONAL    3-4月   桜の花びら          10-11月  紅葉
            6月     雨                   12-2月   雪
            7-8月   蛍（夜のみ）         1/1-3    初日の出

TIME        5-8時   暖色の朝焼け
            22-5時  薄暗いオーバーレイ + 月 + 星

MILESTONE   7日連続   放射状の火花
            30日連続  暖色グロー + 大きめ火花
            誕生日    5色の紙吹雪
```

`animations.html` に全レイヤーのライブカタログあり。

---

## TIMER の音（v1.2）

```
chime     15 / 30 / 45 分経過時に発動（サイン波 880 → 1319 Hz）
          タイマー終了と境界が一致する場合はスキップ
countdown 残り 10 / 9 / 8 ... 1 秒で「ピッ」（矩形波 1200 Hz, 120ms）
          0 秒は鳴らない（完了トーストに譲る）
```

AudioContext は **START ボタン押下**（ユーザー操作）で初期化されるので
iOS Safari でも再生が解禁されます。音はフォアグラウンドのみ
（`setInterval` はバックグラウンドで大幅に間引かれるため）。

---

## ショートカット

```
Enter              送信（新規タスク / 編集保存 / コマンド実行）
Esc                カレンダーを閉じる / 編集キャンセル
↑ / ↓              ターミナルの履歴
←/→ スワイプ        次/前のビュー（モバイル）
ターミナル端をドラッグ  パネルをリサイズ
```

---

## データ構造

```
localStorage / ddd.v2
├── day        YYYY-MM-DD  （日付切替検出用）
├── tasks      [{ text, done }, ...]   （5スロット）
├── log        { 'YYYY-MM-DD': 件数, ... }
└── timer      { duration }

localStorage / ddd.birthday       MM-DD（任意）
localStorage / ddd.bgm            '1' | '2' | '3' | 'off'
localStorage / ddd.term.w|h       ターミナルサイズ
```

ブラウザの外には何も出ません。

---

## ファイル構成

```
ddd/
├── app.html          ← 本体・1ファイル・全機能
├── index.html        ← ランディングページ
├── animations.html   ← 季節 / 時刻 / 記念日 カタログ
├── og-image.svg      ← OGP 画像（1200×630）
├── flower.svg        ← 月曜のベース
├── tulip.svg         ← 火曜のベース
├── sunflower.svg     ← 水曜のベース
├── rose.svg          ← 木曜のベース
├── cat.svg           ← 金曜のベース
├── bird.svg          ← 土曜のベース
├── fish.svg          ← 日曜のベース
├── favicon.svg
└── README.md / README.ja.md
```

---

## スタック

```
描画         HTML + CSS grid + SVG sector path + CSS keyframes
音声         WebAudio（oscillator · OfflineAudioContext）→ WAV Blob
             → HTMLAudioElement（モバイル画面OFF対応）
入力         pointer + touch · スワイプ · キーボード（enter / esc / ↑↓）
保存         localStorage（ddd.v2 · ddd.birthday · ddd.bgm）
スタイル     Tailwind CDN + インライン CSS トークン
フォント     Space Mono（Google Fonts）
```

---

## デプロイ

GitHub Pages。ビルドも CI も設定も不要。Push して終わり。

---

## 連絡先

```
studio     →  kinoshita studio · 滋賀 · 日本
x          →  @ddddotdotddd           x.com/ddddotdotddd
feedback   →  blackmirror.board@gmail.com   （共有スタジオ受信箱）
              subject: DDD Feedback
```

---

<p align="center">
  <em>1日5タスクで、カオスを遠ざける。— kinoshita studio / 2026-04-22</em>
</p>
