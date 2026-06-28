import asyncio
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.email import router as email_router
from app.routers.tickets import router as tickets_router
from app.routers.users import router as users_router
from app.routers.webhooks import router as webhooks_router
from app.services.email_ingestor import run_poller

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    poller = asyncio.create_task(run_poller())
    yield
    poller.cancel()
    try:
        await poller
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Ticket Management System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(tickets_router)
app.include_router(email_router)
app.include_router(webhooks_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3000"))
    reload = os.getenv("RELOAD", "true").lower() != "false"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)
