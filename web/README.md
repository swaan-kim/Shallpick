# Shallpick PWA

Shallpick SwiftUI 앱의 UI와 상호작용을 웹으로 이식한 **로컬 목업**입니다. 원본 iOS 프로젝트는 변경하지 않습니다. 사용자의 요청에 따라 Supabase 연결은 후속 단계로 남겼습니다.

## 실행

Node.js 22.18 이상 또는 24 LTS를 사용합니다.

```sh
cd web
npm ci
npm run dev
npm test
npm run build
npm run test:build
npm run preview
```

배포 결과물은 `dist/`입니다. HTTPS 정적 호스팅에 배포할 수 있고, 상대 경로와 hash 라우팅으로 하위 경로 배포 및 새로고침을 지원합니다.

## 원본과의 대응

| 기능 | 웹 목업 |
| --- | --- |
| 로그인 | 기존 수달/로고/카카오 버튼 재사용. 카카오 버튼은 미연결 안내, 별도의 목업 시작 버튼 제공 |
| 홈 | 동일한 4장 사진 부채꼴 카드, 검색, 폴더 생성, 끌어서 정렬, 길게 누르기/우클릭으로 순서 이동 |
| 폴더 | 2–6열 그리드, 핀치 조절, 다중 선택, 내 사진/좋아요 필터, 파일 선택 업로드 |
| 사진 상세 | 좌우 이동, 더블 클릭 하트, 8가지 반응, 댓글, 내 댓글 삭제, 파일 저장/지원 기기에서 공유 |
| 초대 | 코드/HTTPS 링크/QR 생성과 카메라 스캔. 현재 브라우저의 목업 폴더 코드만 인식 |
| 채팅 | 로컬 메시지, 질문 첨부, 읽음 수, 응답 완료 상태 |
| 질문 | 사진 선택, 수신자 선택, 질문 작성, 중복 샘플 사진 추리기 및 되돌리기 |
| 응답/결과 | 사진별 좋아/싫어, 위치 댓글, 전체 사진 응답 완료 후 확인 표시, 결과 집계 |
| 설정 | 닉네임 변경, 로컬 알림 설정, 설치 안내, 목업 종료/초기화 |
| PWA | standalone manifest, 192/512/maskable 아이콘, Apple touch icon, 서비스 워커, 업데이트 안내, 오프라인 앱 셸 |

`public/assets/`는 원본 `Shallpick/Assets.xcassets`에서 복사했습니다. 데모 사진은 기존 앱의 `ci/figma-review-result` 시연 에셋을 재사용하며 출처는 `public/samples/CREDITS.md`에 있습니다. 새 디자인이나 외부 폰트를 추가하지 않았습니다.

## 데이터와 목업 경계

- 사진과 수정 내용은 `IndexedDB`의 `shallpick-mock-v1`에 저장합니다. 서버로 업로드하지 않습니다. 브라우저 데이터 삭제 시 함께 삭제됩니다.
- 카카오 인증, 실제 사용자 간 초대/공유/채팅, 원격 DB, 실제 푸시는 연결되지 않았습니다. 로그인 성공이나 상대방 응답을 가장하지 않습니다.
- 수달 추천은 **동일 이미지 문자열을 그룹화하는 목업**입니다. iOS의 Apple Vision 미적 점수/얼굴 품질/유사도 분석과 동일한 AI 기능이 아닙니다.
- 사진 추가는 한 번에 30장, 개별 25MB 이하이며 브라우저가 읽을 수 있는 이미지를 최대 2048px JPEG로 변환합니다. HEIC 등 미지원 형식은 오류를 표시합니다.
- QR 카메라와 시스템 공유는 HTTPS 및 브라우저 권한/지원에 따라 달라집니다. 코드 입력과 다운로드 대안을 제공합니다.
- 앱 리소스와 공개 시연 사진만 precache합니다. 이후 인증/API/서명된 비공개 사진 응답을 서비스 워커에 무분별하게 캐시하면 안 됩니다.
- PWA 최초 방문은 온라인이 필요합니다. 설치와 실제 카메라/공유 UX는 휴대폰 실기기 검증이 추가로 필요합니다.

## Supabase 후속 연결

`src/repository.ts`가 현재 목업의 저장 경계이고 `src/model.ts`가 UI 모델입니다. 실제 연결 시에는 단일 State 저장을 테이블별 인증된 작업으로 교체해야 합니다. 현재 UI 모델에 미리 `folderId`, `userId`, `messageId`, `photoId` 관계를 유지했습니다.

| 현재 모델 | 기존 Supabase 테이블/RPC |
| --- | --- |
| 프로필/닉네임 | `profiles` |
| 폴더/멤버/초대 | `folders`, `folder_members`, `my_folders`, `create_folder`, `join_folder` |
| 사진 | `photos`, Storage `photos` private bucket 및 signed URL |
| 메시지/확인 | `messages`, `message_checks`, Realtime 구독 |
| 반응/댓글 | `photo_reactions`, `photo_comments` |
| 투표/위치 댓글 | `question_votes`, `question_pins` |

필요한 후속 설정은 프로젝트 URL, publishable/anon key, Kakao OAuth redirect URL과 Supabase 허용 URL입니다. service-role key와 Kakao client secret은 브라우저 번들에 넣지 않습니다. 기존 `supabase/migrations/`와 RLS를 보존하면서 연동하고, 목업 데이터를 실제 계정 데이터에 자동으로 합치지 않습니다.

## 검증

- TypeScript 검사 및 Vite production build
- 상태 로직 4개 검사: 초대 파싱, 사용자별 반응 토글, 투표 교체/완료 조건, 내 사진 삭제와 참조 정리
- PWA 산출물 2개 검사: manifest/아이콘 실제 크기, 오프라인 precache 리소스
- 실제 브라우저에서 홈/폴더/채팅/질문 작성/중복 추천/투표 완료 흐름과 Chrome 파일 선택 업로드 확인
- `npm audit --omit=dev`: 취약점 0. 빌드 도구 의존성에는 현재 npm audit 경고 12개(상위 패키지 포함)가 남아 있으며 정적 배포의 런타임에는 포함되지 않습니다. 강제 다운그레이드는 적용하지 않았습니다.

## 호스팅

공유 주소: https://shallpick-pwa-swaan.mayjing412.chatgpt.site

링크를 받은 사람이 휴대폰과 PC에서 접속할 수 있도록 공개 배포합니다. 사진과 의견은 각 브라우저에만 저장되므로 기기 간 데이터 동기화는 Supabase 연결 후 지원합니다.

Shallpick 전용 배포 ID: `appgprj_6afdcb82428c81919ebe5c63cca5e5f2`

사이트 소스에는 `.openai/hosting.json`의 `static.directory = dist`를 사용합니다. GitHub의 이 `web/` 폴더가 개발 원본이며, 변경 시 테스트/빌드 후 배포 소스와 산출물을 동기화합니다. 새 호스팅 프로젝트를 중복 생성하지 않습니다.

추가 확인: Chrome에서 서비스 워커 오프라인 준비 완료 및 설치 버튼을 확인했습니다. 테스트 서버를 종료한 후 일반 URL 탐색으로 앱을 다시 열어 홈/폴더/직접 추가한 사진이 유지됨을 확인했습니다. 도구의 강제 새로고침은 서비스 워커를 우회하므로 오프라인 테스트에는 일반 탐색을 사용했습니다.
