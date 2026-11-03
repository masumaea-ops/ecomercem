
import React from 'react';

interface LogoProps {
  variant?: 'default' | 'white' | 'dark';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ variant = 'default', className = '' }) => {
  const isWhite = variant === 'white';
  
  const textColor = isWhite ? '#FFFFFF' : '#E0621B';
  const subTextColor = isWhite ? '#9CA3AF' : '#1A1A1A';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tighter font-display leading-none" style={{ color: textColor }}>
            MASUMA
          </span>
          <div className="h-2 w-2 bg-masuma-orange rounded-full"></div>
        </div>
        <span className="text-[0.55rem] font-black tracking-[0.25em] uppercase leading-none mt-1.5 border-t pt-1 border-gray-200" style={{ color: subTextColor }}>
          AUTOPARTS EAST AFRICA LTD
        </span>
      </div>
    </div>
  );
};
