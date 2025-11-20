import React from 'react';

interface ProgressBarProps {
  value: number;
  text: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, text }) => {
  return (
    <div className="w-full max-w-md text-center">
      <p className="text-lg font-semibold text-gray-200 mb-3">{text}</p>
      <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
        <div 
          className="bg-primary h-4 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
