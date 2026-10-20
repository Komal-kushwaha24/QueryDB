from fastapi import FastAPI

app = FastAPI(title="QueryDB AI Service")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
