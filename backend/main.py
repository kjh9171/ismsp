from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import pandas as pd
import os
import shutil
from datetime import datetime

# PDF 관련 라이브러리
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

app = FastAPI()

# --- 한글 폰트 안전 로드 로직 ---
KOREAN_FONT = 'Helvetica' # 기본 폰트
FONT_PATH = "/app/NanumGothic.ttf"

if os.path.exists(FONT_PATH):
    try:
        pdfmetrics.registerFont(TTFont('NanumGothic', FONT_PATH))
        KOREAN_FONT = 'NanumGothic'
        print("✅ 한글 폰트 로드 성공: NanumGothic")
    except Exception as e:
        print(f"❌ 폰트 등록 실패: {e}")
else:
    print("⚠️ 경고: NanumGothic.ttf 파일을 찾을 수 없습니다. PDF 출력 시 한글이 깨질 수 있습니다.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/app/uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

EXCEL_FILE = "/app/ISMS-P.xlsx"
db_storage = {}

def get_isms_data():
    if not os.path.exists(EXCEL_FILE): return []
    try:
        df = pd.read_excel(EXCEL_FILE, sheet_name='ISMS-P', header=4)
        # 결측치 채우기 (Pandas 최신 버전 대응)
        df.iloc[:, 1] = df.iloc[:, 1].ffill()
        df.iloc[:, 2] = df.iloc[:, 2].ffill()
        
        items = []
        for _, row in df.iterrows():
            item_no = str(row.iloc[3]).strip() if pd.notna(row.iloc[3]) else ""
            if item_no and item_no.count('.') >= 2:
                stored = db_storage.get(item_no, {})
                items.append({
                    "id": item_no,
                    "main_cat": str(row.iloc[1]),
                    "sub_cat": str(row.iloc[2]),
                    "item_name": str(row.iloc[4]),
                    "content": str(row.iloc[5]),
                    "status": stored.get("status", "미작성"),
                    "description": stored.get("description", "-"),
                    "evidence_name": stored.get("evidence_name", "-")
                })
        return items
    except Exception as e:
        print(f"Excel Error: {e}")
        return []

@app.get("/api/isms-items")
async def read_items():
    return get_isms_data()

@app.post("/api/save-item")
async def save_item(data: dict):
    item_no = data.get("id")
    db_storage[item_no] = {
        "status": "작성완료",
        "description": data.get("description"),
        "evidence_name": data.get("evidence_name", "-")
    }
    return {"message": "저장 성공"}

@app.post("/api/ai/analyze-evidence")
async def analyze_evidence(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"recommended_item": "1.1.1", "filename": file.filename}

@app.get("/api/export-pdf")
async def export_pdf():
    pdf_path = os.path.join(UPLOAD_DIR, "ISMS_P_Final_Report.pdf")
    doc = SimpleDocTemplate(pdf_path, pagesize=landscape(A4), topMargin=30)
    elements = []
    
    styles = getSampleStyleSheet()
    # 한글 지원 스타일 정의
    korean_style = ParagraphStyle(
        name='KoreanStyle',
        fontName=KOREAN_FONT,
        fontSize=8,
        leading=10,
        wordWrap='CJK'
    )
    
    title_style = styles['Title']
    title_style.fontName = KOREAN_FONT
    
    elements.append(Paragraph("ISMS-P 인증 통제 항목 운영명세서", title_style))
    elements.append(Paragraph(f"출력 일시: {datetime.now().strftime('%Y-%m-%d %H:%M')}", korean_style))

    # 헤더 정의 (요청하신 7개 필드)
    header_text = ["번호", "분류(대/중)", "인증 항목 및 상세 기준", "운영 현황 (작성내용)", "증적자료명", "상태", "결과"]
    data = [[Paragraph(h, korean_style) for h in header_text]]
    
    isms_items = get_isms_data()
    for item in isms_items:
        result_tag = "완료" if item['status'] == "작성완료" else "작업중"
        
        row = [
            Paragraph(item['id'], korean_style),
            Paragraph(f"{item['main_cat']}<br/>({item['sub_cat']})", korean_style),
            Paragraph(f"<b>{item['item_name']}</b><br/><br/>{item['content']}", korean_style),
            Paragraph(item['description'], korean_style),
            Paragraph(item['evidence_name'], korean_style),
            Paragraph(item['status'], korean_style),
            Paragraph(result_tag, korean_style)
        ]
        data.append(row)

    table = Table(data, colWidths=[40, 90, 200, 220, 100, 60, 60])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkslategray),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    
    elements.append(table)
    doc.build(elements)
    return FileResponse(pdf_path, filename="ISMS_P_Report.pdf")