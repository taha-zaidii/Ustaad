"""Unit tests for the hybrid recommender."""
from __future__ import annotations

from app.recommender.collaborative import CollaborativeRecommender
from app.recommender.content_based import ContentBasedRecommender
from app.recommender.hybrid import HybridRecommender


def test_falls_back_to_content_only_without_client() -> None:
    content = ContentBasedRecommender()
    collab = CollaborativeRecommender()
    collab.fit([("c1", "f1", 1.0), ("c1", "f2", 1.0)])
    h = HybridRecommender(content=content, collaborative=collab)

    job = {
        "title": "Electrician",
        "description": "Wiring needed.",
        "required_skills": ["Wiring"],
        "location": "Karachi",
    }
    candidates = [
        {"id": "f1", "bio": "Plumber", "skills": ["Pipe Fitting"], "location": "Lahore"},
        {"id": "f2", "bio": "Electrician", "skills": ["Wiring"], "location": "Karachi"},
    ]
    # No client_id → must rank f2 first based on content alone.
    scored = h.score(job, candidates, client_id=None)
    assert scored[0].freelancer_id == "f2"
    assert scored[0].collaborative_score == 0.0


def test_blends_when_client_known() -> None:
    content = ContentBasedRecommender()
    collab = CollaborativeRecommender(n_factors=2)
    collab.fit([
        ("client_a", "f1", 1.0),
        ("client_a", "f2", 1.0),
        ("client_b", "f1", 1.0),
    ])
    h = HybridRecommender(
        content=content,
        collaborative=collab,
        content_weight=0.5,
        collab_weight=0.5,
    )
    job = {
        "title": "General help",
        "description": "Generic job",
        "required_skills": [],
        "location": "Karachi",
    }
    candidates = [
        {"id": "f1", "bio": "x", "skills": [], "location": "Karachi"},
        {"id": "f2", "bio": "x", "skills": [], "location": "Karachi"},
    ]
    scored = h.score(job, candidates, client_id="client_a")
    ids = {s.freelancer_id for s in scored}
    assert ids == {"f1", "f2"}
    assert all(s.collaborative_score >= 0 for s in scored)


def test_rejects_bad_weights() -> None:
    import pytest

    content = ContentBasedRecommender()
    collab = CollaborativeRecommender()
    with pytest.raises(ValueError):
        HybridRecommender(content=content, collaborative=collab, content_weight=1.5)
    with pytest.raises(ValueError):
        HybridRecommender(content=content, collaborative=collab, collab_weight=-0.1)
