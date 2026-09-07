'use client';

import React from 'react';
import { SavedMissionsManager } from '@/components/missions/SavedMissionsManager';
import { X } from 'lucide-react';

interface SavedMissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SavedMissionsDrawer: React.FC<SavedMissionsDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#070b16] border-l border-cyan-900/60 h-full p-4 sm:p-5 flex flex-col shadow-2xl font-mono text-xs overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-black/40 animate-slideLeft">
        {/* Header Close */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-950 mb-3">
          <span className="text-cyan-400 font-extrabold text-sm tracking-wider">SAVED MISSIONS DRAWER</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white border border-cyan-950"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Saved Missions Manager Component */}
        <SavedMissionsManager onCloseDrawer={onClose} isCompactDrawer={true} />
      </div>
    </div>
  );
};
