import Layout from "@/components/Layout";

export default function Generator() {
  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <section className="py-24 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Generator
            </h1>
          </div>
        </section>
      </div>
    </Layout>
  );
}
