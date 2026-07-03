import asyncio
import logging
import os
from contextlib import asynccontextmanager

import sentry_sdk
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from app.routers.dashboard import router as dashboard_router
from app.routers.email import router as email_router
from app.routers.tickets import router as tickets_router
from app.routers.users import router as users_router
from app.routers.webhooks import router as webhooks_router
from app.services.email_ingestor import run_poller

load_dotenv()

logger = logging.getLogger(__name__)

for _var in ("SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL", "WEBHOOK_SECRET"):
    if not os.getenv(_var):
        logger.warning("%s is not set — related email functionality will be disabled", _var)

sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=os.getenv("SENTRY_ENVIRONMENT", "development"),
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        # Sends request headers and IP for users — see
        # https://docs.sentry.io/platforms/python/data-management/data-collected/
        send_default_pii=True,
    )
else:
    logger.info("SENTRY_DSN is not set — error reporting to Sentry is disabled")


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
app.include_router(dashboard_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3000"))
    reload = os.getenv("RELOAD", "true").lower() != "false"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)
