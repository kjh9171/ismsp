from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Text, Integer, JSON, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import pandas as pd
import os
import shutil
from datetime import datetime

# --- DB 설정 ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://isms_user:isms_password@db/isms_p_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- DB 모델 ---
class ISMSItem(Base):
    __tablename__ = "isms_results"
    id = Column(Integer, primary_key=True, index=True)
    year = Column(String)          # 연도
    round_name = Column(String)    # 최초/사후1/사후2/갱신
    item_id = Column(String)       # 항목번호 (1.1.1)
    description = Column(Text)     # 운영현황
    evidence_name = Column(String) # 증적명
    status = Column(String)        # 상태

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

EXCEL_FILE = "/app/ISMS-P.xlsx"

@app.get("/api/isms-items")
async def read_items(year: str, round_name: str):
    db = SessionLocal()
    try:
        # 1. 엑셀 로드
        df = pd.read_excel(EXCEL_FILE, sheet_name='ISMS-P', header=4)
        df.iloc[:, 1:3] = df.iloc[:, 1:3].ffill()
        
        # 2. DB에서 해당 연도/차수 데이터 조회
        saved_items = db.query(ISMSItem).filter(ISMSItem.year == year, ISMSItem.round_name == round_name).all()
        db_data = {item.item_id: item for item in saved_items}
        
        items = []
        for _, row in df.iterrows():
            item_no = str(row.iloc[3]).strip()
            if item_no and item_no.count('.') >= 2:
                stored = db_data.get(item_no)
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
        item = db.query(ISMSItem).filter(
            ISMSItem.year == data['year'],
            ISMSItem.round_name == data['round_name'],
            ISMSItem.item_id == data['id']
        ).first()
        
        if item:
            item.description = data['description']
            item.evidence_name = data['evidence_name']
            item.status = "작성완료"
        else:
            new_item = ISMSItem(
                year=data['year'],
                round_name=data['round_name'],
                item_id=data['id'],
                description=data['description'],
                evidence_name=data['evidence_name'],
                status="작성완료"
            )
            db.add(new_item)
        db.commit()
        return {"status": "success"}
    finally:
        db.close()

@app.get("/api/statistics")
async def get_statistics():
    db = SessionLocal()
    try:
        # 모든 연도/차수별 완료된 항목 개수 집계
        results = db.query(ISMSItem.year, ISMSItem.round_name).filter(ISMSItem.status == "작성완료").all()
        stats_dict = {}
        for r in results:
            key = f"{r.year} {r.round_name}"
            stats_dict[key] = stats_dict.get(key, 0) + 1
            
        total_isms = 102
        return [{"label": k, "percent": round((v/total_isms)*100, 1)} for k, v in stats_dict.items()]
    finally:
        db.close()

# AI 분석 및 PDF 출력 코드는 기존과 동일하게 유지