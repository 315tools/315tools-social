"""Serve each 315tools site folder on its own localhost port. usage: python3 serve.py <repo>/sites
home 8080 · pdf 8081 · image 8082 · calc 8083 · paperwork 8084 · font 8085 · game 8086 · qr 8087"""
import sys, threading, functools, http.server
PORTS = {'home': 8080, 'pdf': 8081, 'image': 8082, 'calc': 8083, 'paperwork': 8084, 'font': 8085, 'game': 8086, 'qr': 8087}
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self): self.send_header('Access-Control-Allow-Origin', '*'); super().end_headers()
for name, port in PORTS.items():
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(H, directory=f'{sys.argv[1]}/{name}'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
print('serving', PORTS, flush=True); threading.Event().wait()
