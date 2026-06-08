# Firefox Add-ons (AMO) — GitSyncMarks (한국어)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
GitHub, GitLab, Codeberg, Gitea 등으로 북마크 동기화. Linkwarden, Smart Search, Bitwarden 백업, 안내 마법사. 양방향, 안전, 프라이빗. 완전한 Firefox 지원. 중개자 없음.

### Detailed Description
GitSyncMarks는 GitHub, GitLab, Codeberg, Gitea, Forgejo 또는 Gogs와 북마크를 양방향 동기화합니다. 중개자 없음, 제3자 서버 없음 – 데이터는 완전히 사용자의 통제 하에 있습니다.

하이라이트

- 멀티 프로바이더 Git 동기화: GitHub, GitLab, Codeberg, Gitea, Forgejo 또는 Gogs — 프로필마다 고유 프로바이더 및 서버 URL 사용 가능.
- 프로필 전송 및 푸시 미러: 프로필 간 북마크 복사(교체 또는 병합); 각 동기화 후 선택적 push-only 백업 원격.
- 실시간 동기화 진행: 푸시, 풀 및 프로필 전환 중 단계 텍스트(예: `3 / 12 파일` 또는 `1 / 3` 단계).
- Bitwarden / Vaultwarden Git 백업: 비밀번호로 보호된 vault 내보내기를 저장소에 저장, 선택적 추가 암호화; 원격 백업 나열, 다운로드 또는 삭제.
- 중첩 카드 UI: 옵션, 설정 마법사, 팝업 및 검색에서 더 명확한 그룹화 섹션.
- 동기화 기록 및 복원: 과거 커밋 탐색, diff 미리보기로 변경 확인, 원클릭으로 이전 상태 복원.
- 원격 고아 정리: 로컬에 더 이상 존재하지 않는 원격 북마크 파일 미리보기 및 삭제.
- Linkwarden 시너지: 페이지 또는 링크를 Linkwarden 인스턴스에 직접 저장 — 뷰포트 스크린샷, 컬렉션 동기화 및 사전 정의 태그.
- Smart Search: 전용 초고속 북마크 검색, 라이트/다크 테마 및 완전한 키보드 탐색.
- 안내 설정 마법사: 연결 테스트는 액세스만 검증; 풀, 병합/동기화, 푸시, 폴더 설정 또는 건너뛰기 선택 — 저장소 쓰기 전 확인.
- Codeberg / Gitea 성능: Gitea 계열 호스트에서 빠른 git tree + blob 읽기 및 단일 커밋 푸시(필요 시 Contents API 폴백).
- 컨텍스트 메뉴: 빠른 폴더, 북마크 검색 팝업, 폴더 모두 열기, favicon 복사/다운로드 및 우클릭 프로필 작업.
- 설정 Git 동기화: 저장소의 암호화된 설정 백업(`settings.enc`) — 기기 간 설정 공유.

핵심 기능

- 프라이버시 by design: Git 프로바이더 API와 직접 통신. 제3자는 데이터를 볼 수 없음.
- Firefox 최적화: 네이티브 구조(도구 모음, 메뉴, 기타) 지원.
- 3-way 병합: 여러 기기의 동시 변경을 자동 처리하는 산업급 동기화.
- 단일 파일 저장: 각 북마크는 읽을 수 있는 JSON 파일 – 버전 관리 및 수동 편집에 이상적.
- 다중 프로필: 작업, 개인, 프로젝트용 최대 10개 프로필, 각각 고유 저장소.
- 자동화: CLI 또는 GitHub Actions로 북마크 추가; 확장 프로그램이 다음 동기화 시 통합.
- 생성 파일: README.md(개요), bookmarks.html(가져오기), RSS 피드 및 dashy-conf.yml — 파일별 선택.
- 디자인 및 i18n: 라이트, 다크 및 시스템 자동 테마; 조절 가능한 UI 밀도(컴팩트 / 중간 / 큰); 12개 언어.

동반 앱
GitSyncMarks-App(Android, iOS, Desktop)으로 모바일에서 Git 저장소의 북마크를 직접 관리. (참고: Firefox for Android는 확장 프로그램을 통한 직접 북마크 동기화를 지원하지 않습니다 – 앱을 사용하세요.)

GitSyncMarks는 오픈 소스: https://github.com/d0dg3r/GitSyncMarks

### Categories
Bookmarks

### Tags
bookmarks, sync, github, gitlab, backup, automation
