"""study_wallstreet: DB 기반 문장 읽기. Python 표준 라이브러리만 사용."""
import argparse
import json
import os
import sqlite3
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DB = Path(os.environ.get('STUDY_DB', ROOT / 'runtime/study.sqlite3'))
BASE = '/study_wallstreet'

def initialize():
    DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB) as db:
        db.execute('CREATE TABLE IF NOT EXISTS articles (id TEXT PRIMARY KEY, title TEXT NOT NULL, subtitle TEXT NOT NULL)')
        db.execute('CREATE TABLE IF NOT EXISTS sentences (article_id TEXT NOT NULL REFERENCES articles(id), position INTEGER NOT NULL, en TEXT NOT NULL, ko TEXT NOT NULL, PRIMARY KEY(article_id, position))')
        for article in json.loads((ROOT / 'data/articles.json').read_text()):
            if db.execute('SELECT 1 FROM articles WHERE id=?', (article['id'],)).fetchone():
                continue  # 운영 DB에 등록된 내용은 재시작으로 덮어쓰지 않는다.
            db.execute('INSERT INTO articles VALUES (?,?,?)', (article['id'], article['title'], article['subtitle']))
            for i, sentence in enumerate(article['sentences']):
                if not sentence['en'].strip() or not sentence['ko'].strip():
                    raise ValueError('영문과 해석이 모두 필요합니다.')
                db.execute('INSERT INTO sentences VALUES (?,?,?,?)', (article['id'], i, sentence['en'], sentence['ko']))

def read_articles():
    with sqlite3.connect(DB) as db:
        db.row_factory = sqlite3.Row
        articles = [dict(row) for row in db.execute('SELECT * FROM articles ORDER BY rowid')]
        for article in articles:
            article['sentences'] = [dict(row) for row in db.execute('SELECT en,ko FROM sentences WHERE article_id=? ORDER BY position', (article['id'],))]
        return articles

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == BASE:
            self.send_response(308)
            self.send_header('Location', BASE + '/')
            self.end_headers()
            return
        routes = {BASE + '/': ('index.html', 'text/html; charset=utf-8'), BASE + '/player.mjs': ('player.mjs', 'text/javascript; charset=utf-8'), BASE + '/app.js': ('app.js', 'text/javascript; charset=utf-8'), BASE + '/style.css': ('style.css', 'text/css; charset=utf-8')}
        if path in (BASE + '/api/articles', BASE + '/api/health'):
            body = json.dumps(read_articles() if path.endswith('/articles') else {'ok': True}, ensure_ascii=False).encode()
            mime = 'application/json; charset=utf-8'
        elif path in routes:
            name, mime = routes[path]
            body = (ROOT / 'public' / name).read_bytes()
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=43872)
    args = parser.parse_args()
    initialize()
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
