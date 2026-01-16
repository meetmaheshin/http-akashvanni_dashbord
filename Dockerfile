FROM python:3.11-slim

WORKDIR /app

# Copy backend requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/app/ ./app/

# Expose port (Railway provides PORT env var)
EXPOSE 8000

# Start command - main.py is inside app folder
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
