import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { bumpNamespace } from '@/lib/cache/cacheAside';

export async function POST(request: Request) {
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
      title,
      category,
      description,
      budgetMin,
      budgetMax,
      budgetType,
      location,
      duration,
      skills,
    } = body;

    // Validate required fields
    if (!title || !category || !description || !budgetMin || !budgetMax) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get profile ID from clerk_id
    const profileQuery = 'SELECT id, user_type, email FROM profiles WHERE clerk_id = $1';
    const profileResult = await pool.query(profileQuery, [userId]);

    if (profileResult.rows.length === 0) {
      console.error('❌ Profile not found for Clerk ID:', userId);
      return NextResponse.json(
        { 
          error: 'Profile not found. Please contact support or try logging out and back in.',
          details: 'Your account exists in Clerk but not in the database. This usually means the webhook is not configured.'
        },
        { status: 404 }
      );
    }

    const clientId = profileResult.rows[0].id;
    console.log('✅ Profile found:', profileResult.rows[0].email, 'Type:', profileResult.rows[0].user_type);

    // Get category ID
    const categoryQuery = 'SELECT id FROM categories WHERE slug = $1';
    const categoryResult = await pool.query(categoryQuery, [category]);

    if (categoryResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    const categoryId = categoryResult.rows[0].id;

    // Validate budget values
    const parsedBudgetMin = parseFloat(budgetMin);
    const parsedBudgetMax = parseFloat(budgetMax);

    if (isNaN(parsedBudgetMin) || isNaN(parsedBudgetMax) || parsedBudgetMin <= 0 || parsedBudgetMax < parsedBudgetMin) {
      return NextResponse.json(
        { error: 'Invalid budget values' },
        { status: 400 }
      );
    }

    // Insert job
    const insertJobQuery = `
      INSERT INTO jobs (
        client_id, title, description, category_id, 
        budget_min, budget_max, budget_type, location, duration, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    const jobResult = await pool.query(insertJobQuery, [
      clientId,
      title,
      description,
      categoryId,
      parsedBudgetMin,
      parsedBudgetMax,
      budgetType || 'fixed',
      location,
      duration,
      'open',
    ]);

    const jobId = jobResult.rows[0].id;

    // Insert skills if provided
    if (skills && Array.isArray(skills) && skills.length > 0) {
      for (const skillName of skills) {
        if (!skillName || skillName.trim() === '') continue;
        // Get or create skill
        const skillQuery = `
          INSERT INTO skills (name, slug)
          VALUES ($1, $2)
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `;
        const slug = skillName.toLowerCase().replace(/\s+/g, '-');
        const skillResult = await pool.query(skillQuery, [skillName, slug]);
        const skillId = skillResult.rows[0].id;

        // Link skill to job
        await pool.query(
          'INSERT INTO job_skills (job_id, skill_id) VALUES ($1, $2)',
          [jobId, skillId]
        );
      }
    }

    // Update category job count
    await pool.query(
      'UPDATE categories SET job_count = job_count + 1 WHERE id = $1',
      [categoryId]
    );

    // Invalidate cached job list pages so the new posting is visible
    // immediately. Fail-open: a cache error must not break job creation.
    await bumpNamespace('jobs');

    // Notify observers (Observer pattern — REQ-5.x)
    try {
      const { notifications } = await import('@/lib/patterns/NotificationObserver');
      await notifications.publish({
        type: 'job.posted',
        jobId,
        clientId,
        title,
      });
    } catch { /* observer failure must not break the main flow */ }

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Job posted successfully',
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to post job' },
      { status: 500 }
    );
  }
}
