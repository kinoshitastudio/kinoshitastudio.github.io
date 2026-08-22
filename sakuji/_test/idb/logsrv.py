"""テストの結果を受け取るだけの小さな口。
⚠️ --virtual-time-budget を外すと --dump-dom は読み込み直後に吐いてしまうので、
   非同期（IndexedDB など）の結果はここへ POST して受け取る。127.0.0.1 だけに開く。"""
import sys, http.server

PORT = int(sys.argv[1]); OUT = sys.argv[2]

class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(n).decode('utf-8', 'replace')
        with open(OUT, 'a', encoding='utf-8') as f:
            f.write(body + '\n')
        self.send_response(204); self._cors(); self.end_headers()
    def log_message(self, *a): pass

http.server.HTTPServer(('127.0.0.1', PORT), H).serve_forever()
