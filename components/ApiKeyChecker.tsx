
import React, { useState, useEffect } from 'react';

interface ApiKeyCheckerProps {
  onValidated: () => void;
}

const ApiKeyChecker: React.FC<ApiKeyCheckerProps> = ({ onValidated }) => {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (hasKey) {
        onValidated();
      } else {
        setChecking(false);
      }
    };
    checkKey();
  }, [onValidated]);

  const handleSelectKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    // Proceed immediately as per instructions
    onValidated();
  };

  if (checking) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-center">
      <div className="bg-neutral-900 border-2 border-orange-500 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-3xl font-black text-orange-500 mb-4 italic uppercase">Elite Access Required</h2>
        <p className="text-gray-300 mb-6 leading-relaxed">
          To generate high-quality 4K workout guides, you must select your Gemini API key from a paid project.
        </p>
        <button
          onClick={handleSelectKey}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-black py-4 rounded-xl uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-red-500/30"
        >
          Select API Key
        </button>
        <p className="mt-4 text-xs text-gray-500">
          Must be from a paid project. See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline hover:text-orange-400">billing docs</a>.
        </p>
      </div>
    </div>
  );
};

export default ApiKeyChecker;
