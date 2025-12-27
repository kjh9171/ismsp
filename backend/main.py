from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import create_engine, Column, String, Text, Integer, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import pandas as pd
import os
import shutil

# PDF 생성을 위한 라이브러리
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# --- DB 설정 ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://isms_user:isms_password@db/isms_p_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ISMSResult(Base):
    __tablename__ = "isms_results"
    id = Column(Integer, primary_key=True, index=True)
    year = Column(String)          
    round_name = Column(String)    
    item_id = Column(String)       
    description = Column(Text)     
    evidence_name = Column(String) 
    status = Column(String)        

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

EXCEL_FILE = "/app/ISMS-P.xlsx"
TOTAL_ITEMS = 102

# --- PDF 한글 폰트 설정 ---
FONT_NAME = "NanumGothic"
# Docker 이미지 내에 폰트 파일이 있어야 합니다. (경로: /app/fonts/NanumGothic.ttf)
FONT_PATH = "/app/NanumGothic.ttf" 

def register_korean_font():
    if os.path.exists(FONT_PATH):
        try:
            pdfmetrics.registerFont(TTFont(FONT_NAME, FONT_PATH))
            return FONT_NAME
        except Exception as e:
            print(f"Font Registration Error: {e}")
    return "Helvetica" # 실패 시 기본 폰트 (한글 깨짐 발생 가능)

@app.get("/api/isms-items")
async def read_items(year: str, round_name: str):
    db = SessionLocal()
    try:
        df = pd.read_excel(EXCEL_FILE, sheet_name='ISMS-P', header=4)
        df.iloc[:, 1:3] = df.iloc[:, 1:3].ffill()
        saved = db.query(ISMSResult).filter(ISMSResult.year == year, ISMSResult.round_name == round_name).all()
        db_map = {r.item_id: r for r in saved}
        items = []
        for _, row in df.iterrows():
            item_no = str(row.iloc[3]).strip()
            if item_no and item_no.count('.') >= 2:
                stored = db_map.get(item_no)
                items.append({
                    "id": item_no,
                    "main_cat": str(row.iloc[1]),
                    "sub_cat": str(row.iloc[2]),
                    "item_name": str(row.iloc[4]),
                    "content": str(row.iloc[5]),
                    "status": stored.status if stored else "미작성",
                    "description": stored.description if stored else "-",
                    "evidence_name": stored.evidence_name if stored else "-"
                })
        return items
    finally:
        db.close()

@app.post("/api/save-item")
async def save_item(data: dict):
    db = SessionLocal()
    try:
        item = db.query(ISMSResult).filter(
            ISMSResult.year == data['year'],
            ISMSResult.round_name == data['round_name'],
            ISMSResult.item_id == data['id']
        ).first()
        if item:
            item.description = data['description']
            item.evidence_name = data['evidence_name']
            item.status = "작성완료"
        else:
            db.add(ISMSResult(
                year=data['year'], round_name=data['round_name'],
                item_id=data['id'], description=data['description'],
                evidence_name=data['evidence_name'], status="작성완료"
            ))
        db.commit()
        return {"message": "Success"}
    finally:
        db.close()

@app.get("/api/statistics")
async def get_statistics():
    db = SessionLocal()
    try:
        stats = db.query(ISMSResult.year, ISMSResult.round_name, func.count(ISMSResult.id))\
                  .filter(ISMSResult.status == "작성완료")\
                  .group_by(ISMSResult.year, ISMSResult.round_name).all()
        return [{"label": f"{s[0]} {s[1]}", "percent": round((s[2]/TOTAL_ITEMS)*100, 1)} for s in stats]
    finally:
        db.close()

# --- PDF 출력 API ---
@app.get("/api/export-pdf")
async def export_pdf(year: str, round_name: str):
    k_font = register_korean_font()
    pdf_path = f"/app/ISMS_Report_{year}_{round_name}.pdf"
    
    doc = SimpleDocTemplate(pdf_path, pagesize=landscape(A4))
    elements = []
    
    db = SessionLocal()
    saved_data = db.query(ISMSResult).filter(ISMSResult.year == year, ISMSResult.round_name == round_name).all()
    db.close()

    # 데이터 생성 (헤더 포함)
    data = [["번호", "항목명", "운영 현황 (이행 내용)", "증적 자료명", "상태"]]
    for item in saved_data:
        data.append([item.item_id, item.description[:20] + "...", item.description, item.evidence_name, item.status])

    # 테이블 스타일 설정 (한글 폰트 적용)
    table = Table(data, colWidths=[50, 100, 400, 150, 50])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), k_font), # 테이블 전체에 한글 폰트 적용
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    return FileResponse(pdf_path, media_type='application/pdf', filename=f"ISMS_Report_{year}.pdf")