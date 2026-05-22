"""Unit tests for the collaborative recommender."""
from __future__ import annotations

from app.recommender.collaborative import CollaborativeRecommender


def test_untrained_returns_empty() -> None:
    cf = CollaborativeRecommender()
    assert cf.recommend("c1") == []


def test_trains_on_implicit_feedback() -> None:
    cf = CollaborativeRecommender(n_factors=4)
    # Three clients: c1+c2 hire similar freelancers, c3 hires a different cluster.
    interactions = [
        ("c1", "f1", 1.0), ("c1", "f2", 1.0), ("c1", "f3", 1.0),
        ("c2", "f1", 1.0), ("c2", "f2", 1.0),
        ("c3", "f4", 1.0), ("c3", "f5", 1.0), ("c3", "f6", 1.0),
    ]
    cf.fit(interactions)
    assert cf.is_trained
    assert cf.n_users == 3
    assert cf.n_items == 6

    # c2 should be recommended f3 (which c1 also liked) more than f6.
    recs = cf.recommend("c2", candidates=["f3", "f6"], top_k=2)
    assert recs[0].freelancer_id == "f3"


def test_cold_start_falls_back_to_popularity() -> None:
    cf = CollaborativeRecommender(n_factors=4)
    interactions = [
        ("c1", "f1", 5.0),  # f1 is popular
        ("c1", "f2", 5.0),
        ("c2", "f1", 5.0),
        ("c3", "f3", 1.0),
    ]
    cf.fit(interactions)
    # Unknown client → popularity-based.
    recs = cf.recommend("c_new", top_k=3)
    assert recs[0].is_cold_start
    assert recs[0].freelancer_id == "f1"


def test_respects_candidate_filter() -> None:
    cf = CollaborativeRecommender(n_factors=4)
    cf.fit([
        ("c1", "f1", 1.0), ("c1", "f2", 1.0),
        ("c2", "f1", 1.0), ("c2", "f3", 1.0),
    ])
    recs = cf.recommend("c1", candidates=["f3"], top_k=5)
    assert [r.freelancer_id for r in recs] == ["f3"]


def test_empty_fit_disables_model() -> None:
    cf = CollaborativeRecommender()
    cf.fit([])
    assert not cf.is_trained
