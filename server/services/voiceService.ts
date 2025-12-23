import OpenAI from "openai";

export interface Voice {
  id: string;
  name: string;
  lang: string;
  gender: string;
  isPremium: boolean;
  tone: string;
  style: string;
  useCase: string;
}

const VOICES: Voice[] = [
  {
    id: "voice1",
    name: "Alex",
    gender: "Male",
    lang: "English",
    isPremium: false,
    tone: "Friendly & Approachable",
    style: "Conversational",
    useCase: "Tutorials, casual explainers, friendly advice",
  },
  {
    id: "voice2",
    name: "Jordan",
    gender: "Female",
    lang: "English",
    isPremium: false,
    tone: "Professional & Clear",
    style: "Informative",
    useCase: "News, reports, educational content",
  },
  {
    id: "voice3",
    name: "Casey",
    gender: "Non-binary",
    lang: "English",
    isPremium: false,
    tone: "Energetic & Engaging",
    style: "Upbeat",
    useCase: "Social media, promotional, lifestyle content",
  },
  {
    id: "voice4",
    name: "Morgan",
    gender: "Female",
    lang: "English",
    isPremium: false,
    tone: "Warm & Confident",
    style: "Narrator",
    useCase: "Stories, documentaries, corporate videos",
  },
  {
    id: "voice5",
    name: "Phoenix",
    gender: "Male",
    lang: "English",
    isPremium: true,
    tone: "Dynamic & Commanding",
    style: "Authoritative",
    useCase: "Trailers, dramatic scenes, powerful messages",
  },
  {
    id: "voice6",
    name: "Riley",
    gender: "Female",
    lang: "English",
    isPremium: true,
    tone: "Sophisticated & Polished",
    style: "Premium",
    useCase: "Luxury products, high-end commercials",
  },
  {
    id: "voice7",
    name: "Blake",
    gender: "Male",
    lang: "English",
    isPremium: true,
    tone: "Calm & Soothing",
    style: "Meditative",
    useCase: "Wellness, meditation, relaxation content",
  },
  {
    id: "voice8",
    name: "Quinn",
    gender: "Female",
    lang: "English",
    isPremium: true,
    tone: "Energetic & Fun",
    style: "Playful",
    useCase: "Comedy, gaming, entertainment content",
  },
  {
    id: "voice9",
    name: "Taylor",
    gender: "Male",
    lang: "English",
    isPremium: true,
    tone: "Bold & Passionate",
    style: "Motivational",
    useCase: "Inspirational, fitness, self-help videos",
  },
  {
    id: "voice10",
    name: "Cameron",
    gender: "Female",
    lang: "English",
    isPremium: true,
    tone: "Elegant & Articulate",
    style: "Premium Narrator",
    useCase: "Documentaries, prestige brands, podcasts",
  },
  {
    id: "voice11",
    name: "Jordan",
    gender: "Male",
    lang: "English",
    isPremium: true,
    tone: "Deep & Resonant",
    style: "Dramatic",
    useCase: "Movie trailers, epic content, announcements",
  },
  {
    id: "voice12",
    name: "Morgan",
    gender: "Female",
    lang: "English",
    isPremium: true,
    tone: "Crisp & Professional",
    style: "Business",
    useCase: "Corporate presentations, training, B2B",
  },
];

const VOICE_GENDER_TO_OPENAI_VOICE: Record<string, string> = {
  Alex: "alloy",
  Jordan: "shimmer",
  Casey: "echo",
  Morgan: "fable",
  Phoenix: "onyx",
  Riley: "nova",
  Blake: "shimmer",
  Quinn: "nova",
  Taylor: "onyx",
  Cameron: "nova",
};

export class VoiceService {
  private openai: OpenAI | null = null;
  private openaiInitialized = false;

  constructor() {
    this.initializeOpenAI();
  }

  private initializeOpenAI(): void {
    if (this.openaiInitialized) {
      return;
    }

    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn("[VoiceService] OPENAI_API_KEY not set");
        this.openai = null;
      } else {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 30000,
          httpAgent: undefined,
          maxRetries: 1,
        });
        console.log("[VoiceService] OpenAI client initialized");
      }
    } catch (error) {
      console.error(
        "[VoiceService] Failed to initialize OpenAI client:",
        error,
      );
      this.openai = null;
    }

    this.openaiInitialized = true;
  }

  getAvailableVoices(): Voice[] {
    return VOICES;
  }

  getVoiceById(voiceId: string): Voice | undefined {
    return VOICES.find((v) => v.id === voiceId);
  }

  async generateVoicePreview(voiceId: string, text: string): Promise<Buffer> {
    if (!this.openai) {
      throw new Error(
        "OpenAI client not available. OPENAI_API_KEY may not be configured.",
      );
    }

    const voice = this.getVoiceById(voiceId);
    if (!voice) {
      throw new Error(`Voice not found: ${voiceId}`);
    }

    const openaiVoice = VOICE_GENDER_TO_OPENAI_VOICE[voice.name] || "alloy";

    try {
      console.log(
        `[VoiceService] Generating preview for voice ${voiceId} (${voice.name})`,
      );

      const response = await this.openai.audio.speech.create({
        model: "tts-1",
        voice: openaiVoice as
          | "alloy"
          | "echo"
          | "fable"
          | "onyx"
          | "shimmer"
          | "nova",
        input: text || `This is a preview of the ${voice.name} voice.`,
      });

      // Convert the response to a buffer
      const arrayBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      console.log(
        `[VoiceService] Generated preview for voice ${voiceId}, size: ${buffer.length} bytes`,
      );
      return buffer;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[VoiceService] Failed to generate preview for voice ${voiceId}:`,
        errorMessage,
      );
      throw new Error(`Failed to generate voice preview: ${errorMessage}`);
    }
  }
}
