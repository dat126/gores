
import React from 'react';
import { Terminal, Settings, Activity, History as HistoryIcon, Zap } from 'lucide-react';

interface SidebarProps {
  onHistoryClick: () => void;
  onCollectionsClick: () => void;
  activeView: 'history' | 'collections';
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onHistoryClick, onCollectionsClick }) => {
  return (
    <div className="w-16 flex flex-col items-center bg-gray-900 border-r border-gray-800 py-4 h-full">
      <div className="mb-8 p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/30">
        <Terminal className="text-white w-6 h-6" />
      </div>
      
      <div className="flex flex-col gap-6 w-full items-center">
        <button 
          onClick={onHistoryClick}
          className={`p-3 rounded-xl transition-all ${activeView === 'history' ? 'bg-gray-800 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          title="历史记录"
        >
          <HistoryIcon className="w-5 h-5" />
        </button>
        <button 
          onClick={onCollectionsClick}
          className={`p-3 rounded-xl transition-all ${activeView === 'collections' ? 'bg-gray-800 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          title="集合"
        >
          <Activity className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-auto">
        <button className="p-3 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all" title="设置">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active 
        ? 'border-indigo-500 text-indigo-400' 
        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
    }`}
  >
    {children}
  </button>
);
