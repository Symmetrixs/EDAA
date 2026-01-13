import React from 'react';
import { FaTimes, FaDownload } from 'react-icons/fa';

export default function ViewCanvasModal({ isOpen, onClose, canvasUrl }) {
  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = canvasUrl;
    link.download = 'canvas_layout.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-blue-100">Canvas Layout View</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/50 rounded-lg transition-all text-sm font-semibold flex items-center gap-2"
            >
              <FaDownload />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Canvas Image */}
        <div className="flex-1 overflow-auto p-6 bg-gray-950">
          <div className="flex items-center justify-center min-h-full">
            <img
              src={canvasUrl}
              alt="Canvas Layout"
              className="max-w-full h-auto rounded-lg shadow-2xl"
              style={{ maxHeight: 'calc(90vh - 120px)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
