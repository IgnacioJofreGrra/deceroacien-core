FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Dependencias básicas (ajusta si necesitas más)
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos backend y los estáticos que sirve Flask
COPY backend ./backend
COPY frontend ./frontend

ENV PORT=8080
EXPOSE 8080

WORKDIR /app/backend
CMD ["gunicorn", "--bind", "0.0.0.0:${PORT}", "app:app"]