import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/post-job(.*)',
  '/my-jobs(.*)',
  '/my-proposals(.*)',
  '/onboarding(.*)',
]);

// Clerk's default `auth.protect()` rewrites unauthenticated visitors to a
// 404 page — which looks like the site is broken when a recruiter
// (or anyone) just visits /dashboard. Redirect them to /sign-in with a
// post-login redirect back to the original URL instead.
export default clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req)) return;

  const { userId } = await auth();
  if (userId) return;

  const url = new URL('/sign-in', req.url);
  url.searchParams.set('redirect_url', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};