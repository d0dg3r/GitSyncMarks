# Chrome Web Store — GitSyncMarks (한국어)
<!-- See chrome-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 132 characters)
북마크를 GitHub에 안전하게 보관 — 파일별 저장, 3방향 병합 동기화, Chrome 및 Firefox 지원. 서버 불필요.

### Detailed Description
GitSyncMarks는 브라우저 북마크를 GitHub 리포지토리와 동기화합니다 — 양방향, 자동, 외부 서버 불필요.

기능:
• 파일별 저장: 각 북마크는 개별 JSON 파일 — 사람이 읽기 쉽고 diff 친화적
• 3방향 병합: 양쪽에서 변경이 있어도 충돌 없이 자동 동기화
• 크로스 브라우저: Chrome, Chromium, Brave, Edge, Firefox 지원
• 다중 북마크 프로필: 최대 10개 프로필, 별도 GitHub 리포지토리; 전환 시 로컬 북마크 교체
• GitHub Repos 폴더: 모든 GitHub 리포지토리(공개 및 비공개)의 북마크가 포함된 선택적 폴더
• 온보딩: 새 프로필 구성 시 폴더 생성 또는 북마크 Pull
• Sync 프로필: 실시간, 빈번, 보통 또는 절전(사전 설정 간격 및 디바운스)
• 모든 북마크 변경 시 자동 Sync(프로필별 디바운스 구성 가능)
• 시작/포커스 시 Sync: 브라우저 시작 또는 포커스 복귀 시 선택적 Sync(쿨다운 포함)
• 원격 변경 감지를 위한 주기적 Sync(1~120분, 구성 가능)
• 알림: 모두(성공 + 실패), 오류만 또는 끄기
• 팝업에서 수동 Push, Pull 및 전체 Sync
• 자동 병합이 불가능할 때 충돌 감지
• 생성 파일: README.md(개요), bookmarks.html(브라우저 가져오기), feed.xml(RSS 2.0 피드), dashy-conf.yml(Dashy 대시보드) — 각각 끄기, 수동, 자동으로 구성 가능
• Git 설정 Sync: 리포지토리에 확장 프로그램 설정의 암호화된 백업 — 글로벌(공유) 또는 개별(기기별) 모드; 다른 기기에서 설정 가져오기; 모든 기기에서 동일한 비밀번호, 자동 동기화
• 컨텍스트 메뉴: 페이지나 링크 우클릭 — 북마크 바에 추가, 기타 북마크에 추가, 지금 동기화, 파비콘 URL 복사, 파비콘 다운로드
• 자동화: Git, CLI 또는 GitHub Actions로 북마크 추가 — 브라우저 불필요
• 가져오기/내보내기: 북마크(JSON), Dashy 구성(YAML) 또는 설정(일반 JSON / 암호화된 .enc) 내보내기; 자동 형식 감지로 가져오기
• 자동 저장: 모든 설정은 변경 시 자동 저장 — 저장 버튼 없음
• 옵션: 5개 탭(GitHub, Sync, 파일, 도움말, 정보), GitHub 및 파일에 하위 탭 — 깔끔하게 정리된 설정 UI
• 테마: 라이트, 다크 또는 자동 — 순환 버튼(A → 다크 → 라이트 → A) 옵션 및 팝업
• 백로그 투표: 다음 기능 우선순위를 결정하는 커뮤니티 투표
• 다국어: 12개 언어 — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; 수동 선택 또는 자동 감지
• 키보드 단축키: 빠른 Sync(Ctrl+Shift+.), 설정 열기(Ctrl+Shift+,) — 사용자 지정 가능
• 디버그 로그: Sync 탭 — Sync 진단을 위해 활성화, 문제 해결을 위해 내보내기
• 모바일 동반앱: GitSyncMarks-Mobile(iOS + Android) — 이동 중에 북마크 보기, 리포지토리에서 읽기 전용 Sync
• 외부 서버 없음 — Personal Access Token을 사용하여 GitHub API와 직접 통신

사용 방법:
1. 북마크용 GitHub 리포지토리 생성
2. "repo" 범위의 Personal Access Token 생성
3. 토큰과 리포지토리로 GitSyncMarks 구성
4. "지금 동기화" 클릭 — 완료!

각 북마크는 리포지토리에 개별 JSON 파일로 저장되며, 북마크 계층 구조를 반영하는 폴더로 구성됩니다. README.md는 GitHub에서 직접 깔끔한 개요를 제공하고; bookmarks.html은 모든 브라우저로 가져올 수 있으며; feed.xml RSS 피드는 구독하거나 자동화에 사용할 수 있고; dashy-conf.yml은 Dashy 대시보드 섹션을 제공합니다.

자동화:
브라우저를 열지 않고도 북마크를 추가할 수 있습니다. GitSyncMarks에는 GitHub Actions 워크플로(add-bookmark.yml)가 포함되어 있어 GitHub 웹 UI 또는 명령줄에서 북마크를 추가할 수 있습니다:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

리포지토리에 직접 북마크 파일을 생성할 수도 있습니다 — 북마크 폴더에 "title"과 "url"이 포함된 JSON 파일을 추가하기만 하면 됩니다. 확장 프로그램은 다음 Sync 시 새 파일을 자동으로 감지하고 표준 형식으로 정규화합니다.

GitSyncMarks는 완전히 오픈 소스입니다: https://github.com/d0dg3r/GitSyncMarks

모바일 앱: GitSyncMarks-Mobile(iOS + Android) — 이동 중에 북마크 보기. 읽기 전용; F-Droid 및 Google Play 출시 예정. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
생산성

### Language
한국어
