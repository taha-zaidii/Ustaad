"""Offline benchmark: report Hit-Rate@K and MRR on the synthetic dataset.

Usage:
    python -m eval.benchmark            # all strategies
    python -m eval.benchmark --seed 7   # reproducible run

Three strategies are evaluated against a held-out split of the
synthetic interactions:

  - random baseline (sanity floor)
  - content-only    (TF-IDF + cosine + skill overlap + location)
  - collaborative   (TruncatedSVD matrix factorization)
  - hybrid          (linear blend of the above two)

Ground truth for *content* is the per-job `relevant_freelancers` set
(category-and-city match). Ground truth for *collaborative* is the
held-out 20% of each client's interactions.
"""
from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

# Allow running as `python eval/benchmark.py` from the ai-service root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.data.synthetic import generate  # noqa: E402
from app.evaluation.metrics import evaluate  # noqa: E402
from app.recommender.collaborative import CollaborativeRecommender  # noqa: E402
from app.recommender.content_based import ContentBasedRecommender  # noqa: E402
from app.recommender.hybrid import HybridRecommender  # noqa: E402


def _content_eval(content: ContentBasedRecommender, dataset) -> dict[str, float]:
    cand_dicts = [
        {
            "id": f.id,
            "bio": f.bio,
            "skills": f.skills,
            "location": f.location,
        }
        for f in dataset.freelancers
    ]
    ranked: list[list[str]] = []
    relevant: list[set[str]] = []
    for job in dataset.jobs:
        if not job.relevant_freelancers:
            continue
        job_dict = {
            "title": job.title,
            "description": job.description,
            "required_skills": job.required_skills,
            "location": job.location,
        }
        scores = content.score(job_dict, cand_dicts)
        ranked.append([s.freelancer_id for s in scores])
        relevant.append(job.relevant_freelancers)
    return evaluate(ranked, relevant)


def _random_eval(dataset, seed: int) -> dict[str, float]:
    rng = random.Random(seed)
    ids = [f.id for f in dataset.freelancers]
    ranked: list[list[str]] = []
    relevant: list[set[str]] = []
    for job in dataset.jobs:
        if not job.relevant_freelancers:
            continue
        shuffled = ids[:]
        rng.shuffle(shuffled)
        ranked.append(shuffled)
        relevant.append(job.relevant_freelancers)
    return evaluate(ranked, relevant)


def _cf_split(dataset, holdout: float, seed: int):
    """Per-client leave-X-out split."""
    rng = random.Random(seed)
    by_client: dict[str, list[tuple[str, float]]] = {}
    for c, f, w in dataset.interactions:
        by_client.setdefault(c, []).append((f, w))

    train, test = [], {}
    for client, events in by_client.items():
        if len(events) < 2:
            train.extend((client, f, w) for f, w in events)
            continue
        rng.shuffle(events)
        n_test = max(1, int(round(len(events) * holdout)))
        test_events = events[:n_test]
        train_events = events[n_test:]
        test[client] = {f for f, _ in test_events}
        train.extend((client, f, w) for f, w in train_events)
    return train, test


def _cf_eval(
    train: list[tuple[str, str, float]],
    test: dict[str, set[str]],
    n_factors: int = 16,
) -> dict[str, float]:
    cf = CollaborativeRecommender(n_factors=n_factors)
    cf.fit(train)
    ranked: list[list[str]] = []
    relevant: list[set[str]] = []
    for client, gold in test.items():
        scored = cf.recommend(client, candidates=None, top_k=20)
        ranked.append([s.freelancer_id for s in scored])
        relevant.append(gold)
    return evaluate(ranked, relevant)


def _hybrid_eval(
    dataset,
    train: list[tuple[str, str, float]],
    test: dict[str, set[str]],
) -> dict[str, float]:
    content = ContentBasedRecommender()
    collab = CollaborativeRecommender(n_factors=16)
    collab.fit(train)
    hybrid = HybridRecommender(content=content, collaborative=collab)

    cand_dicts = [
        {
            "id": f.id,
            "bio": f.bio,
            "skills": f.skills,
            "location": f.location,
        }
        for f in dataset.freelancers
    ]
    # Evaluate hybrid against per-client CF holdout, using a representative
    # job from that client's history as the content query.
    client_jobs: dict[str, list] = {}
    for j in dataset.jobs:
        client_jobs.setdefault(j.client_id, []).append(j)

    ranked: list[list[str]] = []
    relevant: list[set[str]] = []
    for client, gold in test.items():
        jobs = client_jobs.get(client)
        if not jobs:
            continue
        job = jobs[0]
        job_dict = {
            "title": job.title,
            "description": job.description,
            "required_skills": job.required_skills,
            "location": job.location,
        }
        scored = hybrid.score(job_dict, cand_dicts, client_id=client, top_k=20)
        ranked.append([s.freelancer_id for s in scored])
        relevant.append(gold)
    return evaluate(ranked, relevant)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--holdout", type=float, default=0.2)
    args = parser.parse_args()

    dataset = generate(seed=args.seed)
    train, test = _cf_split(dataset, holdout=args.holdout, seed=args.seed)

    print(
        f"\nDataset: {len(dataset.freelancers)} freelancers, "
        f"{len(dataset.jobs)} jobs, {len(dataset.interactions)} interactions"
    )
    print(f"CF split: {len(train)} train events, {len(test)} test clients\n")

    rows = [
        ("random baseline", _random_eval(dataset, args.seed)),
        ("content-only (TF-IDF + cosine)", _content_eval(ContentBasedRecommender(), dataset)),
        ("collaborative (TruncatedSVD)", _cf_eval(train, test)),
        ("hybrid (content + CF)", _hybrid_eval(dataset, train, test)),
    ]
    header = f"{'strategy':<36} {'Hit@1':>8} {'Hit@3':>8} {'Hit@5':>8} {'Hit@10':>8} {'MRR':>8}"
    print(header)
    print("-" * len(header))
    for name, metrics in rows:
        print(
            f"{name:<36} "
            f"{metrics['hit_rate@1']:>8.3f} "
            f"{metrics['hit_rate@3']:>8.3f} "
            f"{metrics['hit_rate@5']:>8.3f} "
            f"{metrics['hit_rate@10']:>8.3f} "
            f"{metrics['mrr']:>8.3f}"
        )
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
