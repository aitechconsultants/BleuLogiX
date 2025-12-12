import { SignIn } from "@clerk/clerk-react";
import Layout from "@/components/Layout";

export default function Login() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-120px)] bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <SignIn routing="path" path="/login" />
        </div>
      </div>
    </Layout>
  );
}
