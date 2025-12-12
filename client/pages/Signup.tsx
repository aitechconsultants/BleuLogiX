import { SignUp } from "@clerk/clerk-react";
import Layout from "@/components/Layout";

export default function Signup() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-120px)] bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <SignUp routing="path" path="/signup" />
        </div>
      </div>
    </Layout>
  );
}
