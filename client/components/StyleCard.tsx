import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check } from "lucide-react";

interface StyleCardProps {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function StyleCard({
  id,
  title,
  thumbnail,
  description,
  isSelected,
  onSelect,
}: StyleCardProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onSelect(id)}
          className={`relative overflow-hidden rounded-lg border-2 transition-all duration-300 ${
            isSelected
              ? "border-accent-blue bg-accent-blue/10"
              : "border-border hover:border-accent-blue/50 bg-card"
          }`}
        >
          {/* Thumbnail */}
          <div className="relative aspect-square overflow-hidden bg-black/50">
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="p-3 text-left">
            <h4 className="font-semibold text-sm text-foreground">{title}</h4>
          </div>

          {/* Selection Indicator */}
          {isSelected && (
            <div className="absolute top-2 right-2 bg-accent-blue rounded-full p-1">
              <Check className="w-4 h-4 text-black" />
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
