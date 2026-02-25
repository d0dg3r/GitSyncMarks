# Firefox Add-ons (AMO) — GitSyncMarks (한국어)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Firefox 북마크를 GitHub와 동기화 — 양방향, 충돌 없음. 파일별 JSON 저장, 삼방향 병합, 자동 동기화. 북마크 도구 모음, 메뉴, 모바일 완벽 지원. Git, CLI 또는 GitHub Actions로 북마크 추가. 오픈 소스, 중개자 없음.

### Detailed Description
GitSyncMarks는 Firefox 북마크를 GitHub 저장소와 동기화합니다 — 양방향, 자동, 중개자 없음.

기능:
• 중개자 없음: GitHub API와 직접 통신 — 제3자 서버 없음, 백엔드 없음, 데이터는 브라우저와 GitHub 사이에만 존재
• 파일별 저장: 각 북마크는 개별 JSON 파일 — 사람이 읽기 쉽고 diff에 최적화
• 삼방향 병합: 양쪽에서 변경 시 자동으로 충돌 없이 동기화
• 북마크 메뉴 폴더를 포함한 Firefox 완벽 지원
• 모든 북마크 변경 시 자동 동기화(프로필별 디바운스 설정 가능)
• 다중 북마크 프로필: 최대 10개 프로필, 별도의 GitHub 저장소 사용; 전환 시 로컬 북마크 교체
• 컨텍스트 메뉴: 페이지나 링크 우클릭 — 북마크 바에 추가, 기타 북마크에 추가, 지금 동기화, 프로필 전환, 파비콘 URL 복사, 파비콘 다운로드
• 파비콘 도구: 모든 사이트의 파비콘 URL을 클립보드에 복사하거나 PNG로 다운로드 — 브라우저 파비콘 사용, Google 파비콘 서비스 대체
• 자동화: Git, CLI 또는 GitHub Actions로 북마크 추가 — 브라우저 불필요
• GitHub Repos 폴더: 모든 GitHub 저장소(공개 및 비공개)의 북마크가 포함된 선택적 폴더
• Sync 프로필: 실시간, 빈번, 일반 또는 절전 모드
• 시작/포커스 시 Sync: 브라우저 시작 또는 창 포커스 시 선택적 동기화(쿨다운 포함)
• 원격 변경 감지를 위한 주기적 Sync(1~120분, 설정 가능)
• 팝업을 통한 수동 Push, Pull 및 전체 Sync
• 자동 병합이 불가능할 때 충돌 감지
• 생성 파일: README.md(개요), bookmarks.html(브라우저 가져오기), feed.xml(RSS 2.0 피드), dashy-conf.yml(Dashy 대시보드) — 각각 끄기, 수동 또는 자동으로 설정 가능
• 설정 Git 동기화: 저장소에 확장 설정의 암호화 백업 — 글로벌(공유) 또는 개별(장치별) 모드; 다른 장치에서 설정 가져오기; 모든 장치에서 동일한 비밀번호, 자동 동기화
• 가져오기/내보내기: 북마크(JSON), Dashy 구성(YAML) 또는 설정(일반 JSON / 암호화 .enc); 자동 형식 감지로 가져오기
• 전체 초기화: 파일 → 설정의 « 모든 데이터 초기화 » — 모든 프로필, 토큰, 설정 삭제(브라우저 북마크는 유지); 2단계 확인
• 설정 마법사: 토큰, 리포지토리, 첫 동기화를 위한 8단계 가이드
• 온보딩: 폴더 브라우저로 동기화 경로 선택; 새 프로필 구성 시 폴더 생성 또는 북마크 가져오기
• 다국어: 12개 언어 — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; 수동 선택 또는 자동 감지
• 키보드 단축키: 빠른 Sync(Ctrl+Shift+.), 설정 열기(Ctrl+Shift+,) — 사용자 정의 가능
• 테마: 라이트, 다크 또는 자동 — 순환 버튼(A → 다크 → 라이트 → A) 옵션 및 팝업에서
• 옵션: 5개 탭(GitHub, Sync, 파일, 도움말, 정보)과 GitHub 및 파일의 하위 탭 — 깔끔한 설정 UI
• 알림: 전체(성공 + 실패), 오류만 또는 끄기
• 자동 저장: 모든 설정은 변경 시 자동 저장 — 저장 버튼 없음
• 디버그 로그: Sync 탭 — 동기화 진단 활성화, 문제 해결을 위한 내보내기
• 백로그 투표: 커뮤니티 투표로 다음 기능 우선순위 결정
• 모바일 앱: GitSyncMarks-Mobile(iOS + Android) — 이동 중 북마크 보기, 저장소에서 읽기 전용 동기화

사용 방법:
1. 북마크용 GitHub 저장소 생성
2. "repo" 범위의 Personal Access Token 생성
3. GitSyncMarks에 토큰과 저장소 구성
4. "지금 동기화" 클릭 — 완료!

각 북마크는 저장소에 개별 JSON 파일로 저장되며, Firefox 북마크 계층 구조(북마크 도구 모음, 북마크 메뉴, 기타 북마크)를 반영하는 폴더로 구성됩니다. README.md는 GitHub에서 직접 개요를 제공하고, bookmarks.html은 모든 브라우저로 가져오기가 가능하며, feed.xml RSS 피드는 구독이나 자동화에 사용할 수 있고, dashy-conf.yml은 Dashy 대시보드의 섹션을 제공합니다.

자동화:
Firefox를 열지 않고도 북마크를 추가할 수 있습니다. GitSyncMarks에는 GitHub Actions 워크플로(add-bookmark.yml)가 포함되어 있어 GitHub 웹 UI 또는 명령줄을 통해 북마크를 추가할 수 있습니다:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

저장소에 직접 북마크 파일을 생성할 수도 있습니다 — 북마크 폴더에 "title"과 "url"이 포함된 JSON 파일을 추가하기만 하면 됩니다. 확장 프로그램이 다음 동기화 시 새 파일을 자동으로 감지합니다.

GitSyncMarks는 완전 오픈 소스입니다: https://github.com/d0dg3r/GitSyncMarks

모바일 앱: GitSyncMarks-Mobile(iOS + Android) — 이동 중 북마크 보기. 읽기 전용 동반 앱; F-Droid 및 Google Play 출시 예정. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
북마크

### Tags
bookmarks, sync, github, backup, automation
