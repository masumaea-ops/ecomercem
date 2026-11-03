
import React from 'react';
import { Home } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center animate-fade-in">
      <div className="bg-white p-8 rounded-lg shadow-xl border-t-4 border-masuma-orange max-w-md w-full">
        <h1 className="text-6xl font-bold text-masuma-dark font-display mb-2">404</h1>
        <div className="h-1 w-16 bg-masuma-orange mx-auto mb-6"></div>
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide mb-4">Page Not Found</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        
        <div className="space-y-3">
          <a 
            href="/"
            className="block w-full bg-masuma-dark text-white py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-masuma-orange transition flex items-center justify-center gap-2"
          >
            <Home size={16} /> Return Home
          </a>
          <button 
            onClick={() => window.history.back()}
            className="block w-full bg-white border border-gray-300 text-gray-600 py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
