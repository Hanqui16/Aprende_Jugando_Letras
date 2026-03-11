import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, 
  Sparkles, 
  ArrowLeft, 
  Play, 
  BookOpen, 
  Star,
  RefreshCw,
  Loader2,
  Wand2
} from 'lucide-react';
import { ALPHABET_DATA } from './constants';
import { LetterData } from './types';
import { generateLetterImage, generateLetterAudio } from './services/geminiService';
import { GoogleGenAI } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [selectedLetter, setSelectedLetter] = useState<LetterData | null>(null);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [story, setStory] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  // Background generation of images
  useEffect(() => {
    let isMounted = true;
    const generateAll = async () => {
      // Only generate a few at a time to avoid hitting limits too hard
      const lettersToGenerate = ALPHABET_DATA.slice(0, 10); 
      for (const item of lettersToGenerate) {
        if (!isMounted) break;
        if (!imageMap[item.letra]) {
          try {
            const url = await generateLetterImage(item.objeto_grafico);
            if (isMounted) {
              setImageMap(prev => ({ ...prev, [item.letra]: url }));
            }
          } catch (e) {
            console.error(`Error generating background image for ${item.letra}:`, e);
          }
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    };
    generateAll();
    return () => { isMounted = false; };
  }, []);

  const handleLetterClick = (letter: LetterData) => {
    setSelectedLetter(letter);
    setAudioUrl(null);
    setStory(null);
    if (!imageMap[letter.letra]) {
      handleGenerateImage(letter);
    }
  };

  const handleGenerateImage = async (letter: LetterData) => {
    setIsGenerating(true);
    try {
      const url = await generateLetterImage(letter.objeto_grafico);
      setImageMap(prev => ({ ...prev, [letter.letra]: url }));
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateStory = async () => {
    if (!selectedLetter) return;
    setIsGeneratingStory(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Escribe un cuento de exactamente 3 líneas para niños de 4 años que use muchas palabras con la letra ${selectedLetter.letra}. El cuento debe tratar sobre un ${selectedLetter.objeto_grafico}.`,
      });
      setStory(response.text || "¡Había una vez una letra feliz!");
    } catch (error) {
      console.error("Error generating story:", error);
      setStory("Ocurrió un error al crear el cuento.");
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handlePlayAudio = async (text: string) => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    try {
      const base64Data = await generateLetterAudio(text);
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcmLength = Math.floor(bytes.length / 2);
      const pcmData = new Int16Array(bytes.buffer, 0, pcmLength);
      const float32Data = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0;
      }
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
      buffer.getChannelData(0).set(float32Data);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.onended = () => {
        setIsPlaying(false);
        audioCtx.close();
      };
      source.start();
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] font-sans text-gray-900 selection:bg-blue-100 relative overflow-hidden">
      {/* Playful Background Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-200 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-blue-200 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-pink-200 rounded-full blur-2xl animate-pulse delay-1000" />
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="2" fill="#CBD5E1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* Header */}
      <header className="px-6 py-10 flex justify-between items-center max-w-7xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-4"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl transform -rotate-6 border-4 border-white">
            <Sparkles className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none">
              ABC <span className="text-blue-500">Mágico</span>
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Aventura de Aprendizaje</p>
          </div>
        </motion.div>
        
        <div className="flex gap-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 px-6 py-3 bg-white rounded-2xl shadow-sm border-2 border-yellow-100"
          >
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="text-sm font-black text-gray-600">¡Genial!</span>
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-20 relative z-10">
        <AnimatePresence mode="wait">
          {!selectedLetter ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6"
            >
              {ALPHABET_DATA.map((item, index) => {
                const colors = [
                  { bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-[#E53935]', icon: 'bg-[#FFCDD2]' },
                  { bg: 'bg-[#E3F2FD]', border: 'border-[#BBDEFB]', text: 'text-[#1E88E5]', icon: 'bg-[#BBDEFB]' },
                  { bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-[#43A047]', icon: 'bg-[#C8E6C9]' },
                  { bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-[#FB8C00]', icon: 'bg-[#FFE0B2]' },
                  { bg: 'bg-[#F3E5F5]', border: 'border-[#E1BEE7]', text: 'text-[#8E24AA]', icon: 'bg-[#E1BEE7]' },
                  { bg: 'bg-[#F1F8E9]', border: 'border-[#DCEDC8]', text: 'text-[#7CB342]', icon: 'bg-[#DCEDC8]' },
                ];
                const color = colors[index % colors.length];
                
                return (
                  <motion.button
                    key={item.letra}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    whileHover={{ y: -8, scale: 1.05, rotate: index % 2 === 0 ? 2 : -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleLetterClick(item)}
                    className={cn(
                      "aspect-square rounded-[40px] flex flex-col items-center justify-center p-6 transition-all shadow-lg hover:shadow-2xl border-b-8 active:border-b-0 active:translate-y-2",
                      color.bg,
                      color.border
                    )}
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className={cn("text-7xl font-black leading-none drop-shadow-sm", color.text)}>
                        {item.letra}
                      </span>
                      {imageMap[item.letra] ? (
                        <motion.img 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          src={imageMap[item.letra]} 
                          alt={item.objeto_grafico}
                          className="w-24 h-24 object-contain mix-blend-multiply drop-shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-24 w-24 flex items-center justify-center">
                          <div className={cn("w-12 h-12 rounded-full animate-bounce flex items-center justify-center", color.icon)}>
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mt-4">
                      {item.objeto_grafico}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="max-w-6xl mx-auto bg-white rounded-[60px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] overflow-hidden border-8 border-white relative"
            >
              <div className="grid lg:grid-cols-2">
                {/* Left Side: Visuals */}
                <div className={cn(
                  "p-16 flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden",
                  ALPHABET_DATA.indexOf(selectedLetter) % 6 === 0 ? "bg-[#FFEBEE]" :
                  ALPHABET_DATA.indexOf(selectedLetter) % 6 === 1 ? "bg-[#E3F2FD]" :
                  ALPHABET_DATA.indexOf(selectedLetter) % 6 === 2 ? "bg-[#E8F5E9]" :
                  ALPHABET_DATA.indexOf(selectedLetter) % 6 === 3 ? "bg-[#FFF3E0]" :
                  ALPHABET_DATA.indexOf(selectedLetter) % 6 === 4 ? "bg-[#F3E5F5]" :
                  "bg-[#F1F8E9]"
                )}>
                  {/* Decorative circles in detail view */}
                  <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-black/5 rounded-full blur-3xl" />

                  <motion.button 
                    whileHover={{ scale: 1.1, x: -5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedLetter(null)}
                    className="absolute top-10 left-10 p-5 bg-white rounded-3xl shadow-xl hover:bg-gray-50 transition-all z-20 group"
                  >
                    <ArrowLeft className="w-6 h-6 text-gray-800 group-hover:text-blue-500 transition-colors" />
                  </motion.button>

                  <div className="absolute top-10 right-16 text-[180px] font-black text-black/5 leading-none select-none pointer-events-none">
                    {selectedLetter.letra}
                  </div>

                  <div className="relative w-96 h-96 flex items-center justify-center z-10">
                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        </div>
                        <p className="text-sm font-black text-gray-400 uppercase tracking-[0.4em]">Dibujando...</p>
                      </div>
                    ) : imageMap[selectedLetter.letra] ? (
                      <motion.div
                        initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 100 }}
                        className="relative"
                      >
                        <img 
                          src={imageMap[selectedLetter.letra]} 
                          alt={selectedLetter.objeto_grafico}
                          className="w-full h-full object-contain mix-blend-multiply drop-shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
                          referrerPolicy="no-referrer"
                        />
                        <motion.div 
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 4, repeat: Infinity }}
                          className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white rotate-12"
                        >
                          <Star className="text-white w-6 h-6 fill-current" />
                        </motion.div>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-gray-300">
                        <Sparkles className="w-20 h-20 animate-pulse" />
                        <p className="font-black uppercase tracking-widest">¡Casi listo!</p>
                      </div>
                    )}
                  </div>
                  
                  <motion.h2 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mt-12 text-6xl font-black text-gray-900 uppercase tracking-tighter drop-shadow-sm"
                  >
                    {selectedLetter.objeto_grafico}
                  </motion.h2>
                </div>

                {/* Right Side: Interaction */}
                <div className="p-16 lg:p-20 flex flex-col justify-center gap-12 bg-white">
                  <section>
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-14 h-14 bg-blue-100 rounded-[24px] flex items-center justify-center shadow-inner">
                        <Volume2 className="text-blue-600 w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900">¿Cómo suena?</h3>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Escucha y repite</p>
                      </div>
                    </div>
                    <p className="text-3xl text-gray-600 leading-tight mb-10 font-bold">
                      {selectedLetter.descripcion_audio}
                    </p>
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePlayAudio(selectedLetter.descripcion_audio)}
                      disabled={isPlaying}
                      className={cn(
                        "group relative w-full py-8 rounded-[32px] flex items-center justify-center gap-6 text-2xl font-black transition-all shadow-xl overflow-hidden border-b-8 active:border-b-0",
                        isPlaying 
                          ? "bg-gray-100 border-gray-200 text-gray-400" 
                          : "bg-blue-600 border-blue-800 text-white hover:bg-blue-500"
                      )}
                    >
                      {isPlaying ? <RefreshCw className="animate-spin w-8 h-8" /> : <Play className="w-8 h-8 fill-current" />}
                      <span>{isPlaying ? "Escuchando..." : "¡Oír Sonido!"}</span>
                    </motion.button>
                  </section>

                  <div className="h-px bg-gray-100" />

                  <section>
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-14 h-14 bg-orange-100 rounded-[24px] flex items-center justify-center shadow-inner">
                        <BookOpen className="text-orange-500 w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900">Cuento Mágico</h3>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Una historia para ti</p>
                      </div>
                    </div>
                    
                    {story ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-orange-50 p-10 rounded-[40px] border-4 border-orange-100 relative group"
                      >
                        <p className="text-2xl font-bold text-gray-700 leading-relaxed italic mb-8">
                          "{story}"
                        </p>
                        <motion.button 
                          whileHover={{ x: 5 }}
                          onClick={() => handlePlayAudio(story)}
                          disabled={isPlaying}
                          className="flex items-center gap-3 text-orange-600 font-black text-lg hover:text-orange-700 transition-colors"
                        >
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
                            <Volume2 className="w-6 h-6" />
                          </div>
                          <span>¡Léeme el cuento!</span>
                        </motion.button>
                      </motion.div>
                    ) : (
                      <motion.button 
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGenerateStory}
                        disabled={isGeneratingStory}
                        className="w-full py-8 rounded-[32px] border-4 border-dashed border-orange-200 text-orange-400 font-black text-xl flex items-center justify-center gap-4 hover:border-orange-400 hover:bg-orange-50 transition-all"
                      >
                        {isGeneratingStory ? <Loader2 className="animate-spin w-8 h-8" /> : <Wand2 className="w-8 h-8" />}
                        <span>{isGeneratingStory ? "Escribiendo..." : "¡Crear Cuento!"}</span>
                      </motion.button>
                    )}
                  </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-6 py-2 bg-white rounded-full shadow-sm border border-gray-100">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
          <p className="text-xs font-black text-gray-400 tracking-[0.3em] uppercase">Aventura de Letras • 2026</p>
        </div>
      </footer>
    </div>
  );
}
