import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/q(.*)',
  '/pay(.*)',
  '/legal(.*)',
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image(.*)',
  '/icon(.*)',
  '/apple-icon(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
