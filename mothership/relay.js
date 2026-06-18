/* ============================================================
   Mothership relay — 依存ゼロのローカル中継（Node標準モジュールのみ）
   役割: mothership.json を見張り、Figmaプラグインへ配る。
   Claude Code は mothership.json を書き換えるだけ（＝MCP不要）。
   起動: node relay.js   （ポート変更: PORT=4600 node relay.js）
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");

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

  res.end("Mothership relay · GET /pull · POST /push");
}).listen(PORT, () => {
  console.log("▲ Mothership relay  →  http://localhost:" + PORT);
  console.log("  watching : " + FILE);
  console.log("  Figmaでプラグイン Mothership を開き「接続」を押すとライブ連携が始まります。");
  console.log("  以後 mothership.json を保存するたび Figma が自動更新されます。");
});
