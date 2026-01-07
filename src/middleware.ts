import NextAuth from "next-auth";
import { authConfig } from "~/server/auth/config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isAuth = !!req.auth;
  const isHomePage = req.nextUrl.pathname === "/";
  const isDev = process.env.NODE_ENV === "development";

  // In development mode, skip auth checks entirely
  if (isDev) {
    return;
  }

  // If not authenticated and not on home page, redirect to home (login page)
  if (!isAuth && !isHomePage) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
