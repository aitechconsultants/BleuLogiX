export default function GeneratorHeader() {
  return (
    <div className="border-b border-border bg-card/50 sticky top-24 z-40">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8">
        <div className="space-y-2">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
            Create Your Video
          </h1>
          <p className="text-lg text-muted-foreground">
            Choose a template, add your content, and generate a professional video
          </p>
        </div>
      </div>
    </div>
  );
}
