"""Synthetic dataset for benchmarking and offline demo.

Generates a small but realistic workforce-marketplace dataset:
    - 60 freelancers across 6 trade categories (electrician, plumber, …)
    - 30 client/business accounts
    - 200 jobs with 3-skill requirements
    - ~600 (client, freelancer) interactions biased by skill match,
      city, and a per-freelancer popularity factor

The generator is deterministic given a seed so benchmark numbers are
reproducible.
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field

CATEGORIES: dict[str, list[str]] = {
    "Electrician": [
        "Wiring", "Circuit Breakers", "Lighting", "Voltage Testing",
        "Generator Repair", "Solar Installation",
    ],
    "Plumbing": [
        "Pipe Fitting", "Leak Repair", "Drainage", "Water Heater",
        "Bathroom Fitting", "Tank Cleaning",
    ],
    "AC Repair": [
        "AC Servicing", "AC Installation", "Gas Refilling", "Compressor Repair",
        "Cooling Coil", "Inverter AC",
    ],
    "Carpentry": [
        "Furniture Making", "Door Fitting", "Cabinet Making", "Wood Polish",
        "Bed Frame", "Wardrobe",
    ],
    "Painting": [
        "Interior Painting", "Exterior Painting", "Wallpaper", "Texture Paint",
        "Polish", "Spray Paint",
    ],
    "Masonry": [
        "Brickwork", "Tile Fitting", "Plastering", "Concrete",
        "Stone Work", "Marble Polish",
    ],
}

CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan"]


@dataclass(frozen=True)
class SynthFreelancer:
    id: str
    full_name: str
    bio: str
    skills: list[str]
    location: str
    rating: float
    popularity: float  # latent factor used to generate interactions


@dataclass(frozen=True)
class SynthJob:
    id: str
    title: str
    description: str
    required_skills: list[str]
    location: str
    client_id: str
    relevant_freelancers: set[str] = field(default_factory=set)


@dataclass(frozen=True)
class SyntheticDataset:
    freelancers: list[SynthFreelancer]
    jobs: list[SynthJob]
    interactions: list[tuple[str, str, float]]
    clients: list[str]


def generate(seed: int = 42) -> SyntheticDataset:
    rng = random.Random(seed)

    freelancers: list[SynthFreelancer] = []
    cat_names = list(CATEGORIES.keys())
    for i in range(60):
        cat = rng.choice(cat_names)
        skills_in_cat = CATEGORIES[cat]
        skills = rng.sample(skills_in_cat, k=rng.randint(2, min(4, len(skills_in_cat))))
        loc = rng.choice(CITIES)
        rating = round(rng.uniform(3.5, 5.0), 1)
        popularity = rng.uniform(0.2, 1.0)
        freelancers.append(
            SynthFreelancer(
                id=f"f_{i:03d}",
                full_name=f"Worker {i:03d}",
                bio=f"Experienced {cat.lower()} based in {loc}. "
                f"Specializing in {', '.join(skills)}.",
                skills=skills,
                location=loc,
                rating=rating,
                popularity=popularity,
            )
        )

    clients = [f"c_{i:03d}" for i in range(30)]

    jobs: list[SynthJob] = []
    for j in range(200):
        cat = rng.choice(cat_names)
        skills_in_cat = CATEGORIES[cat]
        req = rng.sample(skills_in_cat, k=rng.randint(2, min(3, len(skills_in_cat))))
        loc = rng.choice(CITIES)
        client = rng.choice(clients)
        # Ground-truth relevance: freelancers in same category + same city +
        # skill overlap ≥ 1 are considered "relevant" for evaluation.
        relevant = {
            f.id
            for f in freelancers
            if set(f.skills) & set(req)
            and f.location == loc
        }
        jobs.append(
            SynthJob(
                id=f"j_{j:03d}",
                title=f"Need a {cat.lower()} for project {j:03d}",
                description=f"Looking for help with {', '.join(req)} in {loc}.",
                required_skills=req,
                location=loc,
                client_id=client,
                relevant_freelancers=relevant,
            )
        )

    # Generate interactions biased toward relevant + popular freelancers.
    interactions: list[tuple[str, str, float]] = []
    by_id = {f.id: f for f in freelancers}
    for job in jobs:
        # Each job produces 1-4 interactions from its client.
        n_int = rng.randint(1, 4)
        # Score candidates: skill overlap * popularity + city bonus.
        scored = []
        for f in freelancers:
            overlap = len(set(f.skills) & set(job.required_skills))
            if overlap == 0:
                continue
            score = overlap * f.popularity + (0.5 if f.location == job.location else 0)
            scored.append((f.id, score))
        scored.sort(key=lambda x: -x[1])
        chosen = [fid for fid, _ in scored[: n_int * 3]]
        if not chosen:
            continue
        picks = rng.sample(chosen, k=min(n_int, len(chosen)))
        for fid in picks:
            weight = 2.0 if rng.random() < 0.4 else 1.0
            interactions.append((job.client_id, fid, weight))

    return SyntheticDataset(
        freelancers=freelancers,
        jobs=jobs,
        interactions=interactions,
        clients=clients,
    )
