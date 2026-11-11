declare module '@echogarden/espeak-ng-emscripten' {
  interface VoiceWorker {
    get_samplerate(): number;
    set_voice(name: string, language: string): void;
    set_rate(rate: number): void;
    synthesize(text: string, callback: (samples: Int16Array, events: unknown[]) => boolean): void;
  }
  export default function createModule(): Promise<{ eSpeakNGWorker: new () => VoiceWorker }>;
}
