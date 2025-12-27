FROM python:3.9-slim

WORKDIR /app

# 1. 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. 소스 코드 전체 복사 (이때 폴더에 NanumGothic.ttf가 있으면 함께 복사됨)
COPY . .

# 3. (선택 사항) 만약 폰트 파일이 소스 폴더 밖에 있거나 명시적으로 복사하고 싶을 때 사용
# 파일이 없을 때 빌드 오류가 난다면 이 라인을 주석(#) 처리하세요.
# COPY NanumGothic.ttf /app/NanumGothic.ttf

# 4. 실행 명령 (항상 맨 마지막에 위치)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]