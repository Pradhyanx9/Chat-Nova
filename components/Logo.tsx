
import React from 'react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glow?: boolean;
  loading?: boolean;
  id?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '', 
  glow = false, 
  loading = false,
  id = "nova-logo"
}) => {
  const dims = {
    xs: 'h-6',
    sm: 'h-8',
    md: 'h-16',
    lg: 'h-32',
    xl: 'h-48'
  };

  return (
    <div id={id} className={`relative flex flex-col items-center justify-center ${dims[size]} ${className} ${loading ? 'animate-pulse' : ''}`}>
      {glow && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-cyan-400/20 dark:bg-cyan-500/10 blur-[40px] rounded-full"></div>
      )}
      <svg 
        viewBox="0 0 100 100" 
        className={`h-full w-auto transition-all duration-700`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Black Sun Logo */}
        <g 
          className={`fill-black dark:fill-white origin-center ${loading ? 'animate-[spin_4s_linear_infinite]' : ''}`}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <circle cx="50" cy="50" r="18" />
          {Array.from({ length: 32 }).map((_, i) => (
            <polygon key={i} points="47,33 53,33 50,10" transform={`rotate(${i * 11.25} 50 50)`} />
          ))}
        </g>
      </svg>
    </div>
  );
};
