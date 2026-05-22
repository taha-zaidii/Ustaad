"""Unit tests for ranking metrics."""
from __future__ import annotations

import pytest

from app.evaluation.metrics import (
    evaluate,
    hit_rate_at_k,
    mean_reciprocal_rank,
)


def test_hit_rate_perfect_top_1() -> None:
    ranked = [["a", "b", "c"], ["x", "y", "z"]]
    relevant = [{"a"}, {"x"}]
    assert hit_rate_at_k(ranked, relevant, k=1) == 1.0


def test_hit_rate_misses_below_k() -> None:
    ranked = [["b", "a"], ["y", "x"]]
    relevant = [{"a"}, {"x"}]
    assert hit_rate_at_k(ranked, relevant, k=1) == 0.0
    assert hit_rate_at_k(ranked, relevant, k=2) == 1.0


def test_hit_rate_ignores_queries_without_relevant() -> None:
    ranked = [["a"], ["b"]]
    relevant = [{"a"}, set()]
    # Only first query counted; second has no gold → skipped.
    assert hit_rate_at_k(ranked, relevant, k=1) == 1.0


def test_mrr_computation() -> None:
    ranked = [
        ["a", "b", "c"],  # gold at rank 1 → 1/1
        ["x", "y", "z"],  # gold at rank 2 → 1/2
        ["m", "n", "o"],  # no gold       → 0
    ]
    relevant = [{"a"}, {"y"}, {"q"}]
    # average over 3 queries (all have gold): (1 + 0.5 + 0) / 3
    assert mean_reciprocal_rank(ranked, relevant) == pytest.approx((1 + 0.5) / 3)


def test_evaluate_returns_all_ks() -> None:
    ranked = [["a", "b", "c", "d", "e"]]
    relevant = [{"d"}]
    out = evaluate(ranked, relevant, ks=(1, 3, 5))
    assert out["hit_rate@1"] == 0.0
    assert out["hit_rate@3"] == 0.0
    assert out["hit_rate@5"] == 1.0
    assert out["mrr"] == pytest.approx(1 / 4)


def test_mismatched_lengths_raises() -> None:
    with pytest.raises(ValueError):
        hit_rate_at_k([["a"]], [{"a"}, {"b"}], k=1)
