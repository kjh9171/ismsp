# ismsp

제공해 드린 ISMS-P 관리 플랫폼의 프로젝트 구조와 주요 기능을 바탕으로, 협업이나 포트폴리오 활용에 적합한 **README.md** 초안을 작성해 드립니다.

---

# 🛡️ ISMS-P Compliance AI Platform

본 프로젝트는 기업의 **ISMS-P(정보보호 및 개인정보보호 관리체계)** 인증 준비를 효율화하기 위한 관리 플랫폼입니다. 엑셀 기반의 복잡한 업무를 웹 대시보드로 전환하고, AI 분석 기능을 통해 증적 자료 매핑 및 운영 현황 작성을 보조합니다.

---

## 🏗️ 프로젝트 구조 (Source Tree)

이 프로젝트는 **FastAPI(Backend)**와 **React(Frontend)**를 결합한 모노레포 구조이며, **Docker**를 통해 손쉽게 배포할 수 있도록 설계되었습니다.

```text
isms-p-platform/
├── backend/                # FastAPI 서버 폴더
│   ├── main.py             # API 엔드포인트 및 로직 (PDF 생성, AI 분석)
│   ├── requirements.txt    # 백엔드 의존성 패키지 (pandas, reportlab 등)
│   ├── uploads/            # 업로드된 증적 파일 저장소
│   └── ISMS-P.xlsx         # 인증 항목 원천 데이터 (v2.3)
├── frontend/               # React 클라이언트 폴더
│   ├── src/
│   │   ├── App.js          // 대시보드 UI 및 상태 관리 메인 코드
│   │   └── index.js        // React 진입점
│   ├── package.json        # 프론트엔드 의존성 (Ant Design, axios 등)
│   └── public/             # 정적 리소스
├── docker-compose.yml      # 전체 컨테이너 오케스트레이션 설정
└── README.md               # 프로젝트 매뉴얼

```

---

## 🚀 주요 기능 (Key Features)

### 1. 실시간 대시보드 및 진척률 관리

* **인증 준비 현황:** 작성 완료된 통제 항목 개수를 실시간으로 계산하여 상단 Progress Bar에 반영합니다.
* **대/중분류 자동 추출:** 엑셀 시트에서 분류 체계를 파악하여 리스트에 계층적으로 표시합니다.

### 2. 가독성 중심의 리스트 뷰

* **영역별 음영 처리:** 관리체계(1.x), 보호대책(2.x), 개인정보 처리(3.x) 영역을 색상별로 구분하여 시각적 피로도를 낮췄습니다.
* **자동 줄바꿈 지원:** 상세 기준과 운영 현황이 길어도 잘리지 않고 웹 화면에 최적화되어 출력됩니다.

### 3. AI 기반 증적 관리

* **증적 파일 분석:** 파일 업로드 시 파일명을 분석하여 적절한 인증 항목을 추천합니다.
* **AI 초안 생성:** 특정 항목에 대한 운영 현황 작성이 어려울 때 AI가 기초 템플릿을 생성합니다.

### 4. 운영명세서 PDF 출력

* **테이블 레이아웃:** 작성된 모든 항목과 매핑된 증적 자료명을 포함하여 공식적인 PDF 보고서 형식으로 출력합니다.

---

## 🛠️ 설치 및 실행 방법 (Installation)

### 전제 조건

* **Docker** 및 **Docker Compose**가 설치되어 있어야 합니다.
* `backend/` 폴더 내에 인증 기준이 담긴 `ISMS-P.xlsx` 파일이 존재해야 합니다.

### 실행 순서

1. **저장소 클론:**
```bash
git clone https://github.com/your-repo/isms-p-platform.git
cd isms-p-platform

```


2. **컨테이너 빌드 및 실행:**
```bash
docker-compose up --build -d

```


3. **접속 정보:**
* **Frontend:** `http://localhost:3000`
* **Backend API:** `http://localhost:8000/docs`



---

## 📚 기술 스택 (Tech Stack)

| 구분 | 기술 | 주요 라이브러리 |
| --- | --- | --- |
| **Frontend** | React | Ant Design, Axios, Lucide Icons |
| **Backend** | FastAPI (Python) | Pandas, ReportLab, Openpyxl |
| **DevOps** | Docker | Docker Compose |

---

## 📝 향후 로드맵 (Roadmap)

* [ ] **DB 연동:** 현재 메모리 저장 방식을 SQLite/PostgreSQL로 전환하여 데이터 영구 보존.
* [ ] **멀티 유저:** 팀 단위 협업을 위한 계정 관리 및 로그 기록 기능.
* [ ] **한글 폰트 최적화:** 도커 컨테이너 내 한글 폰트 주입으로 PDF 출력 품질 향상.

---



