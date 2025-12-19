import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { hasClerkKey } from "@/lib/clerk-config";

interface RequireAuthProps {
  children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const clerkKeyPresent = hasClerkKey();

  // If Clerk is not configured, allow access (development mode)
  if (!clerkKeyPresent) {
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
