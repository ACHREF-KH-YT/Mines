/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Image as ImageIcon, 
  Music, 
  Volume2, 
  Trash2, 
  Play, 
  Info, 
  Sparkles, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { audioEngine } from "../utils/audioEngine";

// Utility to convert Base64 back to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const base64String = base64.split(",")[1] || base64;
  const binaryString = window.atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Utility to convert File to Base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

interface MediaCustomizerProps {
  customBgImage: string | null;
  onBgImageChange: (dataUrl: string | null) => void;
}

export const MediaCustomizer: React.FC<MediaCustomizerProps> = ({
  customBgImage,
  onBgImageChange,
}) => {
  const [dragActiveBg, setDragActiveBg] = useState(false);
  const [activeSoundKey, setActiveSoundKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Keep track of registered custom sound file names
  const [soundNames, setSoundNames] = useState<{ [key: string]: string | null }>({
    click: null,
    diamond: null,
    explosion: null,
    cashout: null,
    loss: null,
    music: null,
  });

  const fileInputRefBg = useRef<HTMLInputElement>(null);
  const audioInputRefs = {
    click: useRef<HTMLInputElement>(null),
    diamond: useRef<HTMLInputElement>(null),
    explosion: useRef<HTMLInputElement>(null),
    cashout: useRef<HTMLInputElement>(null),
    loss: useRef<HTMLInputElement>(null),
    music: useRef<HTMLInputElement>(null),
  };

  // Load custom sounds from LocalStorage on mount
  useEffect(() => {
    const loadAllCustomSounds = async () => {
      const keys = ["click", "diamond", "explosion", "cashout", "loss", "music"];
      const updatedNames: { [key: string]: string | null } = {};

      for (const key of keys) {
        const storedBase64 = localStorage.getItem(`custom_sound_${key}`);
        const storedName = localStorage.getItem(`custom_sound_name_${key}`);
        
        if (storedBase64 && storedName) {
          try {
            const arrayBuffer = base64ToArrayBuffer(storedBase64);
            await audioEngine.registerCustomSound(key, arrayBuffer);
            updatedNames[key] = storedName;
          } catch (e) {
            console.error(`Failed to register stored sound for ${key}`, e);
          }
        }
      }
      setSoundNames(prev => ({ ...prev, ...updatedNames }));
    };

    loadAllCustomSounds();
  }, []);

  // Show auto-dismiss messages
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Handle Drag-and-Drop for background image
  const handleDragBg = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveBg(true);
    } else if (e.type === "dragleave") {
      setDragActiveBg(false);
    }
  };

  const handleDropBg = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveBg(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processBgFile(file);
    }
  };

  const processBgFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a valid image file (png, jpeg, webp).");
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      // Double check size to prevent localStorage overflow
      if (base64.length > 3.5 * 1024 * 1024) {
        setErrorMsg("Background image is too large! Please choose an image smaller than 2MB.");
        return;
      }
      localStorage.setItem("custom_mines_bg", base64);
      onBgImageChange(base64);
      setSuccessMsg("Custom background image applied perfectly!");
    } catch (err) {
      setErrorMsg("Failed to read image file.");
    }
  };

  const handleFileChangeBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processBgFile(e.target.files[0]);
    }
  };

  const clearBgImage = () => {
    localStorage.removeItem("custom_mines_bg");
    onBgImageChange(null);
    setSuccessMsg("Background reset to stunning galaxy theme.");
  };

  // Handle Sound File upload
  const handleSoundUpload = async (key: string, file: File) => {
    if (!file.type.startsWith("audio/") && !file.name.endsWith(".mp3") && !file.name.endsWith(".wav") && !file.name.endsWith(".ogg") && !file.name.endsWith(".m4a")) {
      setErrorMsg("Please upload a valid audio file (mp3, wav, ogg, m4a).");
      return;
    }

    // Read file as ArrayBuffer to decode in context
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        setErrorMsg("Could not read audio file.");
        return;
      }

      try {
        await audioEngine.registerCustomSound(key, arrayBuffer);
        
        // Save metadata to state
        setSoundNames(prev => ({
          ...prev,
          [key]: file.name
        }));

        // Convert and store in localStorage for durability if size is reasonable
        const base64 = await fileToBase64(file);
        if (base64.length < 2.5 * 1024 * 1024) {
          try {
            localStorage.setItem(`custom_sound_${key}`, base64);
            localStorage.setItem(`custom_sound_name_${key}`, file.name);
          } catch (err) {
            console.warn("Storage quota limit reached, audio will only persist for this session.");
          }
        } else {
          console.warn("Audio file is large, saved in memory for this session only.");
        }

        setSuccessMsg(`Uploaded and loaded custom sound for "${key}"!`);
      } catch (err) {
        setErrorMsg("Failed to decode audio. Please ensure the file is not corrupted.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAudioFileChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSoundUpload(key, e.target.files[0]);
    }
  };

  const removeCustomSound = (key: string) => {
    audioEngine.clearCustomSound(key);
    localStorage.removeItem(`custom_sound_${key}`);
    localStorage.removeItem(`custom_sound_name_${key}`);
    setSoundNames(prev => ({ ...prev, [key]: null }));
    setSuccessMsg(`Reset "${key}" sound effect back to retro synthesizer.`);
  };

  const previewSound = (key: string) => {
    audioEngine.init();
    if (key === "click") audioEngine.playClick();
    else if (key === "diamond") audioEngine.playDiamond(3);
    else if (key === "explosion") audioEngine.playExplosion();
    else if (key === "cashout") audioEngine.playCashout();
    else if (key === "loss") audioEngine.playSadLoss();
    else if (key === "music") {
      audioEngine.stopMusic();
      audioEngine.startMusic();
    }
  };

  const soundConfig = [
    { key: "click", label: "Button Click SFX", desc: "Played when navigating/interacting" },
    { key: "diamond", label: "Diamond Reveal SFX", desc: "Sparkling crystal tone on lucky reveals" },
    { key: "explosion", label: "Mine Explosion SFX", desc: "Bass rumble boom when hitting a mine" },
    { key: "cashout", label: "Victory Cashout SFX", desc: "Rising major scale chime on payouts" },
    { key: "loss", label: "Game Over SFX", desc: "Sad descending warm analog synth tone" },
    { key: "music", label: "Aether Ambient BGM", desc: "Chill looping space music for focus" },
  ];

  return (
    <div id="media-customizer-panel" className="w-full rounded-3xl glass p-5 shadow-2xl relative overflow-hidden flex flex-col gap-6">
      {/* Top Background Glow */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-brand-pink/5 rounded-full blur-3xl pointer-events-none" />

      {/* Heading */}
      <div className="flex flex-col gap-1 border-b border-white/5 pb-4 relative z-10">
        <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-cyan animate-pulse" />
          Aether Custom Media Workshop
        </h3>
        <p className="text-xs text-gray-400">
          Upload custom visual wallpapers and high fidelity audio soundwaves to shape your ultimate casino experience.
        </p>
      </div>

      {/* Floating Status Alerts */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-brand-pink/15 border border-brand-pink/35 text-brand-pink text-xs flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        
        {/* WALLPAPER PORTAL */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 font-mono">
              <ImageIcon className="w-4 h-4 text-brand-cyan" />
              1. Visual Wallpaper
            </span>
            {customBgImage && (
              <button
                onClick={clearBgImage}
                className="text-[10px] font-bold text-brand-pink/80 hover:text-brand-pink flex items-center gap-1 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Theme
              </button>
            )}
          </div>

          <div
            onDragEnter={handleDragBg}
            onDragOver={handleDragBg}
            onDragLeave={handleDragBg}
            onDrop={handleDropBg}
            onClick={() => fileInputRefBg.current?.click()}
            className={`h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 transition-all duration-300 cursor-pointer text-center relative overflow-hidden group ${
              dragActiveBg 
                ? "border-brand-cyan bg-brand-cyan/5 shadow-[0_0_20px_rgba(0,255,204,0.15)]" 
                : "border-white/10 bg-brand-bg/60 hover:border-brand-cyan/40 hover:bg-brand-bg/85"
            }`}
          >
            <input
              type="file"
              ref={fileInputRefBg}
              onChange={handleFileChangeBg}
              accept="image/*"
              className="hidden"
            />

            {customBgImage ? (
              <>
                <img
                  src={customBgImage}
                  alt="Custom Wallpaper preview"
                  className="absolute inset-0 w-full h-full object-cover opacity-35 filter blur-[1px] transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/95 via-brand-bg/60 to-transparent" />
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <CheckCircle className="w-8 h-8 text-brand-cyan filter drop-shadow-[0_0_8px_rgba(0,255,204,0.5)] animate-bounce" style={{ animationDuration: '3s' }} />
                  <span className="text-xs text-white font-bold font-mono">Custom Wallpaper Active</span>
                  <span className="text-[10px] text-gray-400 mt-1 max-w-[200px] truncate">Drag or click to swap wallpaper</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:text-brand-cyan transition-colors">
                  <Upload className="w-5 h-5 text-gray-400 group-hover:text-brand-cyan" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-200">Drag & Drop background image</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Supports PNG, JPEG, WEBP (Max 2MB)</p>
                </div>
                <span className="mt-2 text-[10px] px-2.5 py-1 rounded bg-brand-cyan/10 text-brand-cyan font-semibold font-mono">
                  Browse Files
                </span>
              </div>
            )}
          </div>
        </div>

        {/* AUDIO STUDIO */}
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 font-mono">
            <Music className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '8s' }} />
            2. Soundwaves & SFX Synthesizer
          </span>

          <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
            {soundConfig.map(({ key, label, desc }) => {
              const fileUploaded = soundNames[key];
              return (
                <div 
                  key={key} 
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 ${
                    fileUploaded 
                      ? "bg-brand-cyan/5 border-brand-cyan/20" 
                      : "bg-brand-bg/80 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-200 truncate">{label}</span>
                      {fileUploaded && (
                        <span className="text-[9px] font-mono font-bold bg-brand-cyan/15 text-brand-cyan px-1.5 py-0.5 rounded-full shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[9.5px] text-gray-400 block truncate mt-0.5">
                      {fileUploaded ? `📄 ${fileUploaded}` : desc}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="file"
                      ref={audioInputRefs[key as keyof typeof audioInputRefs]}
                      onChange={handleAudioFileChange(key)}
                      accept="audio/*"
                      className="hidden"
                    />

                    {/* Preview Button */}
                    <button
                      onClick={() => previewSound(key)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-all active:scale-95"
                      title="Preview Current Sound"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>

                    {/* Upload New Sound */}
                    <button
                      onClick={() => audioInputRefs[key as keyof typeof audioInputRefs].current?.click()}
                      className={`p-1.5 rounded-lg transition-all active:scale-95 ${
                        fileUploaded
                          ? "bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan"
                          : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400"
                      }`}
                      title="Upload custom audio file"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>

                    {/* Reset Button */}
                    {fileUploaded && (
                      <button
                        onClick={() => removeCustomSound(key)}
                        className="p-1.5 rounded-lg bg-brand-pink/10 hover:bg-brand-pink/20 text-brand-pink transition-all active:scale-95"
                        title="Reset to default retro sound"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex gap-2 items-start mt-1 relative z-10">
        <Info className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
        <p className="text-[10px] text-gray-400 leading-normal">
          All custom media uploads are processed fully on your device and are saved inside your browser&apos;s sandbox cache. Background Music and large sound files persist for the active gaming session.
        </p>
      </div>

    </div>
  );
};
