import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

interface RequireAuthProps {
  children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  // If Clerk is not configured, allow access (development mode)
  if (!hasClerkKey) {
    return <>{children}</>;
  }

  // If Clerk is configured, use Clerk's authentication
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl={location.pathname} />
      </SignedOut>
    </>
  );
}
