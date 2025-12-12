interface TemplateCardProps {
  id: string;
  title: string;
  thumbnail: string;
  description?: string;
  onUseTemplate: (id: string) => void;
}

export default function TemplateCard({
  id,
  title,
  thumbnail,
  description,
  onUseTemplate,
}: TemplateCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card hover:border-accent-blue/50 transition-all duration-300">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-black/50">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-display font-semibold text-foreground text-lg">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}

        {/* Button */}
        <button
          onClick={() => onUseTemplate(id)}
          className="w-full py-2 px-3 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors font-medium text-sm border border-accent-blue/40"
        >
          Use Template
        </button>
      </div>
    </div>
  );
}
