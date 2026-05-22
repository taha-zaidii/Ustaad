"""Postgres data loader for training the CF model from real data."""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator

import psycopg2
from psycopg2.extras import RealDictCursor

log = logging.getLogger(__name__)


@contextmanager
def _connect(database_url: str) -> Iterator[psycopg2.extensions.connection]:
    conn = psycopg2.connect(database_url, sslmode="require")
    try:
        yield conn
    finally:
        conn.close()


def fetch_interactions(database_url: str) -> list[tuple[str, str, float]]:
    """Return (client_id, freelancer_id, weight) implicit-feedback events.

    Sources of positive signal:
      - accepted proposals  (weight 2.0)
      - reviews             (weight 1.0 + rating/5.0)
      - jobs awarded        (weight 1.5)

    Returns [] on any DB error so the service stays up.
    """
    sql = """
    SELECT j.client_id::text   AS client_id,
           p.freelancer_id::text AS freelancer_id,
           CASE p.status
             WHEN 'accepted'  THEN 2.0
             WHEN 'completed' THEN 2.5
             ELSE              0.5
           END AS weight
      FROM proposals p
      JOIN jobs j ON j.id = p.job_id
     WHERE p.status IN ('accepted', 'completed')
    UNION ALL
    SELECT j.client_id::text,
           r.freelancer_id::text,
           1.0 + COALESCE(r.rating, 0) / 5.0 AS weight
      FROM reviews r
      JOIN jobs j ON j.id = r.job_id
    """
    try:
        with _connect(database_url) as conn, conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
    except Exception as exc:  # noqa: BLE001
        log.warning("fetch_interactions failed: %s", exc)
        return []

    return [(str(r[0]), str(r[1]), float(r[2])) for r in rows]


def fetch_freelancer_docs(database_url: str) -> list[dict]:
    """Lightweight projection of freelancer profiles for offline benchmarking."""
    sql = """
    SELECT p.clerk_id::text AS id,
           p.full_name,
           p.bio,
           p.location,
           p.rating,
           COALESCE(
             ARRAY(
               SELECT s.name
                 FROM freelancer_skills fs
                 JOIN skills s ON s.id = fs.skill_id
                WHERE fs.profile_id = p.id
             ),
             ARRAY[]::text[]
           ) AS skills
      FROM profiles p
     WHERE p.user_type = 'freelancer'
    """
    try:
        with _connect(database_url) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql)
                rows = cur.fetchall()
    except Exception as exc:  # noqa: BLE001
        log.warning("fetch_freelancer_docs failed: %s", exc)
        return []
    return [dict(r) for r in rows]
