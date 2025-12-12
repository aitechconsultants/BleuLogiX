import { useState } from "react";
import { Search } from "lucide-react";

interface StockMedia {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  duration?: number;
}

interface StockMediaBrowserProps {
  onMediaSelected: (media: StockMedia) => void;
}

export default function StockMediaBrowser({
  onMediaSelected,
}: StockMediaBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = ["Nature", "Office", "City", "Abstract", "Technology"];

  const mockMedia: StockMedia[] = [
    {
      id: "1",
      title: "Forest Stream",
      thumbnail: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&h=300&fit=crop",
      category: "Nature",
      duration: 15,
    },
    {
      id: "2",
      title: "Modern Office",
      thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=300&fit=crop",
      category: "Office",
      duration: 20,
    },
    {
      id: "3",
      title: "City Skyline",
      thumbnail: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=300&h=300&fit=crop",
      category: "City",
      duration: 25,
    },
    {
      id: "4",
      title: "Abstract Waves",
      thumbnail: "https://images.unsplash.com/photo-1557672172-298e090d0f80?w=300&h=300&fit=crop",
      category: "Abstract",
      duration: 10,
    },
    {
      id: "5",
      title: "Tech Workspace",
      thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&h=300&fit=crop",
      category: "Technology",
      duration: 18,
    },
    {
      id: "6",
      title: "Mountain Peak",
      thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop",
      category: "Nature",
      duration: 22,
    },
  ];

  const filtered = mockMedia.filter((media) => {
    const matchesSearch = media.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || media.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search stock media..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent-blue"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors font-medium text-sm ${
            selectedCategory === null
              ? "bg-accent-blue text-black"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors font-medium text-sm ${
              selectedCategory === cat
                ? "bg-accent-blue text-black"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((media) => (
          <button
            key={media.id}
            onClick={() => onMediaSelected(media)}
            className="group relative overflow-hidden rounded-lg border border-border hover:border-accent-blue/50 transition-all"
          >
            <img
              src={media.thumbnail}
              alt={media.title}
              className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
              <p className="text-xs font-medium text-white">{media.title}</p>
              {media.duration && (
                <p className="text-xs text-gray-300">{media.duration}s</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
