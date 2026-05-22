"""Ranking metrics for matching evaluation.

Hit-Rate@K: fraction of held-out positives that appear in the top-K
predictions for the corresponding query.

MRR: mean reciprocal rank — average over queries of 1 / rank-of-first
relevant item, 0 if no relevant item appears in the ranking.

Both metrics expect predictions as a ranked list of item ids per query
and the ground truth as a set of relevant item ids per query.
"""
from __future__ import annotations

from collections.abc import Iterable


def hit_rate_at_k(
    ranked: list[list[str]],
    relevant: list[set[str]],
    k: int = 5,
) -> float:
    if not ranked:
        return 0.0
    if len(ranked) != len(relevant):
        raise ValueError("ranked and relevant must have the same length")

    hits = 0
    for preds, gold in zip(ranked, relevant, strict=True):
        if not gold:
            continue
        if any(p in gold for p in preds[:k]):
            hits += 1
    n_eval = sum(1 for r in relevant if r)
    return hits / n_eval if n_eval else 0.0


def mean_reciprocal_rank(
    ranked: list[list[str]],
    relevant: list[set[str]],
) -> float:
    if not ranked:
        return 0.0
    if len(ranked) != len(relevant):
        raise ValueError("ranked and relevant must have the same length")

    rr_sum = 0.0
    n_eval = 0
    for preds, gold in zip(ranked, relevant, strict=True):
        if not gold:
            continue
        n_eval += 1
        rr = 0.0
        for idx, p in enumerate(preds, start=1):
            if p in gold:
                rr = 1.0 / idx
                break
        rr_sum += rr
    return rr_sum / n_eval if n_eval else 0.0


def evaluate(
    ranked: list[list[str]],
    relevant: list[set[str]],
    ks: Iterable[int] = (1, 3, 5, 10),
) -> dict[str, float]:
    results = {f"hit_rate@{k}": hit_rate_at_k(ranked, relevant, k) for k in ks}
    results["mrr"] = mean_reciprocal_rank(ranked, relevant)
    return results
