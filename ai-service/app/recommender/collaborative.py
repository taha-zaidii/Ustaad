"""Collaborative filtering via implicit-feedback matrix factorization.

We treat (client, freelancer) interactions — proposals accepted,
reviews left — as positive implicit feedback. The interaction matrix
R ∈ R^{n_clients × n_freelancers} is factorized via TruncatedSVD into
U (n_clients × k) and V (n_freelancers × k). Predicted affinity is
the dot product u_i · v_j.

For cold-start clients (no history), we fall back to popularity. The
content-based recommender handles cold-start freelancers in the
hybrid path.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.sparse import csr_matrix
from sklearn.decomposition import TruncatedSVD


@dataclass(frozen=True)
class CFScore:
    freelancer_id: str
    score: float
    is_cold_start: bool


class CollaborativeRecommender:
    """Matrix-factorization recommender (TruncatedSVD on implicit feedback)."""

    def __init__(self, n_factors: int = 16, random_state: int = 42) -> None:
        self._n_factors = n_factors
        self._random_state = random_state
        self._client_index: dict[str, int] = {}
        self._freelancer_index: dict[str, int] = {}
        self._freelancer_ids: list[str] = []
        self._user_factors: np.ndarray | None = None
        self._item_factors: np.ndarray | None = None
        self._popularity: np.ndarray | None = None
        self._trained = False

    @property
    def is_trained(self) -> bool:
        return self._trained

    @property
    def n_users(self) -> int:
        return len(self._client_index)

    @property
    def n_items(self) -> int:
        return len(self._freelancer_index)

    def fit(self, interactions: list[tuple[str, str, float]]) -> None:
        """Fit on (client_id, freelancer_id, weight) tuples.

        Weight is typically 1.0 for a single positive event; sum across
        repeated events. Empty input → cold service (popularity = uniform).
        """
        if not interactions:
            self._trained = False
            return

        clients = sorted({c for c, _, _ in interactions})
        items = sorted({f for _, f, _ in interactions})
        self._client_index = {c: i for i, c in enumerate(clients)}
        self._freelancer_index = {f: i for i, f in enumerate(items)}
        self._freelancer_ids = items

        rows, cols, data = [], [], []
        for c, f, w in interactions:
            rows.append(self._client_index[c])
            cols.append(self._freelancer_index[f])
            data.append(float(w))
        n_users = len(clients)
        n_items = len(items)
        matrix = csr_matrix((data, (rows, cols)), shape=(n_users, n_items))

        k = min(self._n_factors, min(matrix.shape) - 1)
        if k < 1:
            # Not enough data for SVD; use popularity only.
            self._popularity = np.asarray(matrix.sum(axis=0)).ravel()
            self._user_factors = None
            self._item_factors = None
            self._trained = True
            return

        svd = TruncatedSVD(n_components=k, random_state=self._random_state)
        self._user_factors = svd.fit_transform(matrix)
        # In TruncatedSVD: components_ has shape (k, n_features).
        # Item factors are components_.T scaled by singular values, but for
        # ranking the unscaled form is equivalent under cosine/dot-product
        # ordering, so we use it directly.
        self._item_factors = svd.components_.T
        self._popularity = np.asarray(matrix.sum(axis=0)).ravel()
        self._trained = True

    def recommend(
        self,
        client_id: str,
        candidates: list[str] | None = None,
        top_k: int = 10,
    ) -> list[CFScore]:
        if not self._trained or self._popularity is None:
            return []

        # Resolve candidate set to indices we know about.
        if candidates is None:
            cand_ids = self._freelancer_ids
            cand_idx = np.arange(len(cand_ids))
        else:
            pairs = [
                (cid, self._freelancer_index[cid])
                for cid in candidates
                if cid in self._freelancer_index
            ]
            if not pairs:
                return []
            cand_ids = [p[0] for p in pairs]
            cand_idx = np.array([p[1] for p in pairs], dtype=np.int64)

        cold_start = client_id not in self._client_index
        if (
            cold_start
            or self._user_factors is None
            or self._item_factors is None
        ):
            scores = self._popularity[cand_idx].astype(float)
            denom = float(scores.max()) if scores.size and scores.max() > 0 else 1.0
            scores = scores / denom
            is_cold = True
        else:
            u = self._user_factors[self._client_index[client_id]]
            v = self._item_factors[cand_idx]
            scores = v @ u
            # Normalize to [0, 1] within this candidate set for interpretability.
            lo, hi = float(scores.min()), float(scores.max())
            if hi > lo:
                scores = (scores - lo) / (hi - lo)
            else:
                scores = np.zeros_like(scores)
            is_cold = False

        order = np.argsort(-scores)[:top_k]
        return [
            CFScore(
                freelancer_id=cand_ids[int(i)],
                score=float(scores[int(i)]),
                is_cold_start=is_cold,
            )
            for i in order
        ]
