import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth, currentUser } from '@clerk/nextjs/server';
import { bumpNamespace } from '@/lib/cache/cacheAside';

// GET current user's profile — auto-creates on first access (no webhook needed locally)
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = `
      SELECT 
        p.*,
        COALESCE(AVG(r.rating), 0) as rating,
        COUNT(DISTINCT r.id) as review_count
      FROM profiles p
      LEFT JOIN reviews r ON p.id = r.freelancer_id
      WHERE p.clerk_id = $1
      GROUP BY p.id
    `;

    let result = await pool.query(query, [userId]);

    // ── Auto-create profile on first access (replaces webhook dependency locally) ──
    if (result.rows.length === 0) {
      const clerkUser = await currentUser();
      const email =
        clerkUser?.emailAddresses?.[0]?.emailAddress ??
        `${userId}@unknown.com`;
      const fullName =
        clerkUser?.fullName ??
        clerkUser?.username ??
        email.split('@')[0];

      await pool.query(
        `INSERT INTO profiles (clerk_id, email, full_name, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (clerk_id) DO NOTHING`,
        [userId, email, fullName]
      );

      // Re-fetch after insert
      result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
    }

    const profile = result.rows[0];

    return NextResponse.json({
      profile: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        bio: profile.bio,
        location: profile.location,
        phone: profile.phone,
        userType: profile.user_type,
        avatarUrl: profile.avatar_url,
        hourlyRate: profile.hourly_rate,
        completedJobs: profile.completed_jobs || 0,
        successRate: profile.success_rate || 0,
        rating: parseFloat(profile.rating).toFixed(1),
        reviewCount: parseInt(profile.review_count),
        createdAt: profile.created_at,
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT - Update profile
export async function PUT(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      fullName,
      bio,
      location,
      phone,
      hourlyRate,
      avatarUrl,
      userType,
    } = body;

    // Validate userType if provided
    if (userType && !['client', 'freelancer'].includes(userType)) {
      return NextResponse.json(
        { error: 'Invalid user type. Must be "client" or "freelancer"' },
        { status: 400 }
      );
    }

    const query = `
      UPDATE profiles
      SET 
        full_name = COALESCE($1, full_name),
        bio = COALESCE($2, bio),
        location = COALESCE($3, location),
        phone = COALESCE($4, phone),
        hourly_rate = COALESCE($5, hourly_rate),
        avatar_url = COALESCE($6, avatar_url),
        user_type = COALESCE($7, user_type),
        updated_at = NOW()
      WHERE clerk_id = $8
      RETURNING *
    `;

    const result = await pool.query(query, [
      fullName || null,
      bio || null,
      location || null,
      phone || null,
      hourlyRate || null,
      avatarUrl || null,
      userType || null,
      userId,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Freelancer list pages render bio/location/skills, so invalidate.
    await bumpNamespace('freelancers');

    return NextResponse.json({
      success: true,
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
