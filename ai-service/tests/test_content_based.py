"""Unit tests for the content-based recommender."""
from __future__ import annotations

from app.recommender.content_based import ContentBasedRecommender


def _make_candidates() -> list[dict]:
    return [
        {
            "id": "alice",
            "bio": "Master electrician with 10 years of wiring experience.",
            "skills": ["Wiring", "Circuit Breakers", "Voltage Testing"],
            "location": "Karachi",
        },
        {
            "id": "bob",
            "bio": "Plumber specializing in leak repair and pipe fitting.",
            "skills": ["Pipe Fitting", "Leak Repair"],
            "location": "Karachi",
        },
        {
            "id": "carol",
            "bio": "Electrician based in Lahore, generator and solar work.",
            "skills": ["Generator Repair", "Solar Installation", "Wiring"],
            "location": "Lahore",
        },
    ]


def test_ranks_relevant_candidate_first() -> None:
    rec = ContentBasedRecommender()
    job = {
        "title": "Need electrician for home wiring",
        "description": "Looking for an electrician to rewire two rooms.",
        "required_skills": ["Wiring", "Circuit Breakers"],
        "location": "Karachi",
    }
    scored = rec.score(job, _make_candidates())
    assert scored[0].freelancer_id == "alice"
    assert scored[0].combined > scored[-1].combined


def test_skill_overlap_boost() -> None:
    rec = ContentBasedRecommender()
    job = {
        "title": "Wiring job",
        "description": "Wiring needed.",
        "required_skills": ["Wiring"],
        "location": "Karachi",
    }
    scored = rec.score(job, _make_candidates())
    alice = next(s for s in scored if s.freelancer_id == "alice")
    bob = next(s for s in scored if s.freelancer_id == "bob")
    assert alice.skill_overlap == 1.0
    assert bob.skill_overlap == 0.0
    assert alice.combined > bob.combined


def test_location_match_signal() -> None:
    rec = ContentBasedRecommender()
    job = {
        "title": "Wiring job",
        "description": "Wiring needed.",
        "required_skills": ["Wiring"],
        "location": "Karachi",
    }
    scored = rec.score(job, _make_candidates())
    alice = next(s for s in scored if s.freelancer_id == "alice")
    carol = next(s for s in scored if s.freelancer_id == "carol")
    # Same skill, but alice is local; alice should rank higher.
    assert alice.location_match == 1.0
    assert carol.location_match == 0.0
    assert alice.combined >= carol.combined


def test_empty_candidates_returns_empty() -> None:
    rec = ContentBasedRecommender()
    assert rec.score({"title": "x"}, []) == []
