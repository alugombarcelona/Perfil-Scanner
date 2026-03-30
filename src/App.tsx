import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Search, Info, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface ProfileResult {
  reference: string;
  series: string;
  description: string;
  confidence: 'Alto' | 'Medio' | 'Bajo';
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Extract base64 data
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            }
          },
          "Eres un experto en perfiles de aluminio, específicamente de la marca Alugom (por ejemplo, series ALG, ALG 65, ALG 75, etc.). Analiza esta imagen de un perfil de aluminio. Identifica la referencia del perfil, la serie a la que pertenece y proporciona una breve descripción de su función (marco, hoja, inversor, junquillo, etc.). Devuelve el resultado en formato JSON."
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reference: { type: Type.STRING, description: "Referencia del perfil (ej. 1020, 8040)" },
              series: { type: Type.STRING, description: "Serie del perfil (ej. ALG 65, ALG 75)" },
              description: { type: Type.STRING, description: "Descripción de la función del perfil" },
              confidence: { type: Type.STRING, description: "Nivel de confianza (Alto, Medio, Bajo)" }
            },
            required: ["reference", "series", "description", "confidence"]
          }
        }
      });

      if (response.text) {
        const parsedResult = JSON.parse(response.text) as ProfileResult;
        setResult(parsedResult);
      } else {
        throw new Error("No se recibió respuesta del modelo.");
      }
    } catch (err: any) {
      console.error("Error analyzing image:", err);
      setError("Hubo un error al analizar la imagen. Por favor, inténtalo de nuevo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight">AluID Pro</h1>
          </div>
          <div className="text-blue-200 text-sm font-medium">Asistente de Taller</div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pb-24">
        <div className="mb-6 text-center mt-4">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Identificador de Perfiles</h2>
          <p className="text-slate-600 text-sm">
            Toma una foto del corte del perfil de aluminio para identificar su referencia y serie en el catálogo.
          </p>
        </div>

        {/* Image Upload/Preview Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <AnimatePresence mode="wait">
            {!image ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-slate-300 rounded-xl m-4 bg-slate-50"
              >
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-slate-700 font-medium mb-1">Capturar Perfil</p>
                <p className="text-slate-500 text-sm text-center mb-6">
                  Asegúrate de que el corte transversal sea claramente visible y esté bien iluminado.
                </p>
                
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Cámara / Galería</span>
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                <img 
                  src={image} 
                  alt="Perfil a analizar" 
                  className="w-full h-auto max-h-[400px] object-contain bg-slate-100"
                />
                <button 
                  onClick={reset}
                  className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Button */}
        {image && !result && !isAnalyzing && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={analyzeImage}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Search className="w-6 h-6" />
            <span>Identificar Perfil</span>
          </motion.button>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-4"
          >
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <div className="text-center">
              <p className="font-medium text-slate-800">Analizando geometría...</p>
              <p className="text-sm text-slate-500">Consultando base de datos de perfiles Alugom</p>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-800"
          >
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        {/* Result Card */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden mt-6"
          >
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Identificación Completada</span>
              </div>
              <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                result.confidence === 'Alto' ? 'bg-green-100 text-green-800' :
                result.confidence === 'Medio' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                Confianza: {result.confidence}
              </div>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Referencia</p>
                  <p className="text-2xl font-bold text-blue-700">{result.reference}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Serie</p>
                  <p className="text-xl font-bold text-slate-800">{result.series}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-2">Descripción</p>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {result.description}
                </p>
              </div>

              {/* Simulated Catalog Image Placeholder */}
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-2 flex items-center gap-1">
                  <ImageIcon className="w-4 h-4" />
                  Esquema de Catálogo
                </p>
                <div className="bg-slate-100 rounded-xl h-40 border border-slate-200 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                  <div className="text-center relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-blue-600/30 rounded-lg mb-2 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-blue-600/50 rounded-sm transform rotate-45"></div>
                    </div>
                    <p className="text-slate-500 font-mono text-sm font-medium">ESQUEMA TÉCNICO</p>
                    <p className="text-slate-400 text-xs mt-1">Ref: {result.reference}</p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={reset}
                className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-xl font-medium transition-colors"
              >
                Escanear Otro Perfil
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
