import NextAuth from "next-auth";
import { authConfig } from "~/server/auth/config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isAuth = !!req.auth;
  const isHomePage = req.nextUrl.pathname === "/";
  // const isApi = req.nextUrl.pathname.startsWith("/api");

  // If not authenticated and not on home page, and not attempting to log in via API
  // Redirect to home page (which is the login page)
  if (!isAuth && !isHomePage) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
