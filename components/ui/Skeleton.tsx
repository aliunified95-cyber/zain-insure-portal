
import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circular' | 'rectangular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'default' }) => {
  const variantClasses = {
    default: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    text: 'rounded h-4'
  };
  
  return (
    <div 
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 ${variantClasses[variant]} ${className} skeleton-shimmer`}
    ></div>
  );
};
