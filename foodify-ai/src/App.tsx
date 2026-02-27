/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Image as ImageIcon, Wand2, Loader2, Sparkles } from 'lucide-react';

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY as string
});

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        resolve(base64Data);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'enhance' | 'style'>('enhance');
  
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-orange-500" />
          <h1 className="text-xl font-semibold tracking-tight">Foodify AI</h1>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-stone-200">
          <button 
            onClick={() => setActiveTab('enhance')}
            className={`pb-3 px-2 font-medium transition-colors relative ${activeTab === 'enhance' ? 'text-orange-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Enhance Food
            {activeTab === 'enhance' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('style')}
            className={`pb-3 px-2 font-medium transition-colors relative ${activeTab === 'style' ? 'text-orange-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Style Transfer
            {activeTab === 'style' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'enhance' ? (
            <EnhanceTab key="enhance" />
          ) : (
            <StyleTab key="style" />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function EnhanceTab() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("Transform this food image into a refined fine-dining presentation shot from a slightly elevated top-down angle. Use soft natural daylight coming from one side, creating gentle realistic shadows. Place the dishes on a clean matte white table with generous negative space. Maintain a minimalist Scandinavian aesthetic with elegant plating and balanced composition. Keep colors natural and slightly muted, with true-to-life textures and subtle depth of field. Avoid over-sharpening, artificial glow, or excessive contrast. Make it look like a high-end restaurant tasting menu photographed in natural light..");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResultImage(null);
    }
  };

  const generateImage = async () => {
    if (!image) return;
    setIsGenerating(true);
    setError(null);
    
    try {
      const base64Data = await fileToBase64(image);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: image.type,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          setResultImage(imageUrl);
          foundImage = true;
          break;
        }
      }
      
      if (!foundImage) {
        setError("No image was generated. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Upload Food Photo</label>
          <div className="relative border-2 border-dashed border-stone-300 rounded-2xl p-8 text-center hover:bg-stone-100 transition-colors cursor-pointer overflow-hidden group">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity" />
            ) : null}
            <div className="relative z-0 flex flex-col items-center justify-center gap-2">
              <Upload className="w-8 h-8 text-stone-400" />
              <p className="text-sm text-stone-600 font-medium">Click or drag image here</p>
              <p className="text-xs text-stone-400">JPG, PNG up to 5MB</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Enhancement Prompt</label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 p-3 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none text-sm"
            placeholder="Describe how you want the food to look..."
          />
        </div>

        <button 
          onClick={generateImage}
          disabled={!image || isGenerating}
          className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Enhance Photo
            </>
          )}
        </button>
        
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </div>

      <div className="bg-stone-100 rounded-3xl border border-stone-200 p-6 flex flex-col items-center justify-center min-h-[400px]">
        {resultImage ? (
          <div className="w-full space-y-4">
            <h3 className="font-medium text-stone-800">Result</h3>
            <img src={resultImage} alt="Generated Food" className="w-full rounded-2xl shadow-sm" />
            <a 
              href={resultImage} 
              download="enhanced-food.png"
              className="inline-block text-sm text-orange-600 font-medium hover:underline"
            >
              Download Image
            </a>
          </div>
        ) : (
          <div className="text-center text-stone-400 flex flex-col items-center gap-3">
            <ImageIcon className="w-12 h-12 opacity-50" />
            <p>Your enhanced photo will appear here</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StyleTab() {
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  
  const [prompt, setPrompt] = useState("Recreate the first food image using the plating, lighting, and visual style of the second reference image. Make it look professional and appetizing.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMainUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImage(file);
      setMainPreview(URL.createObjectURL(file));
      setResultImage(null);
    }
  };

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRefImage(file);
      setRefPreview(URL.createObjectURL(file));
      setResultImage(null);
    }
  };

  const generateImage = async () => {
    if (!mainImage || !refImage) return;
    setIsGenerating(true);
    setError(null);
    
    try {
      const mainBase64 = await fileToBase64(mainImage);
      const refBase64 = await fileToBase64(refImage);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: mainBase64,
                mimeType: mainImage.type,
              },
            },
            {
              inlineData: {
                data: refBase64,
                mimeType: refImage.type,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          setResultImage(imageUrl);
          foundImage = true;
          break;
        }
      }
      
      if (!foundImage) {
        setError("No image was generated. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Main Food Photo</label>
            <div className="relative border-2 border-dashed border-stone-300 rounded-2xl p-4 text-center hover:bg-stone-100 transition-colors cursor-pointer overflow-hidden group h-40 flex items-center justify-center">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleMainUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {mainPreview ? (
                <img src={mainPreview} alt="Main" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity" />
              ) : null}
              <div className="relative z-0 flex flex-col items-center justify-center gap-1">
                <Upload className="w-6 h-6 text-stone-400" />
                <p className="text-xs text-stone-600 font-medium">Upload Main</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Style Reference</label>
            <div className="relative border-2 border-dashed border-stone-300 rounded-2xl p-4 text-center hover:bg-stone-100 transition-colors cursor-pointer overflow-hidden group h-40 flex items-center justify-center">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleRefUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {refPreview ? (
                <img src={refPreview} alt="Reference" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity" />
              ) : null}
              <div className="relative z-0 flex flex-col items-center justify-center gap-1">
                <Upload className="w-6 h-6 text-stone-400" />
                <p className="text-xs text-stone-600 font-medium">Upload Style</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Style Instructions (Optional)</label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-24 p-3 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none text-sm"
            placeholder="Describe how you want to combine them..."
          />
        </div>

        <button 
          onClick={generateImage}
          disabled={!mainImage || !refImage || isGenerating}
          className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Apply Style
            </>
          )}
        </button>
        
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </div>

      <div className="bg-stone-100 rounded-3xl border border-stone-200 p-6 flex flex-col items-center justify-center min-h-[400px]">
        {resultImage ? (
          <div className="w-full space-y-4">
            <h3 className="font-medium text-stone-800">Result</h3>
            <img src={resultImage} alt="Generated Food" className="w-full rounded-2xl shadow-sm" />
            <a 
              href={resultImage} 
              download="styled-food.png"
              className="inline-block text-sm text-orange-600 font-medium hover:underline"
            >
              Download Image
            </a>
          </div>
        ) : (
          <div className="text-center text-stone-400 flex flex-col items-center gap-3">
            <ImageIcon className="w-12 h-12 opacity-50" />
            <p>Your styled photo will appear here</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
