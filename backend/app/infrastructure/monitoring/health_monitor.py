"""
Container health probe.

Periodically pings every stack dependency (MongoDB, Elasticsearch, Redis) and
records the result into the `pokevinted_health` Elasticsearch index so Grafana can
render an "État des conteneurs" dashboard — without adding Prometheus/cAdvisor.

We measure *application-level* reachability (is the service answering + ping
latency), not CPU/RAM per container. If Elasticsearch itself is down, the probe
cannot persist anything: the resulting gap in the time series is itself the
signal that Elasticsearch was unavailable.
"""

import asyncio
import logging
import time
from datetime import UTC, datetime
from typing import Any

from elasticsearch import AsyncElasticsearch
from redis.asyncio import Redis

from app.infrastructure.persistence.elastic.client import HEALTH_INDEX

logger = logging.getLogger("pokevinted.health")

HEALTH_PROBE_INTERVAL_SECONDS = 15


async def _probe(name: str, container: str, check_fn) -> dict:
    """Run a single service ping and build a health document."""
    started = time.perf_counter()
    status = 0
    try:
        coro = check_fn()
        await asyncio.wait_for(coro, timeout=5)
        status = 1
    except Exception as exc:  # noqa: BLE001 - any failure means the service is down
        logger.debug("Health probe failed for %s: %s", name, exc)
    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    return {
        "@timestamp": datetime.now(UTC).isoformat(),
        "service": name,
        "container": container,
        "status": status,
        "status_label": "UP" if status == 1 else "DOWN",
        "latency_ms": latency_ms,
    }


async def _collect(
    mongo_client: Any,
    elastic_client: AsyncElasticsearch | None,
    redis_client: Redis | None,
) -> list[dict]:
    """Ping every dependency once and return their health documents."""
    async def _check_mongo():
        if mongo_client is None:
            raise RuntimeError("MongoDB client is not initialized")
        await mongo_client.admin.command("ping")

    async def _check_elastic():
        if elastic_client is None:
            raise RuntimeError("Elasticsearch client is not initialized")
        await elastic_client.ping()

    async def _check_redis():
        if redis_client is None:
            raise RuntimeError("Redis client is not initialized")
        await redis_client.ping()

    docs = [
        await _probe("MongoDB", "pokevinted-mongodb", _check_mongo),
        await _probe("Elasticsearch", "pokevinted-elasticsearch", _check_elastic),
        await _probe("Redis", "pokevinted-redis", _check_redis),
    ]
    # The backend is necessarily up if this loop is executing.
    docs.append(
        {
            "@timestamp": datetime.now(UTC).isoformat(),
            "service": "Backend API",
            "container": "pokevinted-backend",
            "status": 1,
            "status_label": "UP",
            "latency_ms": 0.0,
        }
    )
    return docs


async def run_health_monitor(
    mongo_client: Any,
    elastic_client: AsyncElasticsearch,
    redis_client: Redis,
    interval: int = HEALTH_PROBE_INTERVAL_SECONDS,
) -> None:
    """Continuously probe services and index their state into Elasticsearch."""
    logger.info("Container health monitor started (interval=%ss).", interval)
    while True:
        try:
            docs = await _collect(mongo_client, elastic_client, redis_client)
            operations: list[dict] = []
            for doc in docs:
                operations.append({"index": {"_index": HEALTH_INDEX}})
                operations.append(doc)
            await elastic_client.bulk(operations=operations, refresh=False)
        except asyncio.CancelledError:
            logger.info("Container health monitor stopped.")
            raise
        except Exception as exc:  # noqa: BLE001 - keep the loop alive across transient errors
            logger.warning("Health monitor tick failed (will retry): %s", exc)
        await asyncio.sleep(interval)
