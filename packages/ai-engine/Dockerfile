# Built with the monorepo root as the Render Docker context. This service has
# no workspace deps, but keeping the
# context consistent with apps/api/Dockerfile simplifies the deploy story.
FROM python:3.12-slim

WORKDIR /app

COPY packages/ai-engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/ai-engine/app ./app

EXPOSE 8000

# Render injects $PORT and expects the app to listen on it.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
