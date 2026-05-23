# 木下デザインパターン集
このファイルはClaude Codeが毎セッション自動で読む。
ここに書いたパターンを初期値として使い、毎回ゼロから修正させない。

---

## LP / Webサイト

### カラーシステム（ティール系 確定）
```css
:root {
  --teal:       #3ACFC6;
  --teal-dark:  #2C9D96;
  --teal-deep:  #1E7A75;
  --teal-pale:  #e4f9f1;
  --teal-light: #90e2dc;
  --teal-mid:   #b8f0ea;
  --bg:         #f7fffe;
  --white:      #ffffff;
  --text:       #1a2e2c;
  --text-mid:   #4a6260;
  --text-light: #8faaaa;
  --border:     #d8f0ee;
  --shadow-sm:  0 2px 8px rgba(44,157,150,.08);
  --shadow-md:  0 8px 32px rgba(44,157,150,.12);
  --shadow-lg:  0 20px 60px rgba(44,157,150,.16);
  --grad-hero:  linear-gradient(160deg, #eafcfa 0%, #c8f5f0 40%, #90e2dc 100%);
  --grad-teal:  linear-gradient(135deg, #3ACFC6, #2C9D96);
  --grad-soft:  linear-gradient(180deg, #f7fffe 0%, #eafcfa 100%);
  --radius-sm:  8px;
  --radius-md:  16px;
  --radius-lg:  24px;
  --radius-xl:  32px;
}
```

### フォント（確定）
```css
/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Noto+Sans+JP:wght@200;300;400;500;600;700;800&display=swap');

body {
  font-family: 'Noto Sans JP', sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.7;
}
/* 数字・英字アクセント: font-family: 'Lato' */
```

### Hero KV — デスクトップ（全高フルブリード 確定）
イラストを右カラム全体に引き伸ばして底から飛び出させる方式。

```css
.hero {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  min-height: calc(100vh - 64px); /* 64px = header height */
  padding: 72px 0 0 64px;
  overflow: hidden;
}
.hero-right {
  position: relative;
  align-self: stretch;
  overflow: hidden;
  z-index: 1;
}
.kv-container {
  position: absolute;
  inset: 0;
}
.kv-img-wrap {
  position: absolute;
  bottom: 0; right: -20px;
  height: 110%;
  width: auto;
  z-index: 2;
}
.kv-img-wrap img {
  height: 100%;
  width: auto;
  display: block;
  filter: drop-shadow(-20px 0 48px rgba(44,157,150,.1));
}
```
**注意:** `mix-blend-mode: multiply` は使わない。背景透過PNG + `drop-shadow` に統一。

### Hero KV — モバイル（ネガティブマージン方式 確定）
`position: absolute` は使わない（gridの行高が0になる）。
通常フロー + ネガティブマージンでクロップする方式に確定。

```css
@media (max-width: 768px) {
  .hero {
    grid-template-columns: 1fr;
    padding: 96px 24px 0;
    gap: 0;
    min-height: auto;
    align-items: start;
  }
  .hero-left {
    text-align: center;
    align-items: center;
    display: flex;
    flex-direction: column;
    padding-bottom: 32px;
  }
  .hero-actions { justify-content: center; }

  /* イラスト — ネガティブマージンで上半身クロップ */
  .hero-right {
    display: block;
    overflow: hidden;
    height: 360px;
    margin-top: 36px;
    position: static;
    align-self: auto;
  }
  .kv-container { position: static; display: block; width: 100%; }
  .kv-img-wrap {
    display: block;
    position: static;
    width: 340%;
    margin-left: -210%;
    margin-top: -240px;
  }
  .kv-img-wrap img { display: block; width: 100%; height: auto; }
}
```
**位置調整の目安:**
- 左右: `margin-left` を変える（-210% = 中央より少し左）
- 上下: `margin-top` を変える（-240px = 上半身が見える位置）
- サイズ: `width` を変える（340% = 画面幅の3.4倍で大きく）

### ヘッダー（確定）
```css
header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  height: 64px;
  padding: 0 48px;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid rgba(58,207,198,.12);
}
```

### セクション余白（確定）
```css
.section { padding: 96px 48px; }
.section-inner { max-width: 1100px; margin: 0 auto; }
```

### ボタン（確定）
```css
/* プライマリ CTA */
.btn-primary {
  display: inline-flex; align-items: center; gap: 10px;
  background: var(--grad-teal);
  color: #fff; font-size: 18px; font-weight: 700;
  padding: 20px 56px;
  border-radius: 999px;
  box-shadow: 0 12px 40px rgba(58,207,198,.4);
  transition: transform .2s, box-shadow .2s;
}
.btn-primary:hover { transform: translateY(-3px); }

/* セカンダリ */
.btn-secondary {
  display: inline-flex; align-items: center; gap: 8px;
  color: var(--teal-dark); font-weight: 600; font-size: 15px;
  text-decoration: none;
  border: 2px solid var(--teal);
  padding: 14px 32px;
  border-radius: 999px;
}
```

---

## コピー・トーン

### ユーザー向けサービスLP
- キャッチコピー: 体言止め・短文・感情に寄り添う
  - 例:「気持ちをひとりで抱えないで。」「いつでも、あなたのそばに。」
- サブコピー: 15〜20字程度、具体的な価値を一言で
- CTAボタン: 「無料ではじめる」「今すぐ試す」（費用感を先に示す）
- 数字・実績: 信頼バー（Trust Bar）でファーストビュー直下に配置

### 企業向けLP
- キャッチコピー: 課題解決・ROI訴求
- トーン: 信頼感・専門性・数字で語る

---

## KVイラスト候補サイト
- **storyset.com** — mental health / feelings 検索、背景なしPNG書き出し可
- **undraw.co** — SVG、カラー変更可
- **loosedrawing.com** — 日本人キャラ、商用無料

背景透過PNGが手に入ったら `rembg` 不要。
背景ありPNGには rembg で除去してから使う:
```bash
python3 -c "
from rembg import remove
with open('kv.png','rb') as f: data=f.read()
open('kv_nobg.png','wb').write(remove(data))
"
```

---

## ローカルサーバー
```bash
cd ~/Desktop/figma
python3 -m http.server 8001
```
| 環境 | URL |
|------|-----|
| Mac | http://localhost:8001/dashboard.html |
| 自宅iPhone | http://192.168.0.10:8001/dashboard.html |
| 外出iPhone (Tailscale) | http://100.107.218.60:8001/dashboard.html |

---

## 制作ファイル一覧（~/Desktop/figma/）
| ファイル | 概要 |
|---------|------|
| `corocare.html` | 紫グラデ・企業向けトーン・kv_nobg.png全高ブリード |
| `index2.html` | ティール版・kv_nobg.png全高ブリード |
| `index3.html` | ティール + CSSフォンモックアップKV |
| `index5.html` | ユーザー向け最高品質版・CSSフォンモックアップ ★BEST |
| `index5b.html` | index5のKVをkv_nobg.pngに差し替え ★BEST |
| `dashboard.html` | 全バリアント一覧ダッシュボード |

---

## TODO（次セッションで試すこと）
- [ ] html.to.design で corocare.html / index5.html を試す → 再現精度を確認
- [ ] 再現できない部分を記録 → 補完戦略を決める
