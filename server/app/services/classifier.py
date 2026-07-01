import asyncio
import logging
import os

import httpx

logger = logging.getLogger(__name__)

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:3001")

_RETRY_DELAYS_SECONDS = [1, 2, 4]


async def classify_ticket(ticket_id: str, subject: str, body: str, from_name: str | None = None) -> None:
    """Queue a ticket for GPT classification on the auth service's pg-boss worker.

    Fire-and-forget: called out-of-band from ticket creation, never raises. The
    actual GPT call and category write-back happen asynchronously in the auth
    service's worker, which retries on failure via pg-boss. This function retries
    the enqueue call itself so a brief auth-service outage doesn't silently and
    permanently leave a ticket unclassified.
    """
    payload = {
        "ticket_id": ticket_id,
        "ticket_subject": subject,
        "ticket_body": body,
        "from_name": from_name,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        for attempt, delay in enumerate([0, *_RETRY_DELAYS_SECONDS]):
            if delay:
                await asyncio.sleep(delay)
            try:
                resp = await client.post(f"{AUTH_SERVICE_URL}/api/auth/ai/classify", json=payload)
                resp.raise_for_status()
                return
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code < 500:
                    logger.error("Classification enqueue rejected for ticket %s: %s", ticket_id, exc.response.text)
                    return
                logger.warning("Classification enqueue failed (attempt %d) for ticket %s", attempt + 1, ticket_id)
            except httpx.RequestError:
                logger.warning("Classification enqueue failed (attempt %d) for ticket %s", attempt + 1, ticket_id)

    logger.error("Giving up on classification enqueue for ticket %s after %d attempts", ticket_id, len(_RETRY_DELAYS_SECONDS) + 1)
