import { Badge } from "@/components/ui/badge";

interface CaptionStyleSelectorProps {
  isEnabled: boolean;
  selectedStyle: string;
  selectedColor: string;
  onToggle: (enabled: boolean) => void;
  onStyleChange: (style: string) => void;
  onColorChange: (color: string) => void;
}

export default function CaptionStyleSelector({
  isEnabled,
  selectedStyle,
  selectedColor,
  onToggle,
  onStyleChange,
  onColorChange,
}: CaptionStyleSelectorProps) {
  const styles = [
    { id: "clean", label: "Clean Minimal" },
    { id: "bold", label: "Bold" },
    { id: "glow", label: "Glow" },
    { id: "karaoke", label: "Karaoke Highlight" },
    { id: "lower-third", label: "Lower Third" },
  ];

  const colors = [
    { id: "white", label: "White", hex: "#FFFFFF" },
    { id: "yellow", label: "Yellow", hex: "#FFFF00" },
    { id: "cyan", label: "Cyan", hex: "#00FFFF" },
  ];

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
        <label className="flex items-center gap-3 flex-1 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-5 h-5 accent-accent-blue"
          />
          <span className="font-medium text-foreground">Enable Captions</span>
        </label>
      </div>

      {isEnabled && (
        <>
          {/* Caption Styles */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Caption Style</h4>
            <div className="grid grid-cols-2 gap-3">
              {styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => onStyleChange(style.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedStyle === style.id
                      ? "border-accent-blue bg-accent-blue/10"
                      : "border-border hover:border-accent-blue/50 bg-card"
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">
                    {style.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Caption Colors */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Caption Color</h4>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => onColorChange(color.id)}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                    selectedColor === color.id
                      ? "border-accent-blue"
                      : "border-border hover:border-accent-blue/50"
                  }`}
                >
                  <span className="text-xs font-medium">{color.label}</span>
                  <div
                    className="w-4 h-4 rounded border border-border"
                    style={{ backgroundColor: color.hex }}
                  />
                </button>
              ))}
            </div>

            {/* Custom Color Picker */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Custom Color:
              </label>
              <input
                type="color"
                defaultValue="#FFFFFF"
                onChange={(e) => onColorChange(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
