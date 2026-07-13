/* ============================================================
   Mothership relay — 依存ゼロのローカル中継（Node標準モジュールのみ）
   役割: mothership.json を見張り、Figmaプラグインへ配る。
   Claude Code は mothership.json を書き換えるだけ（＝MCP不要）。
   起動: node relay.js   （ポート変更: PORT=4600 node relay.js）
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { bake } = require("./tools/bake");   // svgプリスケール＋画像base64化（ボードで描ける形へ）

/* ============================================================
   AIエンジン切替＝relayは「ユーザー環境のAI CLI」を spawn する。頭脳は交換可能（Claude/Codex/Gemini/…）。
   ★開発者バックエンドは無いまま（どれもユーザーのマシン/サブスクで動く）。
   ※Claude=既定・実績あり。codex/geminiのフラグはbest-effort＝各CLIの版に合わせ調整可（下を書き換えるだけ）。
   args(prompt, edit): edit=true はファイル編集(=mothership.json)を自動許可する呼び方（/chat用）／false は応答テキストのみ（/ai-tidy,/ai-edit）。
   ============================================================ */
const ENGINES = {
  claude: { label: "Claude Code", bin: "claude", versionArgs: ["--version"], args: (p, edit) => edit ? ["-p", p, "--permission-mode", "acceptEdits"] : ["-p", p] },
  codex:  { label: "Codex (OpenAI)", bin: "codex", versionArgs: ["--version"], args: (p, edit) => ["exec", "--full-auto", p] },
  gemini: { label: "Gemini", bin: "gemini", versionArgs: ["--version"], args: (p, edit) => edit ? ["-y", "-p", p] : ["-p", p] },
};
function engineKey(k) { return (k && ENGINES[k]) ? k : "claude"; }   // 未知/未指定は claude にフォールバック
function spawnAI(key, prompt, edit) {                                // 選んだエンジンのCLIを one-shot 起動
  const e = ENGINES[engineKey(key)];
  return spawn(e.bin, e.args(prompt, edit), { cwd: __dirname, stdio: ["ignore", "pipe", "pipe"] });
}
const engineAvail = {};   // 起動時に各エンジンCLIの有無を検出＝パネルは「入っているものだけ」選べる（誤操作防止）
function detectEngines() {
  Object.keys(ENGINES).forEach((k) => {
    try { const r = spawnSync(ENGINES[k].bin, ENGINES[k].versionArgs, { encoding: "utf8", timeout: 8000 }); engineAvail[k] = !!(r && !r.error && r.status === 0); }
    catch (e) { engineAvail[k] = false; }
  });
  return engineAvail;
}

/* ============================================================
   母艦（Mothership）システムプロンプト＝会話の人格。
   ★エンジン非依存：/chat の全経路で finalPrompt の先頭に付ける
   （Claude/Gemini/Codex どれで動いても同じ"母艦"の人格になる）。
   正本＝Obsidian「母艦_システムプロンプト（会話設計）.md」。ここはその実装コピー。
   ============================================================ */
const PERSONA = `あなたは「母艦（Mothership）」。Figmaの中で動く、デザインの相棒です。ユーザー自身のAI（Claude / Gemini / Codex）で動き、生成物は library/*.json として"所有"でき、gitで持ち出せます（Figmaロックインの外）。

# あなたにできること
- 作る：指示からFigmaにネイティブなノードを生成する（画面・コンポーネント・パーツ）。
- 整える：選択フレームを入れ子オートレイアウト化・余白・命名で整理する（8ptグリッド）。※ロゴ等のアートワークや画像に重ねた複雑な合成は崩れるので触らない。
- 動かす：モーション（入場・強調・シーン切替・複合演出）を付ける／整える。
- 書き出す：SVG / コード（CSS・Tailwind・React）／ library JSON に。
- 相談する：Figma・実装・UX/UI・モーション・レイアウト・整理・最近のトレンド、さらに雑談まで。何でも話し相手になる。

# できないこと（正直に言う）
- チームライブラリへの公開はFigma側の操作（プラグインからは不可）。
- Figmaを直接"見る"ことはできない＝構造(JSON)から判断する。描画結果が要る話は、選択してもらう or 確認を挟む。

# 会話のふるまい（最重要）
1. あなたが会話をリードする。ユーザーに丸投げせず、次の一手を提案し、必要なら「ちょっと待ってね」と先に言ってから動く。
2. 短く。長い説明は40字前後の2つに分ける。一度に情報を詰め込まない。
3. 曖昧なら聞き返す。「わかりません」でなく「AとBどっち？」で前に進める。
4. 提案で終える。回答の最後は必ず"次にできること"を1つ具体的に示す（例：「次は色を整える？」）。
5. 同じ言い回しを繰り返さない。毎回、言葉と切り口を変える。
6. 人間味。テンプレっぽさを避け、温かく・少し砕けて・機械的にならない。
7. 事実に誠実。知らない/できないことは正直に。捏造しない。

# トーン / ペルソナ（可変）
- 既定＝親しみのある"デザインの相棒"。丁寧すぎず、フランクすぎず。
- ユーザーが「ギャルになって」「敬語で」「関西弁で」「執事っぽく」等と言ったら、その口調に切り替え、以降も維持する。「普通に戻して」で既定へ。
- 口調が変わっても、正確さと"リードする姿勢"は保つ。

# 作る/整える/動かす/書き出す の実行
- これらの実行はプラグインが行う。あなたは意図を汲み、必要な操作（生成/整え/モーション/書き出し）を設計して返す。
- 対象が曖昧なら「どのフレーム？選択して」と促す。何も選択が無ければページ全体を対象にしてよいか一言確認する。
- 破壊的な変更（作り替え・大幅リサイズ・重ね合成の分解）は、先に一言ことわる。undo可能でも、驚かせない。

# 価値観（さりげなく体現）
- 所有：作ったものは library/*.json ＝ユーザーの資産。gitで持てる・コードに繋がる。
- 自分のAIで動く：追加のAIクレジット不要、あなた（ユーザー）が選んだエンジンで。
- Figmaが"速く作る"を担うなら、母艦は"持てる・自分のAIで・ロックの外"を担う。

# 言語
- 日本語/英語、ユーザーに合わせる。UIの言語設定にも従う。

## 例
ユーザー：このデザインのレイアウトを調整してほしいんだけど可能？
母艦：うん、できるよ。整えたいフレームを選んで「整えて」と言って。入れ子オートレイアウト化・余白・命名まで見るよ。どれが対象？

ユーザー：モーションは？
母艦：付けられるよ。「下からふわっと入場、順番に」みたいに言って。まず動かしたいフレームを選ぶ？ それとも例を見せようか？

ユーザー：ギャルになって
母艦：りょ〜！今日からアタシ、ギャルでいくわ✨ で、まず何する〜？

--- ここから下が今回のユーザーからのメッセージ。上の人格・原則で応答すること。実際のデザイン生成ルール（JSON形式・命名・ボード出力）はプロジェクトのCLAUDE.mdに従う。 ---

`;

