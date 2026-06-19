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
      let msg = "";
      try { msg = (JSON.parse(b).message || "").toString(); } catch (e) {}
      res.setHeader("Content-Type", "application/json");
      if (!msg.trim()) { res.writeHead(400); return res.end(JSON.stringify({ ok: false, error: "メッセージが空です" })); }

      let done = false;
      const finish = (obj) => { if (done) return; done = true; clearTimeout(timer); res.end(JSON.stringify(obj)); };

      let child;
      try {
        child = spawn("claude", ["-p", msg, "--permission-mode", "acceptEdits"], { cwd: __dirname, stdio: ["ignore", "pipe", "pipe"] });
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
      : ext === ".svg" ? "image/svg+xml" : "application/octet-stream";
    res.setHeader("Content-Type", ct);
    res.end(data);
  });
}).listen(PORT, () => {
  console.log("▲ Mothership relay  →  http://localhost:" + PORT);
  console.log("  watching : " + FILE);
  console.log("  Figmaでプラグイン Mothership を開き「接続」を押すとライブ連携が始まります。");
  console.log("  以後 mothership.json を保存するたび Figma が自動更新されます。");
});
