
import React from 'react';
import * as Icons from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
}

const IconRenderer: React.FC<IconRendererProps> = ({ name, className = "", size = 20 }) => {
  // Fallback to MapPin if the icon name is not found
  const LucideIcon = (Icons as any)[name] || Icons.MapPin;
  return <LucideIcon className={className} size={size} />;
};

export default IconRenderer;
