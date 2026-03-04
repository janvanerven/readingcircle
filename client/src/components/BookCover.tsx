import { BookOpen } from 'lucide-react';
import { useState } from 'react';

interface BookCoverProps {
  coverUrl: string | null | undefined;
  title: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-10 h-14 rounded-lg',
  md: 'w-12 h-16 rounded-lg',
  lg: 'w-32 h-48 rounded-xl',
};

const iconSizes = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

export function BookCover({ coverUrl, title, size = 'md' }: BookCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!coverUrl || failed) {
    return (
      <div className={`${sizeClasses[size]} bg-burgundy/10 flex items-center justify-center flex-shrink-0`}>
        <BookOpen className={`${iconSizes[size]} text-burgundy`} />
      </div>
    );
  }

  return (
    <img
      src={coverUrl}
      alt={title}
      onError={() => setFailed(true)}
      className={`${sizeClasses[size]} object-cover shadow-sm flex-shrink-0`}
    />
  );
}
