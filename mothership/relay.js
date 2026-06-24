/* ============================================================
   Mothership relay — 依存ゼロのローカル中継（Node標準モジュールのみ）
   役割: mothership.json を見張り、Figmaプラグインへ配る。
   Claude Code は mothership.json を書き換えるだけ（＝MCP不要）。
   起動: node relay.js   （ポート変更: PORT=4600 node relay.js）
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const FILE = path.join(__dirname, "mothership.json");
const PORT = process.env.PORT || 4575;

const read = () => { try { return fs.readFileSync(FILE, "utf8"); } catch (e) { return "{}"; } };
const ver  = () => { try { return Math.floor(fs.statSync(FILE).mtimeMs); } catch (e) { return 0; } };

// ブラウザのタブを使い回すためのナビ状態（新規ウィンドウを増やさない）
let navView = "", navV = 0, lastNavPoll = 0;
// チャット生成中フラグ（パネル↔大きい画面で「考えています」を同期）
let chatBusy = false, chatBusySince = 0;

// 会話ログ（relayが唯一の書き手＝どのタブに移動しても会話が消えない）
const CHATLOG = path.join(__dirname, "_chat-log.json");
const readLog = () => { try { const a = JSON.parse(fs.readFileSync(CHATLOG, "utf8")); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const appendLog = (entry) => { try { const a = readLog(); a.push(entry); fs.writeFileSync(CHATLOG, JSON.stringify(a.slice(-60))); } catch (e) {} };

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const u = new URL(req.url, "http://x");

  // プラグインがポーリングで取りに来る
  if (u.pathname === "/pull") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ version: ver(), json: read() }));
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
      let msg = "", image = "", display = "";
      try { const j = JSON.parse(b); msg = (j.message || "").toString(); image = (j.image || "").toString(); display = (j.display || "").toString(); } catch (e) {}
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
      let done = false;
      const finish = (obj) => {
        if (done) return; done = true; chatBusy = false; clearTimeout(timer);
        const secs = ((Date.now() - chatBusySince) / 1000).toFixed(1);
        // 返信もサーバーが保存（res.end前に書くので、どのタブに移動しても会話が継続する）
        if (obj.ok) appendLog({ cls: "ms", text: (obj.text || "（完了）") + "  ·  ⏱" + secs + "s" });
        else appendLog({ cls: "err", text: (obj.error || "失敗") + (obj.text ? "\n\n" + obj.text : "") });
        res.end(JSON.stringify(obj));
      };

      let child;
      try {
        child = spawn("claude", ["-p", prompt, "--permission-mode", "acceptEdits"], { cwd: __dirname, stdio: ["ignore", "pipe", "pipe"] });
      } catch (e) {
        return finish({ ok: false, error: "claude 起動失敗: " + (e && e.message ? e.message : e) });
      }
      let out = "", err = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
      child.on("error", (e) => finish({ ok: false, error: "claude が見つかりません（PATH確認）: " + (e && e.message ? e.message : e) }));
      child.on("close", (code) => finish({ ok: code === 0, text: out.trim(), error: err.trim(), code: code }));

      // 安全弁: 240秒で打ち切り
      var timer = setTimeout(() => { try { child.kill(); } catch (e) {} finish({ ok: false, error: "タイムアウト（240s）" }); }, 240000);
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
});
