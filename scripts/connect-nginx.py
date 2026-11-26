#!/usr/bin/env python3
"""라즈베리파이에서 sudo로 실행. 기존 설정 백업 후 경로를 추가한다."""
import datetime
import os
from pathlib import Path
import shutil
import subprocess

if os.geteuid() != 0:
    raise SystemExit('sudo python3 scripts/connect-nginx.py 로 실행하세요.')
p = Path('/etc/nginx/sites-available/rp-yoon-duckdns.conf')
old = p.read_text()
marker = '    # study_wallstreet sentence reader\n'
if marker in old:
    subprocess.run(['nginx', '-t'], check=True)
    subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    raise SystemExit('이미 경로가 등록되어 있습니다.')
block = marker + '''    location = /study_wallstreet { return 308 /study_wallstreet/; }
    location ^~ /study_wallstreet/ {
        proxy_pass http://127.0.0.1:43872;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
'''
needle = '    location / {\n        proxy_pass http://127.0.0.1:43871;'
if old.count(needle) != 1:
    raise SystemExit('예상한 Nginx 구성이 아닙니다. 변경하지 않았습니다.')
backup = p.with_name(p.name + '.backup-' + datetime.datetime.now().strftime('%Y%m%d%H%M%S'))
shutil.copy2(p, backup)
p.write_text(old.replace(needle, block + needle))
try:
    subprocess.run(['nginx', '-t'], check=True)
    subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
except Exception:
    shutil.copy2(backup, p)
    subprocess.run(['nginx', '-t'], check=False)
    raise
print('https://rp-yoon.duckdns.org/study_wallstreet/ 연결 완료')
