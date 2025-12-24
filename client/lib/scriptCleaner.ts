/**
 * Clean script by removing camera directions and visual metadata
 * Used for voiceover generation to ensure only spoken dialogue is read
 */
export const cleanScriptForVoiceover = (rawScript: string): string => {
  if (!rawScript || typeof rawScript !== "string") {
    return "";
  }

  let cleaned = rawScript;

  // Remove bracketed content including multi-line: [OPENING SCENE: ... ], [SCENE: ... ], [Wide shot], etc.
  // Using [\s\S]*? to match any character including newlines
  cleaned = cleaned.replace(/\[[\s\S]*?\]/g, "");

  // Remove parenthetical directions (Wide shot), (Camera pulls back), etc.
  cleaned = cleaned.replace(
    /\(.*?(?:shot|pan|zoom|fade|cut|dissolve|transition|camera|pull|push|dolly|track|reveal|crane|handheld).*?\)/gi,
    "",
  );

  // Remove lines starting with shot/visual/camera numbers: "Shot 1:", "Visual 2:", etc.
  cleaned = cleaned.replace(
    /^[\s]*(Shot|Visual|Camera|Scene|Action|Music|Sound|Voice|Narration)[\s\d]*:.*$/gm,
    "",
  );

  // Remove common scene directions in all caps
  cleaned = cleaned.replace(
    /^[\s]*(FADE IN|FADE OUT|CUT TO|DISSOLVE TO|TRANSITION|INT\.|EXT\.|OPEN|CLOSE|BEGIN|END|OPEN ON|CLOSE ON)[\s:]*.*$/gm,
    "",
  );

  // Remove any line that starts with common camera shot names and direction keywords
  cleaned = cleaned.replace(
    /^[\s]*(Wide[\s-]*shot|Close[\s-]*up|Medium[\s-]*shot|Extreme[\s-]*close[\s-]*up|Two[\s-]*shot|Over[\s-]*the[\s-]*shoulder|Long[\s-]*shot|Establishing[\s-]*shot|Aerial[\s-]*shot|Bird's?[\s-]*eye[\s-]*view|POV|Point[\s-]*of[\s-]*view|Tracking[\s-]*shot|Opening[\s-]*shot|Opening[\s-]*on|Pan|Tilt|Zoom)[\s:]*(.*)$/gim,
    "$2",
  );

  // Remove direction patterns with colons: "Opening shot:", "Quick montage:", "Setup:", etc.
  cleaned = cleaned.replace(
    /^[\s]*(Opening[\s-]*shot|Quick[\s-]*(?:montage|shot)|Setup|Image[\s-]*(?:of)?|Video|Scene|Intro|Start|Begin|Establishing)[\s:]*:?[\s]*/gim,
    "",
  );

  // Remove "Shot X:" patterns anywhere in the text (not just at line start)
  cleaned = cleaned.replace(/\bShot\s+\d+[\s:]*(?=\S)/gi, "");

  // Remove inline parenthetical camera directions mixed with dialogue
  cleaned = cleaned.replace(
    /[\s]*\([A-Z][^)]*(?:shot|camera|pan|zoom|fade|cut|dissolve|transition)[^)]*\)[\s]*/gi,
    " ",
  );

  // Clean up extra whitespace and newlines
  cleaned = cleaned.replace(/\n\s*\n/g, "\n").trim();
  cleaned = cleaned.replace(/^\s*-\s*/gm, "");
  cleaned = cleaned.replace(/\s+/g, " ");

  return cleaned;
};