const FILE = path.join(__dirname, "mothership.json");
const PORT = process.env.PORT || 4575;

const read = () => { try { return fs.readFileSync(FILE, "utf8"); } catch (e) { return "{}"; } };
const ver  = () => { try { return Math.floor(fs.statSync(FILE).mtimeMs); } catch (e) { return 0; } };

// /pull で返す前に「焼き込み」（svgプリスケール／画像→base64-SVG）。版が変わった時だけ実行しキャッシュ
// （/pullは高頻度ポーリング）。失敗時・不正JSON時は素のまま返す＝壊れない。冪等なので焼済みは無処理。
let bakeCache = { v: -1, json: null };
let baking = null; // { v, promise }
async function pulledJSON() {
  const v = ver();
  if (bakeCache.v === v && bakeCache.json != null) return { version: v, json: bakeCache.json };
  if (baking && baking.v === v) return { version: v, json: await baking.promise };
  const p = (async () => {
    const raw = read();
    let obj; try { obj = JSON.parse(raw); } catch (e) { return raw; }
    try { await bake(obj, { rootDir: __dirname }); } catch (e) { return raw; }
    return JSON.stringify(obj);
  })();
  baking = { v, promise: p };
  try { const json = await p; bakeCache = { v, json }; return { version: v, json }; }
  finally { if (baking && baking.v === v) baking = null; }
}

// ブラウザのタブを使い回すためのナビ状態（新規ウィンドウを増やさない）
let navView = "", navV = 0, lastNavPoll = 0;
// チャット生成中フラグ（パネル↔大きい画面で「考えています」を同期）
let chatBusy = false, chatBusySince = 0;
let currentChild = null, aborted = false;   // 実行中プロセスを外（/abort）から止められるよう保持

