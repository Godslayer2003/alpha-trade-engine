# Built with the monorepo root as build context (see RAILWAY_DOCKERFILE_PATH in
# the deploy setup) — this service has no workspace deps, but keeping the
# context consistent with apps/api/Dockerfile simplifies the deploy story.
FROM python:3.12-slim

WORKDIR /app

COPY packages/ai-engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/ai-engine/app ./app

EXPOSE 8000

# Railway injects $PORT and expects the app to listen on it.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
