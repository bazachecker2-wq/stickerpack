// FIX: Add SVG icon component to fix "not a module" error.
import React from 'react';

const TerminalIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M20 4H4C2.89 4 2 4.9 2 6v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zm-2-7h-6v-2h6v2z" />
  </svg>
);

export default TerminalIcon;
