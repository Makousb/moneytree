# Analytics service image: Python + the Tesseract OCR engine (for receipt
# scanning). pytesseract finds the `tesseract` binary on PATH automatically.
FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render injects PORT; default to 8000 for local `docker run`.
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
