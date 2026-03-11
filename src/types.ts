export interface LetterData {
  letra: string;
  objeto_grafico: string;
  descripcion_audio: string;
  frase_ejemplo: string;
}

export interface AppState {
  selectedLetter: LetterData | null;
  isGeneratingImage: boolean;
  isGeneratingAudio: boolean;
  generatedImageUrl: string | null;
  generatedAudioUrl: string | null;
}
