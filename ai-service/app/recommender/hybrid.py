"""Hybrid recommender combining content-based and collaborative signals."""
from __future__ import annotations

from dataclasses import dataclass

from .collaborative import CollaborativeRecommender
from .content_based import ContentBasedRecommender


@dataclass(frozen=True)
class HybridScore:
    freelancer_id: str
    score: float
    content_score: float
    collaborative_score: float


class HybridRecommender:
    """Linear blend of content-based and collaborative scores.

    Falls back gracefully:
      - no CF model trained → content-only (weight renormalized to 1.0)
      - no client_id (anonymous client) → content-only
      - candidate unseen by CF → content-only for that candidate
    """

    def __init__(
        self,
        content: ContentBasedRecommender,
        collaborative: CollaborativeRecommender,
        content_weight: float = 0.6,
        collab_weight: float = 0.4,
    ) -> None:
        if not 0.0 <= content_weight <= 1.0:
            raise ValueError("content_weight must be in [0, 1]")
        if not 0.0 <= collab_weight <= 1.0:
            raise ValueError("collab_weight must be in [0, 1]")
        self._content = content
        self._collab = collaborative
        self._w_c = content_weight
        self._w_cf = collab_weight

    def score(
        self,
        job: dict,
        candidates: list[dict],
        client_id: str | None = None,
        top_k: int = 10,
    ) -> list[HybridScore]:
        content_scores = self._content.score(job, candidates)
        content_by_id = {s.freelancer_id: s.combined for s in content_scores}

        cf_by_id: dict[str, float] = {}
        if client_id and self._collab.is_trained:
            cand_ids = [str(c["id"]) for c in candidates]
            cf = self._collab.recommend(client_id, candidates=cand_ids, top_k=len(cand_ids))
            cf_by_id = {s.freelancer_id: s.score for s in cf}

        use_cf = bool(cf_by_id)
        w_c = self._w_c if use_cf else 1.0
        w_cf = self._w_cf if use_cf else 0.0
        total = w_c + w_cf
        w_c, w_cf = w_c / total, w_cf / total

        blended: list[HybridScore] = []
        for cand in candidates:
            fid = str(cand["id"])
            cs = content_by_id.get(fid, 0.0)
            cfs = cf_by_id.get(fid, 0.0)
            blended.append(
                HybridScore(
                    freelancer_id=fid,
                    score=w_c * cs + w_cf * cfs,
                    content_score=cs,
                    collaborative_score=cfs,
                )
            )

        blended.sort(key=lambda s: s.score, reverse=True)
        return blended[:top_k]
