# 315tools 카드뉴스 주간 제작 RUNBOOK

@315tools_official 에 매일 밤 9시(KST) 올라가는 카드뉴스 7개를 매주 한 번에 만드는 방법.
발행은 이 저장소의 GitHub Actions(`publish.yml`, 30분마다)가 한다. Business Suite 예약은 더 이상 쓰지 않는다.

## 규칙

- 매주 7개(하루 1개). 게시 기간 = 작업일(금) 다음 날 토요일 ~ 그다음 금요일, 매일 21:00 KST.
- 이미지 1080×1350 JPEG 1장(`01.jpg`).
- 구성: 6개 사이트(pdf·image·calc·paperwork·font·game) 팁 각 1개 + 나머지 1칸은 주마다 번갈아
  - "QR 팁(qr.315tools.com)" — 이 경우 본문에 "전체 사이트 무료·가입 없음" 한 줄
  - "소개/신뢰" — 프라이버시·무료·가입 없음, 전체 사이트 모두 언급
  - 3주차(10/31~11/6)가 QR 차례였음 → **4주차(11/7~11/13)는 소개/신뢰 차례**
- 테마 navy / paper 번갈아.
- 작성 전 해당 사이트를 열어 **실제로 있는 기능만** 소개. 지어낸 기능·수치 금지.
- 315tools.com 을 먼저 열어 사이트가 늘었는지 확인하고, 늘었으면 포함.
- 아래 "사용한 주제"와 겹치지 않는 기능으로 고르고, 만든 뒤 이 목록에 추가.
- 이미지에는 서브도메인 URL 표기. 본문 링크는 안 눌리므로 "Link in bio".

### 사이트별 기능 (2026-10-23 확인)

- **pdf.315tools.com**: 합치기, 나누기, 압축, 페이지 정리, PDF→이미지, 이미지→PDF, 서명, 비밀번호, 워터마크, 페이지 번호, 텍스트 추출, 양식 채우기, 비교
- **image.315tools.com**: 압축(목표 KB), 크기 조절, 자르기, 변환(HEIC→JPG 등), 폰 배경화면, 소셜 사이즈, 여권 사진, 배경 제거, 얼굴 흐리기, EXIF 제거, 파비콘, GIF 만들기, 콜라주, 색상
- **calc.315tools.com**: 대출, 복리, 퍼센트, 할인, 팁·더치페이, 부가세/판매세, 실수령액, 손익분기, 마진·마크업, 저축 목표, 인플레이션, 은퇴 (11개국·미국 전 주)
- **paperwork.315tools.com**: 견적서, 프로포마 인보이스, 커머셜 인보이스, 패킹리스트, 발주서, 납품서, 영수증, 세금계산서 — 로고 넣기, PDF/워드/엑셀 내보내기, 국가별 통관 가이드
- **font.315tools.com**: 손글씨 → .ttf (인쇄 시트 촬영 또는 화면에 쓰기, 한글 11,172자 자모 조합 / 2,350자, 일본어 가나)
- **game.315tools.com**: 돌림판, 주사위, 랜덤 숫자, 동전 던지기, 이름 뽑기, 세계 미니게임
- **qr.315tools.com**: QR(링크, 텍스트, 와이파이, 연락처, 이메일, SMS·전화), 바코드, QR 읽기 — 정적 코드(만료 없음), 스캔 추적 없음

## 만드는 순서

1. 폰트 받기 (작업 폴더에서)
   ```bash
   npm pack @fontsource/noto-sans@5.1.0 @fontsource/ibm-plex-mono@5.1.0
   mkdir -p noto mono
   tar xzf fontsource-noto-sans-5.1.0.tgz -C noto
   tar xzf fontsource-ibm-plex-mono-5.1.0.tgz -C mono
   pip install --break-system-packages pillow fonttools
   ```
2. `posts.json` 작성 — 형식은 `kit/card/posts.example.json` 참고.
   - 필드: `id`, `theme`(navy|paper), `kicker`, `title`, `body`(선택), `bullets`[], `numbered`(단계 번호면 true), `cta`, `url`
3. 이미지 생성
   ```bash
   python3 kit/card/make_posts.py posts.json out noto/package/files mono/package/files
   ```
4. 이미지를 하나씩 직접 열어 확인하고 고치기
   - 글자 넘침·겹침·한 단어만 남은 줄
   - 푸터 CTA는 약 25자 이하(길면 오른쪽 URL과 겹침)
   - "→" 같은 기호는 latin 폰트에 없을 수 있음 → "to"로 표기
5. 날짜별 폴더에 넣기: `docs/posts/<YYYY-MM-DD>/card/01.jpg` + `post.json`
   ```json
   {"date":"2026-11-07","type":"card","topic":"<짧은 한국어 주제>","slides":["01.jpg"],"caption":"<영문 본문>","status":"ready"}
   ```
   - caption: 영문만, 이모지 약간, "Link in bio", 해시태그 5~8개, **마지막 해시태그 뒤 공백 1개**. 한국어 번역은 넣지 않음.
6. `python3 scripts/publish.py --dry-run` → 7개가 대기 목록에 있는지 확인
7. `git add` / `commit` / `pull --rebase` / `push` (릴스 작업이 같은 저장소에 push 할 수 있으니 pull --rebase 필수)
8. 확인용 `captions-weekN.txt`(날짜·영문 본문·[한국어 번역])를 사용자에게 보내기. 문제 있는 게시물은 GitHub에서 그 `post.json` 의 `status` 를 `"hold"` 로 바꾸면 발행 안 됨.
9. 아래 "사용한 주제"에 이번 주 추가 후 commit.

**이미 그 주 `docs/posts/<날짜>/card/` 가 있으면 새로 만들지 말고**, 7일이 다 있는지만 확인한다.

## 사용한 주제

- **1주차** 10/17~10/23 (Business Suite 예약): 315tools 소개-6개 사이트 전체(navy) / 휴대폰에서 PDF 합치기(paper) / 파일이 기기에 남는 이유-프라이버시(paper) / 실수령액 계산기(paper) / 사진을 정확한 KB로 압축(navy) / 무역서류-인보이스 만들기(navy) / 손글씨를 폰트로(paper)
- **2주차** 10/24~10/30 (Business Suite 예약): 10/24 소개-이제 7개 도구(신규 QR 포함, navy) / 10/25 프린트 없이 PDF 서명(paper) / 10/26 아이폰 HEIC→JPG(navy) / 10/27 할인+쿠폰 중복 계산기(paper) / 10/28 로고 넣은 견적서(navy) / 10/29 프린터 없이 화면에 써서 폰트 만들기(paper) / 10/30 돌림판(navy)
- **3주차** 10/31~11/6 (GitHub 자동 발행 — 예약 작업 push 403으로 사용자가 10/30 웹에서 직접 업로드): 10/31 QR 팁-만료 없는 정적 QR·스캔 추적 없음(+전체 7개 무료·가입 없음 한 줄, paper) / 11/1 PDF 압축-메일 첨부용(navy) / 11/2 사진 EXIF(GPS) 지우기(paper) / 11/3 인플레이션 계산기 $1,000·10년·2%(navy) / 11/4 프로포마 vs 커머셜 인보이스(paper) / 11/5 한글 자모 모드 105칸→11,172자(navy) / 11/6 랜덤 숫자 1~45 중 6개(paper)
- 다음 **4주차**(11/7~11/13) 7번째 칸 = 소개/신뢰(7개 사이트 전체)
