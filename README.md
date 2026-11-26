# study_wallstreet

DB에 등록된 영어 기사와 문장별 한국어 해석을 읽는 독립 웹앱입니다. 기존 wordStudy_의 문장 읽기를 바탕으로 재생 흐름을 새로 분리했습니다. Python 3.10 이상만 필요하며 외부 패키지는 없습니다.

```bash
python3 server.py
```

로컬 주소: http://127.0.0.1:43872/study_wallstreet/
운영 주소: https://rp-yoon.duckdns.org/study_wallstreet/

- 기본은 전체 반복입니다. All을 다시 누르면 반복이 꺼지고 마지막 문장에서 멈춥니다.
- 1은 현재 문장 반복입니다. 다시 누르면 이후 문장으로 순차 재생합니다. All과 1은 동시에 켜지지 않습니다.
- 문장을 누르면 모든 반복이 해제되고 해당 문장부터 순차 재생합니다.
- 재생과 일시정지는 같은 버튼으로 전환합니다. 정지는 첫 문장으로 돌아갑니다.
- A가 버튼은 문장 밑의 한국어 해석 표시를 켜고 끕니다.
- 하단에서 속도를 설정하며 변경한 속도는 다음 발화부터 적용됩니다.
- 영어 음성은 기기·브라우저의 SpeechSynthesis를 사용합니다. 기기에 영어 음성이 있어야 합니다.

## 자료와 DB

`data/articles.json`에 기사와 영문·해석 쌍을 등록합니다. 최초 실행 시 `runtime/study.sqlite3`에 없는 기사 ID만 등록합니다. API와 화면은 DB를 읽습니다. 재시작해도 기존 DB 내용을 덮어쓰지 않습니다. 기존 기사의 수정은 DB에서 직접 처리하고, 변경 전 SQLite 백업을 보관하세요. `STUDY_DB` 환경변수로 DB 위치를 지정할 수 있습니다.

DB 파일과 원본 Markdown은 정적 파일 경로로 공개되지 않습니다. 자료 등록용 쓰기 API는 제공하지 않습니다. 이 저장소의 한국어 해석은 학습용으로 작성한 번역입니다.

## 라즈베리파이 배포

서버의 `~/apps/study_wallstreet`에 `server.py`, `public/`, `scripts/`, `data/articles.json`을 복사합니다. DB가 있는 `runtime/`는 보존합니다.

```bash
cp scripts/study-wallstreet.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now study-wallstreet.service
# 소스 변경 후에는 systemctl --user restart study-wallstreet.service
curl -fsS http://127.0.0.1:43872/study_wallstreet/api/health
sudo python3 scripts/connect-nginx.py
```

Nginx 연결 스크립트는 기존 도메인 설정을 백업한 후 새 경로를 추가하고 검사·reload합니다. 검사 실패 시 파일을 복구합니다. 기존 영어 학습 앱과 DB는 수정하지 않습니다. 재부팅 뒤 로그인 없이 사용자 서비스를 시작하려면 서버 계정에 linger가 활성화되어 있어야 합니다.

## 검증

```bash
node tests/player.mjs
python3 -m py_compile server.py scripts/connect-nginx.py
```

음성 재생은 실제 사용 기기에서 별도로 확인해야 합니다.
