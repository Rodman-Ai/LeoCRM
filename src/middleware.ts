export { default } from "next-auth/middleware";

// Authenticate page navigations only. API routes return JSON 401s themselves
// via withAuth(), so they're excluded here to keep error shape consistent.
export const config = {
  matcher: [
    "/((?!login|api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)",
  ],
};
