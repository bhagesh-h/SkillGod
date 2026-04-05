import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  theme?: 'dark' | 'light';
}

export const Logo: React.FC<LogoProps> = ({ className, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const primaryColor = isDark ? '#6366f1' : '#4f46e5'; // Indigo-500/600
  const strokeColor = isDark ? '#ffffff' : '#000000';
  const glowColor = '#a855f7'; // Purple-500

  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full", className)}
    >
      {/* Hexagon Background/Border */}
      <path
        d="M50 5L89 27.5V72.5L50 95L11 72.5V27.5L50 5Z"
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Letter G */}
      <path
        d="M37 35H24V65H37V55H31"
        stroke={strokeColor}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Letter O / Sword */}
      {/* The "O" frame */}
      <path
        d="M44 30H56V70H44V30Z"
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      
      {/* Sword Handle / Hilt - Animated Glow */}
      <motion.g
        animate={{
          filter: [
            `drop-shadow(0 0 0px ${glowColor}00)`,
            `drop-shadow(0 0 8px ${glowColor}88)`,
            `drop-shadow(0 0 0px ${glowColor}00)`
          ]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Crossguard */}
        <path
          d="M40 70H60"
          stroke={primaryColor}
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Grip */}
        <path
          d="M50 70V82"
          stroke={primaryColor}
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Pommel */}
        <circle cx="50" cy="85" r="3" fill={primaryColor} />
      </motion.g>

      {/* Letter D */}
      <path
        d="M63 35V65H71C74 65 77 61 77 50C77 39 74 35 71 35H63Z"
        stroke={strokeColor}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