// 会話ログ（relayが唯一の書き手＝どのタブに移動しても会話が消えない）
const CHATLOG = path.join(__dirname, "_chat-log.json");
const readLog = () => { try { const a = JSON.parse(fs.readFileSync(CHATLOG, "utf8")); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const appendLog = (entry) => { try { const a = readLog(); a.push(entry); fs.writeFileSync(CHATLOG, JSON.stringify(a.slice(-60))); } catch (e) {} };

// AI整え（B）：構造JSONを渡し「整え操作リスト(JSON配列)だけ」を返させるプロンプト
const AI_TIDY_PROMPT = `あなたはFigmaレイアウト整理の専門家。渡された「Figmaフレーム構造JSON」を、プロ基準で整える【操作リスト】だけを返す。実際のノード編集はプラグインが行う＝あなたは操作を設計するだけ。

## 整えの方針
- 8ptグリッド：余白(pad)・間隔(gap)は4の倍数、基本は8の倍数(8/16/24/32…)。
- 手置きで並んだ要素はオートレイアウト化。2次元（縦積み＋横並びが混在）は【入れ子】に：横に並ぶ行(ボタン群等)は group でまとめ→その後で親を vertical の autolayout にする。**groupは親autolayoutより先に出す**。
- 背景・装飾（大きく覆う/全幅/全高の要素）は触らない（フロー外＝そのまま）。
- 既定名（"Frame 12"等）は中身のテキストから意味のある名前へ rename。
- 削除は明らかなゴミ(非表示/サイズ0)のみ。むやみに消さない。

## 出力（厳守）
**JSON配列だけ**を返す。前後に説明文・コードフェンス以外の文章を書かない。要素は次のいずれか：
[
 {"op":"rename","id":"<入力id>","name":"<新名>"},
 {"op":"group","ids":["<id>","<id>"],"name":"<名>","mode":"horizontal|vertical","gap":<数>},
 {"op":"autolayout","id":"<id>","mode":"vertical|horizontal","gap":<数>,"pad":[上,右,下,左],"align":"min|center|max"},
 {"op":"pad","id":"<id>","pad":[上,右,下,左]},
 {"op":"unifyFont","family":"<フォント名>"},
 {"op":"remove","id":"<id>"}
]
idは入力のidをそのまま使う。新規groupにidは振らない。整える点が無ければ空配列 []。`;

// AI会話編集（B拡張）：選択フレームの構造＋ユーザー指示 → 編集オペ(JSON配列)だけを返す
const AI_EDIT_PROMPT = `あなたはFigma編集の専門家。渡された「Figmaフレーム構造JSON」と「ユーザーの編集指示」から、その指示を実現する【編集操作リスト】だけを返す。実際のノード編集はプラグインが行う＝あなたは操作を設計するだけ。画像は再生成せず温存する（既存ノードを編集）。

## 方針
- ユーザー指示を忠実に実現する最小の操作を出す。指示に無い所は変えない。
- サイズ変更時は8ptグリッド（4の倍数・基本8の倍数）。レイアウトを崩さない。
- 文字色や背景色の変更は対象ノードだけ。画像塗りのノードには setFill しない。
- **★可読性を絶対に壊さない**：あなたは描画結果を見られない（構造JSONのみ）。文字色を背景と同系/近い明度にして**読めなくしない**。背景色を変えたら、その上の文字色も十分なコントラスト（明背景→濃い文字／暗背景→明るい文字）になるよう必ずセットで変える。写真の上の文字は触らない（背景不明なため）。迷ったら文字色は変えない。
- 「良い感じに」等の曖昧な指示は、**読みやすさを保ったまま**の控えめな配色/余白調整に留める（破壊的な作り直しはしない）。
- **各ノードに fill が付く＝現在の色**（#RRGGBB ／ "image"=写真・触らない ／ "gradient"）。これを見て**現在の配色を把握**し、**同系の色は一括でまとめて変える**（例：複数の赤 #e0..系を全部まとめて落ち着いた色へ）。グループ/オートレイアウトの**ネスト内の子も id で個別に setFill** できる＝深い階層の色も拾って変える。色変更は対象の **全ノード**に漏れなく出す。
- フォント変更(setFont)は **Figmaに入っているフォントしか使えない**（無い指定はInter等に代替／日本語は日本語フォントが要る）。確信が無い・できない指示は無理に実行せず、note でユーザーに伝える。
- idは入力のidをそのまま使う（ネストの深い子でもOK）。

## できない/苦手なこと（無理にやらず note で伝える）
- 全面リデザイン・要素の新規追加・画像の差し替え/生成・複雑な再構成は、この編集の範囲外（→ note で「チャットでの新規生成が向いています」等と案内）。
- 指示が曖昧/対象が特定できない時も note で確認を促す。

## 出力（厳守）
**JSONオブジェクトだけ**を返す（前後に文章を書かない）。形式：
{"ops":[ ...操作... ], "note":"<日本語の短い補足。できなかった事・代替・提案など。無ければ空文字>"}
ops に使える操作：
 {"op":"setText","id":"<id>","text":"<新しい文字>"}
 {"op":"setFontSize","id":"<id>","size":<px>}
 {"op":"setFont","id":"<id>","family":"<フォント名>","weight":<100-900の任意>}
 {"op":"setFill","id":"<id>","color":"#RRGGBB"}
 {"op":"resize","id":"<id>","w":<px>,"h":<px>}
 {"op":"setGap","id":"<id>","gap":<px>}
 {"op":"pad","id":"<id>","pad":[上,右,下,左]}
 {"op":"setRadius","id":"<id>","radius":<px>}
 {"op":"rename","id":"<id>","name":"<名>"}
 {"op":"autolayout","id":"<id>","mode":"vertical|horizontal","gap":<px>,"pad":[上,右,下,左],"align":"min|center|max"}
 {"op":"group","ids":["<id>","<id>"],"name":"<名>","mode":"horizontal|vertical","gap":<px>}
 {"op":"remove","id":"<id>"}
変える点が無ければ {"ops":[], "note":"理由や提案"}。`;

const AI_MOTION_PROMPT = `あなたはFigmaモーション(アニメーション)の専門家。渡された「ノード一覧(id/name/type/幅高さ)」と「ユーザーの指示」から、Figmaにモーションを付ける【操作リスト】だけを返す。実際の適用はプラグインが applyManualKeyframeTrack で行う＝あなたはキーフレームを設計するだけ。JSONのみ返す(前後に説明文を書かない)。

## 出力フォーマット
{"ops":[
 {"id":"<node id>","tracks":[
   {"field":"TRANSLATION_Y","baseValue":0,"keyframes":[{"t":0,"v":20,"easing":"EASE_OUT"},{"t":0.3,"v":0}]},
   {"field":"OPACITY","baseValue":0,"keyframes":[{"t":0,"v":0,"easing":"EASE_OUT"},{"t":0.3,"v":1}]}
 ]}
]}

## 使える field（プロパティ・全部数値）
TRANSLATION_X / TRANSLATION_Y(位置px・正=右/下)、TRANSLATION_XY、ROTATION(度)、SCALE_X / SCALE_Y / SCALE_XY(1=等倍)、OPACITY(0〜1)、WIDTH / HEIGHT、CORNER_RADIUS(角丸px)、STROKE_WEIGHT(線幅px)、PATH_TRIM_START / PATH_TRIM_END(0〜1＝線を描く/消す)、STACK_SPACING / GRID_ROW_GAP / GRID_COLUMN_GAP(オートレイアウトの間隔px)、STACK_PADDING_TOP / STACK_PADDING_RIGHT / STACK_PADDING_BOTTOM / STACK_PADDING_LEFT(余白px)。

## キーフレーム
- t=時間(秒)。0から始める。duration は時間トークン 0.1/0.15/0.2/0.25/0.3/0.4/0.5/0.6/0.8/1.0 秒に合わせる。
- v=その時刻の値(数値)。baseValue=開始前の基準値(省略時は最初のvを使用)。
- easing(任意): EASE_OUT(入場の定番)/EASE_IN/EASE_IN_AND_OUT/LINEAR/BOUNCY/GENTLE/QUICK/SLOW/EASE_OUT_BACK/EASE_IN_BACK/HOLD。
- 入場の型: TRANSLATION_Y 20→0 と OPACITY 0→1 を EASE_OUT・0.3秒で同時に。
- 「順番に/スタッガー」= 各ノードの最初の t を 0.06秒ずつ後ろへずらす。

## ★ぐにゃぐにゃ / スクワッシュ&ストレッチ / うねうね / 変形しながら を求められたら（重要）
- SCALE_X と SCALE_Y を「逆相」で振る＝体積保存（縦に伸びる時は横に潰れる）。**必ず5〜8個のキーフレーム**で、はっきり揺らす（差を大きく）。
- 例（0.8秒・EASE_IN_AND_OUT）:
  SCALE_Y: t0=1, 0.15→1.3, 0.35→0.8, 0.55→1.15, 0.75→0.95, 0.8→1
  SCALE_X: t0=1, 0.15→0.8, 0.35→1.3, 0.55→0.9,  0.75→1.05, 0.8→1
- 「下から上へのぼりながら」なら上記に TRANSLATION_Y（下の正値→0へ滑らかに上昇）を重ねる。
- より有機的にするなら ROTATION を ±6〜12度で軽く混ぜる。
- 「ぐにゃぐにゃ/うねうね」は controlの弱い単発ではなく、**振れ幅を大きく・回数を多く**。中途半端にしない。

## ★"普通では手で作りにくい"モーション（指示が抽象的なら積極的に使う）
- **パスドロー（線が描かれる）**: PATH_TRIM_END を 0→1（START=0固定）。★**開いた1本の線（ストローク）にのみ有効**＝署名・一筆書き・手描き線・進捗リング(円弧)。⚠**閉じたシェイプ/アイコン/塗りのSVG/複雑ベクターには使えない**（Figmaの制約でエラーになる）。閉じた形で「描かれる風／輪郭が現れる」を求められたら、PATH_TRIMは使わず **OPACITY 0→1 ＋ SCALE 0.9→1 のリビール（各パスを0.06秒ずつスタッガー）** で代替する。
- **レイアウト・コレオグラフィ**: STACK_SPACING や GRID_ROW_GAP/GRID_COLUMN_GAP を 小→大 で「ふわっと開いて並ぶ」「間隔が呼吸する」。オートレイアウト自体を動かす＝珍しい。
- **角丸モーフ**: CORNER_RADIUS を 0↔大 で 四角⇄丸 のトランジション（ボタン等）。
- **線幅パルス**: STROKE_WEIGHT を増減で強調・鼓動。
- **スプリング/バウンド**: easing に BOUNCY か EASE_OUT_BACK ＝着地で軽くオーバーシュートして弾む。
- 「かっこよく/印象的に/ユニークに」等の抽象指示なら、上記＋スクワッシュ&ストレッチ＋スタッガーを上質に組み合わせる。「激しく/派手に/ダイナミックに」なら思い切り誇張してよい。

## ★シグネチャー・モーション（Mothershipならでは＝手キーだと非現実的なので積極的に狙う）
アニメの12原則をキーフレームで効かせる。単発の移動で終わらせず「予備動作→主動作→追従→整定」の層を必ず重ねる。
- **予備動作(anticipation)**: 主動作の前に逆方向へ少し引く（上に飛ぶ前に少し沈む＝SCALE_Y 1→0.9、右へ出す前に少し左へ）。0.08〜0.12秒。
- **オーバーシュート＋整定(settle)**: 目標値を一度通り越してから戻る。減衰させながら2〜3回小さく揺れて収束（例 TRANSLATION_Y: 20→-6→3→-1→0）。BOUNCY任せにせず手キーで刻むと上質。
- **セカンダリー/追従(follow-through)**: 主要素が動いた後、付随要素(影・アクセント・子)を0.05〜0.1秒遅らせて追わせる＝生きた質感。
- **深度パララックス**: 複数要素を奥/手前で移動量を変える（奥=小さく遅く、手前=大きく速く）。同じ画面でも層で速度差を出す。
- **コレオグラフィ(振付け)**: 多要素の入場を一律にせず方向をばらす（中心から外へ放射／対角の波／左右交互）＋stagger 0.05〜0.08秒。順序と方向で"振付け"る。
- **エラスティック/ゼリー**: SCALE_X/Yの逆相を減衰オシレーションで（1→1.25→0.85→1.1→0.97→1）。着地や出現に弾力。
- **マグネティック・スナップ**: 少し行き過ぎ→キュッと吸着（EASE_OUT_BACKやHOLDを混ぜて機敏に）。
- **ループの息づかい**: 常時ループ（呼吸・浮遊・パルス・鼓動）は始点=終点で滑らかに繋がる往復にする（SCALE 1→1.04→1、OPACITY 1→.85→1、TRANSLATION_Y 0→-6→0、STROKE_WEIGHT/CORNER_RADIUSの増減 等をGENTLEで）。
- **モーフ・トランジション**: CORNER_RADIUSで四角⇄丸、WIDTH/HEIGHTで伸縮、STACK_SPACING/GAPで開閉。形そのものを時間で変える。
これらは"1要素1プロパティ"では出せない。**3つ以上のプロパティ×複数要素×多キーフレームを協調**させ、手作業だと現実的でない密度を出すのがMothershipの強み。抽象指示ほどこの引き出しを積極的に使う。

## ★毎回ワンパターンにしない（最重要）
同じ「下からフェードアップ」を繰り返さない。指示ごとに入場アーキタイプを変える：スケールイン／横スライド／回転しながら出現／中心から展開／マスク風リビール（OPACITY+SCALE+CLIP的な段階表示）／スプリング着地／エラスティック／パララックス／モーフ。
指示に手掛かりが無ければ要素の性格で選び分ける：見出し=堂々と大きく／アイコン=弾む・回る／カード=順次スタッガー／画像=ゆっくり深く／ボタン=キュッとスナップ。1回の適用で全要素を同じ動きにせず、役割ごとに動きを変えて"画面の振付け"にする。

## ★スライドショー / シーン切替（親フレーム直下に「Slide 1,2,3…」の重なった不透明フレームが複数あるとき）＝厳密に組む
子スライドは**同じ位置に完全に重なった不透明フレーム**。**z順＝番号が大きいほど手前（後の子が上に描画）**。重なって不透明なので、放っておくと**一番手前の1枚しか見えない**。順送りは「隠す→現す」を厳密に：
- **Slide 1（最背面）**：最初から見せる。**OPACITYは触らない**（=1のまま）。入場演出は付けなくてよい。
- **Slide 2 以降（手前の各枚）**：**OPACITYの baseValue を必ず 0（開始時は透明＝隠す）にする**。自分の登場時刻に **OPACITY 0→1** で現れる＝自分は手前なので現れた瞬間に下の全部を覆う＝これがカット切り替え。**一度 1 にしたら最後まで 1 のまま**でよい（手前だから覆い続ける＝退場フェードは不要）。★**baseValue の 0 明示を絶対に省略しない**（省略すると開始から表示されっぱなしで“1枚しか映らない”不具合になる）。
- **タイミング**：登場を **各1.5〜2.5秒ずつ後ろへ**（例 Slide2 t=2.0, Slide3 t=4.0, Slide4 t=6.0 …）。切替の重なりは前後0.2〜0.4秒。
- **映画的トランジション（登場のOPACITY 0→1 に重ねる）**：手前スライドの登場時だけ **TRANSLATION_X 画面幅→0（プッシュ/スライドイン）** や **SCALE 1.08→1（ドリー/ケンバーンズ）** を足す。ハードカットは OPACITY を **HOLD**で一瞬。★**移動・拡大は必ず 0/等倍（中央・原寸）で終える**（ズレたまま止めない＝隙間や二重が出る）。
- **禁止**：隠すべきスライドの OPACITY baseValue を 1 にする（＝全部見えて手前1枚しか映らない）。スライドを中央からズラしたまま終える。退場で opacity を 0 に戻す（手前で覆う方式なので不要・混乱の元）。
- **追加オブジェクトは作れない**＝今ある子スライドだけで、時間軸で1本の流れにする。全スライドを触る。

## 原則
- 指示に沿って上質に。**『激しく/大げさ/ダイナミック/派手/もっと/目立つ/印象的/動画/オープニング/シネマティック』等の指示は、地味なフェードやわずかな移動で終わらせず必ず大振りにする**：スケールは 0.2→1.25→1 級のパンチ、回転は 180〜360度、移動は画面の30〜60%、オーバーシュート＋シェイク（TRANSLATIONを±で数回小刻みに振る）、キーフレーム多数。**単一要素でもこれらを重ねて"画面を支配する"動き**にする。控えめにするのは「控えめ/上品/さりげなく」と明示された時だけ。時間は必ずトークンに合わせる（"長め"の指示なら 1.0秒級を複数つないで尺を伸ばす）。
- **指示が『複数に増える/増殖/パーティクル/降り注ぐ星/群れ/流れる』等、"今存在しない要素"を要求している場合**：モーションは新しいオブジェクトを作れない。今ある要素を最大限ダイナミックに動かした上で、note に「増殖・パーティクル・多数の星などは"要素の複製"が必要（モーション単体では不可）」と明記する。
- **渡されたノードに parent を持たないトップレベル要素が複数ある＝複数フレームが選択されている。指示が特定の1枚を指していない限り、全トップレベルそれぞれに動きを付ける（1枚だけで終わらせない）**。各フレームは各自のタイムラインで個別に動く（重なったスライドショーの指示のときだけ順送り1本にする）。
- id は渡された一覧のものだけ使う。指示に無いノードは触らない。付ける点が無ければ {"ops":[],"note":"理由"}。JSONのみ返す。`;

// claude -p の出力から JSON配列(ops)を取り出す（配列でも {ops:[...]} オブジェクトでも内側の[...]を拾う）
function extractOps(s) {
  let m = String(s).match(/```(?:json)?\s*([\s\S]*?)```/);
  let txt = m ? m[1] : String(s);
  const a = txt.indexOf("["), b = txt.lastIndexOf("]");
  if (a < 0 || b < 0 || b < a) return null;
  try { const p = JSON.parse(txt.slice(a, b + 1)); return Array.isArray(p) ? p : null; } catch (e) { return null; }
}
// 出力中の "note":"..." を取り出す（できなかった事・提案などのユーザー向け補足）
function extractNote(s) {
  const m = String(s).match(/"note"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (!m) return "";
  try { return JSON.parse('"' + m[1] + '"'); } catch (e) { return m[1]; }
}

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const u = new URL(req.url, "http://x");

  // プラグインがポーリングで取りに来る（焼き込み済みを返す＝ボードで実画像/正サイズ）
  if (u.pathname === "/engines") {   // パネルが利用可能なAIエンジンを取得（検出済みのものだけ選べる）
    res.setHeader("Content-Type", "application/json");
    const list = Object.keys(ENGINES).map((k) => ({ key: k, label: ENGINES[k].label, available: !!engineAvail[k] }));
    return res.end(JSON.stringify({ engines: list, default: "claude" }));
  }
  if (u.pathname === "/pull") {
    res.setHeader("Content-Type", "application/json");
    pulledJSON()
      .then((out) => res.end(JSON.stringify(out)))
      .catch(() => res.end(JSON.stringify({ version: ver(), json: read() })));
    return;
  }

  // タブ使い回し用ナビ。開いてるページが /nav を見て自分で遷移する（新規ウィンドウを増やさない）
  if (u.pathname === "/nav") {
    res.setHeader("Content-Type", "application/json");
    if (req.method === "GET") { lastNavPoll = Date.now(); return res.end(JSON.stringify({ v: navV, view: navView })); }
    if (req.method === "POST") {
      let b = ""; req.on("data", (d) => (b += d));
      req.on("end", () => { try { navView = (JSON.parse(b).view || "").toString(); navV++; } catch (e) {} res.end(JSON.stringify({ ok: true, v: navV })); });
      return;
    }
  }
  if (u.pathname === "/nav-status") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ alive: (Date.now() - lastNavPoll) < 3000 }));
  }
  if (u.pathname === "/chat-busy") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ busy: chatBusy, since: chatBusySince }));
  }

  // 実行中のチャット生成（claude / 採取）を停止する
  if (u.pathname === "/abort" && req.method === "POST") {
    res.setHeader("Content-Type", "application/json");
    let killed = false;
    if (currentChild) { aborted = true; try { currentChild.kill("SIGTERM"); killed = true; } catch (e) {} }
    return res.end(JSON.stringify({ ok: true, killed: killed }));
  }

  // AI整え（B）：選択フレームの構造JSON → claude が「整え操作リスト」を返す（ファイルは編集しない）
  if (u.pathname === "/ai-tidy" && req.method === "POST") {
    let b = ""; req.on("data", (d) => (b += d));
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      let structure = null, engine = "";
      try { const j = JSON.parse(b); structure = j.structure; engine = j.engine || ""; } catch (e) {}
      if (!structure) { res.writeHead(400); return res.end(JSON.stringify({ ok: false, error: "structureが空です" })); }
      const prompt = AI_TIDY_PROMPT + "\n\n## 構造JSON\n" + JSON.stringify(structure);
      let done = false;   // ★整え/編集/モーションのAI-opsはチャットのbusyフラグに触らない(チャットが誤って「考え中」表示になるのを防ぐ)
      const finish = (obj) => {
        if (done) return; done = true; currentChild = null; clearTimeout(timer);
        if (aborted) { aborted = false; return res.end(JSON.stringify({ ok: false, aborted: true })); }
        res.end(JSON.stringify(obj));
      };
      let child;
      try { child = spawnAI(engine, prompt, false); }
      catch (e) { return finish({ ok: false, error: "claude起動失敗: " + (e && e.message ? e.message : e) }); }
      currentChild = child;
      let out = "", err = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
      child.on("error", (e) => finish({ ok: false, error: "claudeが見つかりません: " + (e && e.message ? e.message : e) }));
      child.on("close", (code) => {
        if (code !== 0) return finish({ ok: false, error: "claude失敗: " + err.trim().slice(-300) });
        const ops = extractOps(out);
        if (!ops) return finish({ ok: false, error: "操作JSONを取り出せませんでした", raw: out.trim().slice(-300) });
        finish({ ok: true, ops: ops, note: extractNote(out) });
      });
      var timer = setTimeout(() => { try { if (currentChild) currentChild.kill(); } catch (e) {} finish({ ok: false, error: "タイムアウト（180s）" }); }, 180000);
    });
    return;
  }

  // AI会話編集（B拡張）：選択フレーム構造＋ユーザー指示 → 編集オペ。どんなフレーム（外部/手描き）も対象
  if (u.pathname === "/ai-edit" && req.method === "POST") {
    let b = ""; req.on("data", (d) => (b += d));
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      let structure = null, instruction = "", engine = "";
      try { const j = JSON.parse(b); structure = j.structure; instruction = (j.instruction || "").toString(); engine = j.engine || ""; } catch (e) {}
      if (!structure) { res.writeHead(400); return res.end(JSON.stringify({ ok: false, error: "structureが空です" })); }
      if (!instruction.trim()) { res.writeHead(400); return res.end(JSON.stringify({ ok: false, error: "編集指示が空です" })); }
      const prompt = AI_EDIT_PROMPT + "\n\n## ユーザーの編集指示\n" + instruction + "\n\n## 構造JSON\n" + JSON.stringify(structure);
      let done = false;   // ★整え/編集/モーションのAI-opsはチャットのbusyフラグに触らない(チャットが誤って「考え中」表示になるのを防ぐ)
      const finish = (obj) => {
        if (done) return; done = true; currentChild = null; clearTimeout(timer);
        if (aborted) { aborted = false; return res.end(JSON.stringify({ ok: false, aborted: true })); }
        res.end(JSON.stringify(obj));
      };
      let child;
      try { child = spawnAI(engine, prompt, false); }
      catch (e) { return finish({ ok: false, error: "claude起動失敗: " + (e && e.message ? e.message : e) }); }
      currentChild = child;
      let out = "", err = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
      child.on("error", (e) => finish({ ok: false, error: "claudeが見つかりません: " + (e && e.message ? e.message : e) }));
      child.on("close", (code) => {
        if (code !== 0) return finish({ ok: false, error: "claude失敗: " + err.trim().slice(-300) });
        const ops = extractOps(out);
        if (!ops) return finish({ ok: false, error: "操作JSONを取り出せませんでした", raw: out.trim().slice(-300) });
        finish({ ok: true, ops: ops, note: extractNote(out) });
      });
      var timer = setTimeout(() => { try { if (currentChild) currentChild.kill(); } catch (e) {} finish({ ok: false, error: "タイムアウト（180s）" }); }, 180000);
    });
    return;
  }

  // 🎬 AI会話モーション（chat-to-animate）：ノード一覧＋指示 → claudeがキーフレームops → プラグインがapplyManualKeyframeTrack
  if (u.pathname === "/ai-motion" && req.method === "POST") {
    let b = ""; req.on("data", (d) => (b += d));
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      let nodes = null, instruction = "", engine = "";
      try { const j = JSON.parse(b); nodes = j.structure || j.nodes; instruction = (j.instruction || "").toString(); engine = j.engine || ""; } catch (e) {}
      if (!nodes) { res.writeHead(400); return res.end(JSON.stringify({ ok: false, error: "nodesが空です" })); }
      if (!instruction.trim()) { res.writeHead(400); return res.end(JSON.stringify({ ok: false, error: "モーション指示が空です" })); }
      const prompt = AI_MOTION_PROMPT + "\n\n## ユーザーの指示\n" + instruction + "\n\n## ノード一覧\n" + JSON.stringify(nodes);
      let done = false;   // ★整え/編集/モーションのAI-opsはチャットのbusyフラグに触らない(チャットが誤って「考え中」表示になるのを防ぐ)
      const finish = (obj) => { if (done) return; done = true; currentChild = null; clearTimeout(timer); if (aborted) { aborted = false; return res.end(JSON.stringify({ ok: false, aborted: true })); } res.end(JSON.stringify(obj)); };
      let child;
      try { child = spawnAI(engine, prompt, false); }
      catch (e) { return finish({ ok: false, error: "AI起動失敗: " + (e && e.message ? e.message : e) }); }
      currentChild = child;
      let out = "", err = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
      child.on("error", (e) => finish({ ok: false, error: "AIが見つかりません: " + (e && e.message ? e.message : e) }));
      child.on("close", (code) => {
        if (code !== 0) return finish({ ok: false, error: "AI失敗: " + err.trim().slice(-300) });
        const ops = extractOps(out);
        if (!ops) return finish({ ok: false, error: "モーションJSONを取り出せませんでした", raw: out.trim().slice(-300) });
        finish({ ok: true, ops: ops, note: extractNote(out) });
      });
      var timer = setTimeout(() => { try { if (currentChild) currentChild.kill(); } catch (e) {} finish({ ok: false, error: "タイムアウト（180s）" }); }, 180000);
    });
    return;
  }

  // チャット履歴の共有ストア（パネルと大きい画面で会話を継続）
  if (u.pathname === "/chat-log") {
    const LOG = path.join(__dirname, "_chat-log.json");
    if (req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      try { return res.end(fs.readFileSync(LOG, "utf8")); } catch (e) { return res.end("[]"); }
    }
    if (req.method === "POST") {
      let b = ""; req.on("data", (d) => (b += d));
      req.on("end", () => { try { JSON.parse(b); fs.writeFileSync(LOG, b); res.setHeader("Content-Type", "application/json"); res.end('{"ok":true}'); } catch (e) { res.writeHead(400); res.end('{"ok":false}'); } });
      return;
    }
  }

  // 現在の mothership.json を library/ に保存（パネルの「ライブラリに保存」ボタン）
  if (u.pathname === "/save-lib" && req.method === "POST") {
    res.setHeader("Content-Type", "application/json");
    try {
      const src = read();
      const doc = JSON.parse(src);
      let name = (doc.name || (doc.root && doc.root.name) || "design").toString().trim();
      let safe = name.replace(/[\/\\:*?"<>|]+/g, "-").replace(/\s+/g, " ").slice(0, 60) || "design";
      const dir = path.join(__dirname, "library");
      try { fs.mkdirSync(dir); } catch (e) {}
      const file = "library/" + safe + ".json";
      fs.writeFileSync(path.join(__dirname, file), src);
      return res.end(JSON.stringify({ ok: true, file: file, name: name }));
    } catch (e) { res.writeHead(500); return res.end(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) })); }
  }

  // ◆ モーション・ライブラリ＝motion/*.json（デザインの library/ と同じ思想＝所有・git管理・チーム共有）。
  //    パネルの「◆ 保存」がノードから読み取った doc を投げてくる。プラグイン側は clientStorage にも控えを持つ。
  if (u.pathname === "/save-motion" && req.method === "POST") {
    res.setHeader("Content-Type", "application/json");
    let b = ""; req.on("data", (d) => (b += d));
    req.on("end", () => {
      try {
        const doc = JSON.parse(b);
        if (!doc || doc.kind !== "mothership.motion" || !Array.isArray(doc.nodes)) { res.writeHead(400); return res.end('{"ok":false,"error":"not a motion doc"}'); }
        const name = String(doc.name || "motion").trim();
        const safe = name.replace(/[\/\\:*?"<>|]+/g, "-").replace(/\s+/g, " ").slice(0, 60) || "motion";
        const dir = path.join(__dirname, "motion");
        try { fs.mkdirSync(dir); } catch (e) {}
        const file = "motion/" + safe + ".json";
        fs.writeFileSync(path.join(__dirname, file), JSON.stringify(doc, null, 2));
        res.end(JSON.stringify({ ok: true, file: file, name: name }));
      } catch (e) { res.writeHead(500); res.end(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) })); }
    });
    return;
  }

  // motion/*.json の一覧（name・尺・ノード数付き）
  if (u.pathname === "/list-motion") {
    res.setHeader("Content-Type", "application/json");
    const out = [];
    try {
      const dir = path.join(__dirname, "motion");
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith(".json")) continue;
        try {
          const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
          if (!d || d.kind !== "mothership.motion") continue;
          out.push({ file: "motion/" + f, name: d.name || f, duration: d.duration || 0, count: (d.nodes || []).length });
        } catch (e) {}
      }
    } catch (e) {}
    return res.end(JSON.stringify(out));
  }

  // motion のパターン削除
  if (u.pathname === "/delete-motion" && req.method === "POST") {
    res.setHeader("Content-Type", "application/json");
    let b = ""; req.on("data", (d) => (b += d));
    req.on("end", () => {
      try {
        const file = (JSON.parse(b).file || "").toString();
        if (file.indexOf("motion/") !== 0 || file.indexOf("..") >= 0) { res.writeHead(400); return res.end('{"ok":false,"error":"bad path"}'); }
        fs.unlinkSync(path.join(__dirname, file));
        res.end('{"ok":true}');
      } catch (e) { res.writeHead(500); res.end(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) })); }
    });
    return;
  }

  // library のパターン削除
  if (u.pathname === "/delete-lib" && req.method === "POST") {
    res.setHeader("Content-Type", "application/json");
    let b = ""; req.on("data", (d) => (b += d));
    req.on("end", () => {
      try {
        let file = (JSON.parse(b).file || "").toString();
        if (file.indexOf("library/") !== 0 || file.indexOf("..") >= 0) { res.writeHead(400); return res.end('{"ok":false,"error":"bad path"}'); }
        fs.unlinkSync(path.join(__dirname, file));
        res.end('{"ok":true}');
      } catch (e) { res.writeHead(500); res.end(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) })); }
    });
    return;
  }

  // library/*.json の一覧（name付き）。library.html / ハブが使う
  if (u.pathname === "/list") {
    res.setHeader("Content-Type", "application/json");
    let out = [];
    try {
      const dir = path.join(__dirname, "library");
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith(".json")) continue;
        let name = f;
        try { name = (JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).name) || f; } catch (e) {}
        out.push({ file: "library/" + f, name: name });
      }
    } catch (e) {}
    return res.end(JSON.stringify(out));
  }

  // チャット: claude -p（Maxのheadless Claude Code）を起動し mothership.json を編集させる（AI課金なし）
  if (u.pathname === "/chat" && req.method === "POST") {
    let b = "";
    req.on("data", (d) => (b += d));
    req.on("end", () => {
      let msg = "", image = "", display = "", engine = "";
      try { const j = JSON.parse(b); msg = (j.message || "").toString(); image = (j.image || "").toString(); display = (j.display || "").toString(); engine = j.engine || ""; } catch (e) {}
      res.setHeader("Content-Type", "application/json");
      if (!msg.trim() && !image) { res.writeHead(400); return res.end(JSON.stringify({ ok: false, error: "メッセージが空です" })); }

      // 添付画像があればファイルに書き出し、claudeにReadさせる
      let prompt = msg;
      if (image && image.indexOf("data:image/") === 0) {
        try {
          const m = image.match(/^data:image\/(\w+);base64,(.*)$/);
          if (m) {
            const ext = m[1] === "jpeg" ? "jpg" : m[1];
            const fname = "_chat-ref." + ext;
            fs.writeFileSync(path.join(__dirname, fname), Buffer.from(m[2], "base64"));
            prompt = "ユーザーが参照画像を添付しました: ./" + fname + " （Readツールで画像を見て、デザインの参考にしてください）。\n\n" + (msg || "この画像を参考に、Mothership JSONでデザインを作って。");
          }
        } catch (e) {}
      }

      chatBusy = true; chatBusySince = Date.now();   // 生成開始（両画面で「考えています」同期用）
      appendLog({ cls: "me", text: display || msg });  // 発言を即サーバー保存（離脱しても残る）
      let done = false, activeChild = null;
      const finish = (obj) => {
        if (done) return; done = true; chatBusy = false; clearTimeout(timer); currentChild = null;
        const secs = ((Date.now() - chatBusySince) / 1000).toFixed(1);
        if (aborted) { aborted = false; appendLog({ cls: "ms", text: "⏹ 停止しました  ·  ⏱" + secs + "s" }); return res.end(JSON.stringify({ ok: false, aborted: true })); }
        // 返信もサーバーが保存（res.end前に書くので、どのタブに移動しても会話が継続する）
        if (obj.ok) appendLog({ cls: "ms", text: (obj.text || "（完了）") + "  ·  ⏱" + secs + "s" });
        else appendLog({ cls: "err", text: (obj.error || "失敗") + (obj.text ? "\n\n" + obj.text : "") });
        res.end(JSON.stringify(obj));
      };

      // claude -p を起動して mothership.json を編集させる
      const launch = (finalPrompt) => {
        let child;
        try {
          child = spawnAI(engine, PERSONA + finalPrompt, true);   // ★母艦の人格を全経路の先頭に付ける（エンジン非依存）
        } catch (e) { return finish({ ok: false, error: "claude 起動失敗: " + (e && e.message ? e.message : e) }); }
        activeChild = child; currentChild = child;
        let out = "", err = "";
        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (err += d));
        child.on("error", (e) => finish({ ok: false, error: "claude が見つかりません（PATH確認）: " + (e && e.message ? e.message : e) }));
        child.on("close", (code) => {
          // 成功した設計を新規ライブラリファイルに自動保存（既存名は上書きしない＝保存忘れ→上書きでの喪失を防ぐ）
          if (code === 0) {
            try {
              const cur = read(); const j = JSON.parse(cur);
              const nm = (j.name || "").toString().replace(/[\\/:*?"<>|]+/g, "_").trim().slice(0, 60);
              if (nm) {
                const dir = path.join(__dirname, "library"); fs.mkdirSync(dir, { recursive: true });
                const f = path.join(dir, nm + ".json");
                if (!fs.existsSync(f)) fs.writeFileSync(f, cur);  // 同名が既にあれば触らない（手動保存/既存を尊重）
              }
            } catch (e) {}
          }
          finish({ ok: code === 0, text: out.trim(), error: err.trim(), code: code });
        });
      };

      // 安全弁: 300秒で打ち切り（採取最大90s＋生成）
      var timer = setTimeout(() => { try { if (activeChild) activeChild.kill(); } catch (e) {} finish({ ok: false, error: "タイムアウト（300s）" }); }, 300000);

      // ★URL再現の自動採取：メッセージにURL＋再現意図があれば、relayが先に採取してspecをclaudeに渡す
      //   （claudeはRead/Writeだけで済む＝Bash承認プロンプトが出ない＝チャットだけで完結）
      const urlMatch = msg.match(/https?:\/\/[^\s"'<>）)】」]+/);
      const wantsRepro = /再現|再構成|複製|コピー|clone|同じ|そっくり|作成して|作って|reproduce/i.test(msg);
      if (urlMatch && wantsRepro) {
        const url = urlMatch[0].replace(/[。、,]+$/, "");
        const mobile = /スマホ|モバイル|mobile|スマートフォン|390/i.test(msg);
        const w = mobile ? 390 : 1440, h = mobile ? 780 : 900;
        const safe = url.replace(/^https?:\/\//, "").replace(/[^\w.-]+/g, "_").slice(0, 60) || "ref";
        const outRel = "refs/" + safe + ".json";
        let capDone = false;
        const onCap = (ok) => {
          if (capDone) return; capDone = true;
          if (aborted) return finish({ ok: false, aborted: true });  // 採取中に停止されたらclaudeを起動しない
          const note = ok
            ? "【参照スペック採取済み】" + outRel + " に " + url + " のファーストビュー（算出スタイル付き構造JSON）がある。これを Read して、CLAUDE.md『URLからサイトを再現する』の手順で **そのKV（ファーストビュー）** を mothership.json に再現せよ。画像は元サイトのURLを image.src にそのまま入れてよい（relayが /pull で自動取り込み）。新しい name の新フレームで作り、最後に何をどこに出したか1〜2文で返答。\n\nユーザー依頼: "
            : "（参照URLの自動採取に失敗＝playwright未導入等の可能性。可能な範囲で対応し、無理なら一言添えて。）\n\n";
          launch(note + prompt);
        };
        let cap;
        try {
          cap = spawn("node", [path.join(__dirname, "tools", "url-to-spec.js"), url, "--w", String(w), "--h", String(h), "--out", outRel], { cwd: __dirname, stdio: ["ignore", "pipe", "pipe"] });
        } catch (e) { return onCap(false); }
        currentChild = cap;  // 採取中も /abort で止められる
        cap.on("error", () => onCap(false));
        cap.on("close", (code) => onCap(code === 0));
        setTimeout(() => { try { cap.kill(); } catch (e) {} onCap(false); }, 90000);
      } else {
        launch(prompt);
      }
    });
    return;
  }

  // 参照URL → スペック抽出（#12）。tools/url-to-spec.js を子プロセスで実行（playwrightは子側のみ＝relayは依存ゼロ維持）
  if (u.pathname === "/ref" && req.method === "POST") {
    let b = ""; req.on("data", (d) => (b += d));
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      let url = "", w = 1440, h = 900;
      try { const j = JSON.parse(b); url = (j.url || "").toString(); if (j.w) w = parseInt(j.w, 10) || 1440; if (j.h) h = parseInt(j.h, 10) || 900; } catch (e) {}
      if (!/^https?:\/\//.test(url)) { res.writeHead(400); return res.end(JSON.stringify({ ok: false, error: "URLが不正です" })); }
      const safe = url.replace(/^https?:\/\//, "").replace(/[^\w.-]+/g, "_").slice(0, 60) || "ref";
      const outRel = "refs/" + safe + ".json";
      let child, err = "", done = false;
      const fail = (m) => { if (done) return; done = true; clearTimeout(timer); res.writeHead(500); res.end(JSON.stringify({ ok: false, error: m })); };
      try {
        child = spawn("node", [path.join(__dirname, "tools", "url-to-spec.js"), url, "--w", String(w), "--h", String(h), "--out", outRel], { cwd: __dirname, stdio: ["ignore", "pipe", "pipe"] });
      } catch (e) { return fail("起動失敗: " + (e && e.message ? e.message : e)); }
      child.stderr.on("data", (d) => (err += d));
      child.on("error", (e) => fail("node起動失敗: " + (e && e.message ? e.message : e)));
      child.on("close", (code) => {
        if (done) return; done = true; clearTimeout(timer);
        if (code !== 0) { res.writeHead(500); return res.end(JSON.stringify({ ok: false, error: "採取失敗（playwright未導入の可能性）: " + err.trim().slice(-400) })); }
        try {
          const spec = JSON.parse(fs.readFileSync(path.join(__dirname, outRel), "utf8"));
          res.end(JSON.stringify({ ok: true, file: outRel, count: spec.count, spec: spec }));
        } catch (e) { res.writeHead(500); res.end(JSON.stringify({ ok: false, error: "読込失敗: " + (e && e.message ? e.message : e) })); }
      });
      var timer = setTimeout(() => { try { child.kill(); } catch (e) {} fail("タイムアウト（90s）"); }, 90000);
    });
    return;
  }

  // 任意: HTTP経由で設計を流し込む（Claude Codeが curl で叩く用）
  if (u.pathname === "/push" && req.method === "POST") {
    let b = "";
    req.on("data", (d) => (b += d));
    req.on("end", () => {
      try { JSON.parse(b); fs.writeFileSync(FILE, b); res.end("ok"); }
      catch (e) { res.writeHead(400); res.end("invalid json"); }
    });
    return;
  }

  // 静的配信（library.html / library/*.json など）。/ は library.html
  const safe = decodeURIComponent(u.pathname).replace(/\.\.+/g, "");
  const fp = path.join(__dirname, safe === "/" ? "library.html" : safe);
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    const ext = path.extname(fp).toLowerCase();
    const ct = ext === ".html" ? "text/html; charset=utf-8"
      : ext === ".json" ? "application/json; charset=utf-8"
      : ext === ".js" ? "text/javascript" : ext === ".css" ? "text/css"
      : ext === ".svg" ? "image/svg+xml"
      : ext === ".png" ? "image/png" : (ext === ".jpg" || ext === ".jpeg") ? "image/jpeg"
      : ext === ".webp" ? "image/webp" : "application/octet-stream";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");  // ⌘Rで毎回最新を取得（キャッシュ無効）
    res.end(data);
  });
}).listen(PORT, () => {
  console.log("▲ Mothership relay  →  http://localhost:" + PORT);
  console.log("  watching : " + FILE);
  console.log("  Figmaでプラグイン Mothership を開き「接続」を押すとライブ連携が始まります。");
  console.log("  以後 mothership.json を保存するたび Figma が自動更新されます。");
  // AIエンジン自己チェック＝接続前に「どの頭脳が使えるか」を切り分ける（relayはリクエスト時に選択CLIを spawn するため）
  try {
    detectEngines();
    if (engineAvail.claude) console.log("  ✅ claude CLI OK — 既定エンジンが使えます（未ログインなら初回に要ログイン）。");
    else {
      console.log("  ⚠️  claude CLI が見つかりません → 既定AI（作る/整える/会話編集）が動きません。");
      console.log("      Claude Code を入れてログイン（Pro/Max）: https://claude.com/claude-code　※⚡サンプル生成はrelay無しでも動く。");
    }
    var _others = ["codex", "gemini"].filter((k) => engineAvail[k]).map((k) => ENGINES[k].label);
    if (_others.length) console.log("  ＋ 追加エンジン検出: " + _others.join(", ") + "（パネルで切替可・フラグはrelay.jsのENGINESで調整）");
    var _avail = Object.keys(ENGINES).filter((k) => engineAvail[k]).map((k) => ENGINES[k].label);
    console.log("  利用可能エンジン: " + (_avail.length ? _avail.join(" / ") : "なし"));
  } catch (e) {
    console.log("  ⚠️  エンジン検出に失敗: " + (e && e.message ? e.message : e));
  }
});
