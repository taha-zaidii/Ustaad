import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cachedRead, keyFromSearch } from '@/lib/cache/cacheAside';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  const search = searchParams.get('search');

  try {
    const payload = await cachedRead({
      namespace: 'freelancers',
      key: keyFromSearch(searchParams),
      ttlSeconds: 60,
      loader: async () => {
        let query = `
      SELECT 
        p.id,
        p.full_name as name,
        p.location,
        p.bio,
        p.hourly_rate,
        p.avatar_url,
        p.completed_jobs,
        p.success_rate,
        COALESCE(AVG(r.rating), 0) as rating,
        COUNT(DISTINCT r.id) as review_count,
        ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as skills
      FROM profiles p
      LEFT JOIN reviews r ON p.id = r.freelancer_id
      LEFT JOIN freelancer_skills fs ON p.id = fs.profile_id
      LEFT JOIN skills s ON fs.skill_id = s.id
      WHERE p.user_type = 'freelancer'
    `;

        const params: any[] = [];
        let paramIndex = 1;

        if (location && location !== 'all') {
          query += ` AND p.location ILIKE $${paramIndex}`;
          params.push(`%${location}%`);
          paramIndex++;
        }

        if (search) {
          query += ` AND (p.full_name ILIKE $${paramIndex} OR p.bio ILIKE $${paramIndex})`;
          params.push(`%${search}%`);
          paramIndex++;
        }

        query += `
          GROUP BY p.id, p.full_name, p.location, p.bio, p.hourly_rate,
                   p.avatar_url, p.completed_jobs, p.success_rate
          ORDER BY p.completed_jobs DESC
        `;

        const result = await pool.query(query, params);
        const freelancers = result.rows.map(row => ({
          id: row.id,
          name: row.name,
          title: row.bio ? row.bio.split('.')[0] : 'Freelancer',
          location: row.location,
          rating: parseFloat(row.rating).toFixed(1),
          reviews: parseInt(row.review_count),
          skills: (row.skills || []).filter(Boolean).slice(0, 4),
          hourlyRate: `PKR ${parseInt(row.hourly_rate || 0).toLocaleString()}`,
          avatarUrl: row.avatar_url,
        }));
        return { freelancers };
      },
    });
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch freelancers' },
      { status: 500 }
    );
  }
}
