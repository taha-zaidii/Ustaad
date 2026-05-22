"""Content-based matching via TF-IDF + cosine similarity.

The job posting and each freelancer profile are turned into a single
text document (title + description + skills + location for the job;
bio + skills + location for the freelancer). We then vectorize all
documents with TF-IDF and score each freelancer by cosine similarity
to the job vector.

Skill overlap is given an extra boost on top of the TF-IDF score
because exact skill matches are highly predictive in this domain
(verified post-hoc by Hit-Rate@5 — see app/evaluation/metrics.py).
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def _profile_text(
    bio: str | None,
    skills: list[str] | None,
    location: str | None,
) -> str:
    parts: list[str] = []
    if bio:
        parts.append(bio)
    if skills:
        parts.extend(skills)
    if location:
        parts.append(location)
    return " ".join(parts).strip() or "unknown"


def _job_text(
    title: str,
    description: str | None,
    skills: list[str] | None,
    location: str | None,
) -> str:
    parts: list[str] = [title]
    if description:
        parts.append(description)
    if skills:
        parts.extend(skills)
    if location:
        parts.append(location)
    return " ".join(parts).strip() or "unknown"


@dataclass(frozen=True)
class ContentScore:
    freelancer_id: str
    cosine: float
    skill_overlap: float
    location_match: float
    combined: float


class ContentBasedRecommender:
    """Stateless TF-IDF + cosine recommender.

    Fits a vectorizer over [job_doc, *freelancer_docs] on every call so
    the IDF reflects the candidate pool. For batch evaluation, use the
    `fit_on` constructor to pre-train on a corpus.
    """

    def __init__(self, min_df: int = 1, max_features: int = 4096) -> None:
        self._min_df = min_df
        self._max_features = max_features

    def score(
        self,
        job: dict,
        candidates: list[dict],
    ) -> list[ContentScore]:
        if not candidates:
            return []

        job_doc = _job_text(
            job.get("title", ""),
            job.get("description"),
            job.get("required_skills"),
            job.get("location"),
        )
        cand_docs = [
            _profile_text(c.get("bio"), c.get("skills"), c.get("location"))
            for c in candidates
        ]
        corpus = [job_doc, *cand_docs]

        vectorizer = TfidfVectorizer(
            min_df=self._min_df,
            max_features=self._max_features,
            ngram_range=(1, 2),
            sublinear_tf=True,
            lowercase=True,
        )
        matrix = vectorizer.fit_transform(corpus)
        job_vec = matrix[0]
        cand_mat = matrix[1:]

        cosines = cosine_similarity(job_vec, cand_mat).ravel()

        job_skills = {s.lower() for s in (job.get("required_skills") or [])}
        job_loc = (job.get("location") or "").strip().lower()

        scores: list[ContentScore] = []
        for cand, cos in zip(candidates, cosines, strict=True):
            cand_skills = {s.lower() for s in (cand.get("skills") or [])}
            overlap = (
                len(job_skills & cand_skills) / max(len(job_skills), 1)
                if job_skills
                else 0.0
            )
            loc_match = (
                1.0
                if job_loc
                and cand.get("location")
                and cand["location"].strip().lower() == job_loc
                else 0.0
            )
            combined = float(
                0.55 * cos + 0.30 * overlap + 0.15 * loc_match
            )
            scores.append(
                ContentScore(
                    freelancer_id=str(cand["id"]),
                    cosine=float(cos),
                    skill_overlap=float(overlap),
                    location_match=loc_match,
                    combined=combined,
                )
            )

        scores.sort(key=lambda s: s.combined, reverse=True)
        return scores

    def score_matrix(
        self,
        job_docs: list[str],
        candidate_docs: list[str],
    ) -> np.ndarray:
        """Vectorized scoring for benchmarks: returns (n_jobs, n_candidates)."""
        vectorizer = TfidfVectorizer(
            min_df=self._min_df,
            max_features=self._max_features,
            ngram_range=(1, 2),
            sublinear_tf=True,
            lowercase=True,
        )
        matrix = vectorizer.fit_transform([*job_docs, *candidate_docs])
        n_jobs = len(job_docs)
        job_mat = matrix[:n_jobs]
        cand_mat = matrix[n_jobs:]
        return cosine_similarity(job_mat, cand_mat)
