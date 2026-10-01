# ainsonic-web-main (아인소닉 홈페이지)

`www.ainsonic.com`으로 배포되는 **아인소닉 홈페이지**(공식 서비스명)입니다. 음향·영상·CCTV·네트워크·통합제어 설계시공 B2B 소개 및 문의 접수용 단일 페이지(SPA)입니다. 로고/워드마크는 기존처럼 `AINSONIC`을 보조 브랜드로 유지합니다.

## 서비스 구성 (공식 명칭)

| 서비스명 | 도메인 |
|---|---|
| 아인소닉 홈페이지 | www.ainsonic.com (본 저장소) |
| 프로오디오뉴스 | news.ainsonic.com |
| 사이트관리센터 | works.ainsonic.com (검색엔진 미노출, 랜딩 자체는 공개 URL이고 관리 기능만 Apps Script "나만" 권한으로 제한) |

## 외부 연동 (로직 변경 없음, 확인용 기록)

- 공지사항: `notices.json`을 주기적으로 fetch (`NOTICE_JSON_URL = "/notices.json"`). 사이트관리센터에서 관리되어 반영되도록 설계된 소스입니다(자동 반영 파이프라인의 실제 가동 여부는 별도 확인 필요).
- 메인 배너: `banners.json`을 주기적으로 fetch (`BANNER_JSON_URL = "/banners.json"`). 동일하게 사이트관리센터가 갱신 소스입니다.
- 업계 소식: `https://news.ainsonic.com/rss.xml`, `https://news.ainsonic.com/news.json`을 fetch하여 프로오디오뉴스 소식을 가져옵니다.
- 문의 폼: `INQUIRY_ENDPOINT`(Google Apps Script, `mode:"no-cors"` POST)로 전송합니다. 엔드포인트 URL은 변경하지 않았습니다.

## 유지한 것

- 기존 레이아웃/디자인 톤, JSON 스키마, 이미지 경로, 개인정보 노출 범위를 그대로 유지했습니다.
- 상단 내비게이션에 사이트관리센터(works.ainsonic.com) 링크는 추가하지 않았습니다(기존에도 없었음).
