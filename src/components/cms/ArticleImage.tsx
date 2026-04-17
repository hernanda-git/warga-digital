import Image from 'next/image';
import type { ArticleImage } from '@/types/article-image';

interface ArticleImageProps {
  image: ArticleImage;
  articleTitle: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

export function ArticleImage({
  image,
  articleTitle,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  className = '',
}: ArticleImageProps) {
  return (
    <Image
      src={image.url}
      alt={image.alt_text || articleTitle}
      width={image.width || 1200}
      height={image.height || 800}
      priority={priority}
      sizes={sizes}
      className={`rounded-lg object-cover ${className}`}
    />
  );
}
