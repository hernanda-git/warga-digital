import { ArticleImage } from './ArticleImage';
import type { ArticleImage as ArticleImageType } from '@/types/article-image';

interface ArticleGalleryProps {
  images: ArticleImageType[];
  articleTitle: string;
  className?: string;
}

export function ArticleGallery({ images, articleTitle, className = '' }: ArticleGalleryProps) {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {images.map((image, index) => (
        <ArticleImage
          key={image.id}
          image={image}
          articleTitle={articleTitle}
          priority={index < 3}
        />
      ))}
    </div>
  );
}
