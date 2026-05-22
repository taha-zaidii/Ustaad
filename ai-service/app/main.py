"""FastAPI entry point for the Ustaad matching service."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, status

from . import __version__
from .config import Settings, get_settings
from .data.loader import fetch_interactions
from .data.synthetic import generate as generate_synthetic
from .recommender.collaborative import CollaborativeRecommender
from .recommender.content_based import ContentBasedRecommender
from .recommender.hybrid import HybridRecommender
from .schemas import (
    CollaborativeRequest,
    ContentMatchRequest,
    HealthResponse,
    HybridRequest,
    MatchResponse,
    MatchScore,
)

log = logging.getLogger("uvicorn.error")


class ServiceState:
    """Singletons shared across requests."""

    def __init__(self) -> None:
        self.content: ContentBasedRecommender | None = None
        self.collab: CollaborativeRecommender | None = None
        self.hybrid: HybridRecommender | None = None
        self.db_connected: bool = False


state = ServiceState()


def _train_models(settings: Settings) -> None:
    content = ContentBasedRecommender(
        min_df=settings.content_min_df,
        max_features=settings.content_max_features,
    )
    collab = CollaborativeRecommender(
        n_factors=settings.cf_n_factors,
        random_state=settings.cf_random_state,
    )

    interactions: list[tuple[str, str, float]] = []
    db_ok = False
    if settings.database_url:
        interactions = fetch_interactions(settings.database_url)
        db_ok = True

    if not interactions:
        log.info("No live interactions found; bootstrapping CF with synthetic data.")
        synth = generate_synthetic()
        interactions = synth.interactions

    collab.fit(interactions)

    state.content = content
    state.collab = collab
    state.hybrid = HybridRecommender(
        content=content,
        collaborative=collab,
        content_weight=settings.hybrid_content_weight,
        collab_weight=settings.hybrid_collab_weight,
    )
    state.db_connected = db_ok
    log.info(
        "Models ready (CF trained on %d interactions, db_connected=%s)",
        len(interactions),
        db_ok,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _train_models(get_settings())
    yield


app = FastAPI(
    title="Ustaad Matching Service",
    description="TF-IDF + cosine and matrix-factorization recommenders.",
    version=__version__,
    lifespan=lifespan,
)


def require_token(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    expected = f"Bearer {settings.ai_service_token}"
    if not authorization or authorization != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid bearer token",
        )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok" if state.content and state.collab else "degraded",
        version=__version__,
        db_connected=state.db_connected,
        cf_model_trained=bool(state.collab and state.collab.is_trained),
    )


@app.post(
    "/match/content",
    response_model=MatchResponse,
    dependencies=[Depends(require_token)],
)
def match_content(req: ContentMatchRequest) -> MatchResponse:
    if state.content is None:
        raise HTTPException(status_code=503, detail="recommender not ready")
    job = req.job.model_dump()
    cands = [c.model_dump() for c in req.candidates]
    scored = state.content.score(job, cands)[: req.top_k]
    return MatchResponse(
        job_id=req.job.id,
        strategy="content",
        matches=[
            MatchScore(
                freelancer_id=s.freelancer_id,
                score=round(s.combined, 6),
                rank=idx + 1,
                explanation={
                    "cosine": round(s.cosine, 6),
                    "skill_overlap": round(s.skill_overlap, 6),
                    "location_match": s.location_match,
                },
            )
            for idx, s in enumerate(scored)
        ],
    )


@app.post(
    "/match/collaborative",
    response_model=MatchResponse,
    dependencies=[Depends(require_token)],
)
def match_collaborative(req: CollaborativeRequest) -> MatchResponse:
    if state.collab is None or not state.collab.is_trained:
        raise HTTPException(status_code=503, detail="cf model not trained")
    scored = state.collab.recommend(
        req.client_id, candidates=req.candidates, top_k=req.top_k
    )
    return MatchResponse(
        job_id=req.client_id,
        strategy="collaborative",
        matches=[
            MatchScore(
                freelancer_id=s.freelancer_id,
                score=round(s.score, 6),
                rank=idx + 1,
                explanation={"cold_start": float(s.is_cold_start)},
            )
            for idx, s in enumerate(scored)
        ],
    )


@app.post(
    "/match/hybrid",
    response_model=MatchResponse,
    dependencies=[Depends(require_token)],
)
def match_hybrid(req: HybridRequest) -> MatchResponse:
    if state.hybrid is None:
        raise HTTPException(status_code=503, detail="hybrid recommender not ready")
    job = req.job.model_dump()
    cands = [c.model_dump() for c in req.candidates]
    scored = state.hybrid.score(
        job, cands, client_id=req.client_id, top_k=req.top_k
    )
    return MatchResponse(
        job_id=req.job.id,
        strategy="hybrid",
        matches=[
            MatchScore(
                freelancer_id=s.freelancer_id,
                score=round(s.score, 6),
                rank=idx + 1,
                explanation={
                    "content": round(s.content_score, 6),
                    "collaborative": round(s.collaborative_score, 6),
                },
            )
            for idx, s in enumerate(scored)
        ],
    )
