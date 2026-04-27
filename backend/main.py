from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.company import router as company_router
from routers.hot_store import router as hot_store_router
from routers.materiality import router as materiality_router
from routers.workspace import router as workspace_router
from routers.emissions import router as emissions_router
from routers.policy import router as policy_router
from routers.assistant import router as assistant_router
from routers.auth import router as auth_router

app = FastAPI(title="Grevia API", version="0.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workspace_router)
app.include_router(company_router)
app.include_router(hot_store_router)
app.include_router(materiality_router)
app.include_router(emissions_router)
app.include_router(policy_router)
app.include_router(assistant_router)
app.include_router(auth_router)


@app.get("/health")
def health():
    return {"status": "ok"}
