
import React from 'react';

const AnimationIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 6h2v12H4zm10.29 3.71-2.58 2.58c-.39.39-.39 1.03 0 1.42l2.58 2.58c.63.63 1.71.18 1.71-.71V8.29c0-.89-1.08-1.34-1.71-.71zM20 6h-2v12h2zM8 6h2v12H8z" />
  </svg>
);

export default AnimationIcon;
