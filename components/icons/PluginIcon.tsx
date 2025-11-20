// FIX: Add SVG icon component to fix "not a module" error.
import React from 'react';

const PluginIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5A1.5 1.5 0 0011.5 2h-1A1.5 1.5 0 009 3.5V5H5c-1.1 0-2 .9-2 2v3.8H3.5a1.5 1.5 0 000 3H3v3.8c0 1.1.9 2 2 2h4v1.5a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5V19h4c1.1 0 2-.9 2-2v-4h1.5a1.5 1.5 0 000-3z" />
  </svg>
);

export default PluginIcon;
