import { useState } from "react";
import { Trash2, GripVertical, RotateCcw } from "lucide-react";

export interface MediaItem {
  id: string;
  name: string;
  url?: string;
  duration?: number;
  included?: boolean;
}

interface MediaListEditorProps {
  items: MediaItem[];
  onItemsReordered: (items: MediaItem[]) => void;
  onItemRemoved: (id: string) => void;
  onItemToggled: (id: string, included: boolean) => void;
  onReset: () => void;
}

export default function MediaListEditor({
  items,
  onItemsReordered,
  onItemRemoved,
  onItemToggled,
  onReset,
}: MediaListEditorProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (id: string) => {
    setDragOverItem(id);
  };

  const handleDrop = (targetId: string) => {
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const draggedIndex = items.findIndex((item) => item.id === draggedItem);
    const targetIndex = items.findIndex((item) => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    onItemsReordered(newItems);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const totalDuration = items
    .filter((item) => item.included !== false)
    .reduce((sum, item) => sum + (item.duration || 5), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl font-bold text-foreground">
            Media Editor
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Drag to reorder, toggle to include/exclude from video
          </p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Order
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 rounded-lg border-2 border-dashed border-border">
          <p className="text-muted-foreground">
            No media selected. Add media above to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={() => handleDragOver(item.id)}
              onDrop={() => handleDrop(item.id)}
              onDragLeave={() => setDragOverItem(null)}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                dragOverItem === item.id
                  ? "border-accent-blue bg-accent-blue/5"
                  : "border-border bg-card hover:border-border/80"
              } ${draggedItem === item.id ? "opacity-50" : ""} cursor-move`}
            >
              <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />

              {item.url && (
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                />
              )}

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.duration || 5}s
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.included !== false}
                  onChange={(e) => onItemToggled(item.id, e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-border bg-card cursor-pointer accent-accent-blue"
                />
                <span className="text-xs text-muted-foreground">Include</span>
              </label>

              <button
                onClick={() => onItemRemoved(item.id)}
                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex-shrink-0"
                title="Remove media"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="p-4 rounded-lg bg-accent-blue/10 border border-accent-blue/50">
          <p className="text-sm text-muted-foreground">Total Video Duration</p>
          <p className="font-semibold text-foreground text-lg">{totalDuration}s</p>
        </div>
      )}
    </div>
  );
}
