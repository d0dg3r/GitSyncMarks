# Firefox Add-ons (AMO) — GitSyncMarks (한국어)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
GitHub 북마크 동기화. Linkwarden 연동, 스마트 검색 및 설정 마법사. 중간 서버 없이 완벽하게 독립적으로 Firefox 지원.

### Detailed Description
GitSyncMarks는 Firefox 북마크를 GitHub 저장소와 안전하게 연동하는 확장 프로그램입니다. 데이터를 다른 곳을 경유하지 않고 온전히 통제할 수 있습니다.

주요 강조 사항

- 동기화 기록 및 복원: 이전 커밋을 탐색하고, diff 미리보기로 변경 사항을 확인하고, 클릭 한 번으로 이전 북마크 상태를 복원합니다.
- 중복 수정: 동일한 이름의 폴더가 동기화할 때마다 늘어나지 않습니다 — 중복이 자동으로 병합됩니다.
- Linkwarden 시너지: Linkwarden 인스턴스에 직접 페이지를 저장합니다. 자동 스크린샷, 컬렉션 동기화, 태그를 지원합니다.
- 스마트 검색 (Smart Search): 빛의 속도로 작동하는 독립적인 검색 인터페이스입니다. 다크모드 및 완벽한 키보드 접근성을 제공합니다.
- 설정 마법사 안내: 토큰 발급부터 저장소 세팅 및 첫 동기화까지 초보자도 안심하고 진행할 수 있는 단계별 마법사를 적용했습니다.

핵심 기능

- 설계 단계부터 고려된 보안: 오로지 GitHub API만 직접 통신하므로 타사에서 데이터를 들여다보지 못합니다.
- Firefox 맞춤화: 도구 모음 및 기타 메뉴 북마크 계층 구조를 반영합니다.
- 개별 파일 저장: 각각의 북마크는 구조화된 JSON 형태로 관리됩니다.
- 멀티 프로필 지원: 직장, 개인 용도 등 최대 10개의 독립된 프로필과 저장소를 관리할 수 있습니다.
- 자동화 호환: CLI 등을 통해 추가된 링크 변동사항도, 확장 프로그램 구동 시 알아서 분석하여 병합됩니다.
- 파일 생성기: 원한다면 README.md, HTML, RSS 피드를 저장소에 자동으로 게시합니다.

보조 모바일 앱
GitSyncMarks-App (Android, iOS)을 사용하여 모바일에서 제어하세요. (참고: Firefox 모바일은 API가 지원되지 않으므로 개별 앱을 사용해야 합니다).

GitSyncMarks는 오픈 소스입니다: https://github.com/d0dg3r/GitSyncMarks

### Categories
Bookmarks

### Tags
bookmarks, sync, github, backup, automation
