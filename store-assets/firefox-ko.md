# Firefox Add-ons (AMO) — GitSyncMarks (한국어)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### 이름
GitSyncMarks

### 요약 (최대 250자)
GitHub 기반 북마크 동기화. Linkwarden 협업, 스마트 검색 및 컴패니언 앱. 양방향, 안전, 프라이버시 보호. 기본 메뉴 구조를 포함한 Firefox 완벽 지원. 중개 서버 없음.

### 상세 설명
GitSyncMarks는 북마크를 GitHub 저장소와 자동 및 양방향으로 동기화하는 Firefox용 전문가용 확장 프로그램입니다. GitSyncMarks 컴패니언 앱을 통해 데스크톱(Firefox 등)이나 모바일에서 편리하게 데이터를 관리하세요. 중개 서버나 제3자 서버가 없으므로 완벽한 제어권과 프라이버시를 보장합니다.

주요 특징

- Linkwarden 시너지: 페이지나 링크를 Linkwarden 인스턴스에 직접 저장하세요. 자동 뷰포트 스크린샷, 컬렉션 동기화, 미리 정의된 태그 기능이 포함되어 있습니다.
- 스마트 검색: 북마크 전용 초고속 검색 인터페이스를 제공합니다. 라이트 및 다크 테마를 지원하며 키보드만으로도 완벽하게 조작 가능합니다.
- 가이드 기반 설정 마법사: 단계별 온보딩 프로세스를 통해 토큰 설정부터 첫 동기화 성공까지 초보 사용자도 쉽게 안내합니다.
- 3-Way 병합: 여러 장치의 변경 사항을 지능적으로 결합하는 고급 병합 알고리즘으로 산업 수준의 안정성을 제공합니다.

핵심 기능

- 프라이버시 설계: GitHub API와 직접 통신합니다. 제3자는 사용자의 데이터를 볼 수 없습니다.
- Firefox 최적화: 기본 북마크 구조(도구 모음, 메뉴, 기타)를 지원합니다.
- 파일 기반 저장: 각 북마크는 사람이 읽을 수 있는 JSON 파일로 저장됩니다. 버전 관리 및 수동 편집에 최적화되어 있습니다.
- 멀티 프로필: 별도의 저장소를 통해 최대 10개의 독립적인 프로필(예: 업무용/개인용)을 관리할 수 있습니다.
- 자동화: CLI 또는 GitHub Actions를 통해 북마크를 추가하면 다음 동기화 시 자동으로 통합됩니다.
- 자동 생성 파일: 저장소에 README.md(개요), bookmarks.html(가져오기용), RSS 피드를 자동으로 생성합니다.

설치 및 설정

1. 설치: Firefox Add-ons (AMO)에서 GitSyncMarks를 설치하세요.
2. GitHub PAT: classic 'repo' 또는 fine-grained 'Contents: Read/Write' 권한이 있는 개인 액세스 토큰을 생성하세요.
3. 설정 마법사: 도움말 -> 시작하기의 안내를 따르세요.
4. Linkwarden (선택): Linkwarden 탭에서 인스턴스를 설정하세요.

컴패니언 앱
GitSyncMarks-App(Android, iOS, Desktop)을 사용하여 모바일에서도 GitHub 저장소의 북마크를 직접 관리할 수 있습니다. (참고: Android용 Firefox는 확장 프로그램을 통한 북마크 직접 동기화를 지원하지 않으므로 대신 본 앱을 사용하십시오).

GitSyncMarks는 오픈 소스입니다: https://github.com/d0dg3r/GitSyncMarks

### Categories
북마크

### Tags
bookmarks, sync, github, backup, automation
