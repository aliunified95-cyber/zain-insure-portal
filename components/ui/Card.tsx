import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      className={`bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-xl transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-zain-300 hover:scale-[1.01]' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
  <div className={`px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white ${className}`}>
    {children}
  </div>
);

export const CardBody: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);