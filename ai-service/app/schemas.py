"""Pydantic request/response schemas."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class FreelancerProfile(BaseModel):
    id: str
    full_name: str | None = None
    bio: str | None = None
    skills: list[str] = Field(default_factory=list)
    location: str | None = None
    rating: float | None = None


class JobPosting(BaseModel):
    id: str
    title: str
    description: str | None = None
    required_skills: list[str] = Field(default_factory=list)
    location: str | None = None


class ContentMatchRequest(BaseModel):
    job: JobPosting
    candidates: list[FreelancerProfile]
    top_k: int = Field(default=10, ge=1, le=100)


class MatchScore(BaseModel):
    freelancer_id: str
    score: float
    rank: int
    explanation: dict[str, float] = Field(default_factory=dict)


class MatchResponse(BaseModel):
    job_id: str
    strategy: Literal["content", "collaborative", "hybrid"]
    matches: list[MatchScore]


class CollaborativeRequest(BaseModel):
    client_id: str
    candidates: list[str] | None = None
    top_k: int = Field(default=10, ge=1, le=100)


class HybridRequest(BaseModel):
    job: JobPosting
    candidates: list[FreelancerProfile]
    client_id: str | None = None
    top_k: int = Field(default=10, ge=1, le=100)


class MetricsResponse(BaseModel):
    strategy: str
    n_users: int
    n_items: int
    hit_rate_at_5: float
    mrr: float
    notes: str | None = None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    version: str
    db_connected: bool
    cf_model_trained: bool
