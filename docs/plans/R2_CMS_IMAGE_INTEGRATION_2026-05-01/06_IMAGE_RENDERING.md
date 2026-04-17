
# Sub-Plan 06: Image Rendering in Next.js

## Objective

Configure Next.js to render article images from Cloudflare R2 using `next/image` component.

## Tasks

### 6.1 Configure `next.config.ts` Remote Patterns

Update `next.config.ts` to allow images from R2 domain:

```ts
// warga-digital/next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // R2 custom domain
      {
        protocol: 'https',
        hostname: 'media.wargadigital.id',
      },
      // R2 dev URL fallback (for development/staging)
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
}

export default nextConfig
```

### 6.2 Create Image Rendering Component

Create a reusable article image component:

```tsx
// warga-digital/src/components/cms/ArticleImage.tsx
import Image from 'next/image'
import type { ArticleImage } from '@/types'

interface ArticleImageProps {
  image: ArticleImage
  articleTitle: string
  priority?: boolean
  sizes?: string
}

export function ArticleImage({
  image,
  articleTitle,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}: ArticleImageProps) {
  return (
    <Image
      src={image.url}
      alt={image.alt_text || articleTitle}
      width={image.width || 1200}
      height={image.height || 800}
      priority={priority}
      sizes={sizes}
      className="rounded-lg object-cover"
    />
  )
}
```

### 6.3 Create Article Gallery Component

For multi-image galleries:

```tsx
// warga-digital/src/components/cms/ArticleGallery.tsx
import { ArticleImage } from './ArticleImage'
import type { ArticleImage as ArticleImageType } from '@/types'

interface ArticleGalleryProps {
  images: ArticleImageType[]
  articleTitle: string
}

export function ArticleGallery({ images, articleTitle }: ArticleGalleryProps) {
  if (!images.length) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((image, index) => (
        <ArticleImage
          key={image.id}
          image={image}
          articleTitle={articleTitle}
          priority={index < 3}
        />
      ))}
    </div>
  )
}
```

### 6.4 Update Types

Add `ArticleImage` type if not exists:

```ts
// warga-digital/src/types/index.ts or new file
export interface ArticleImage {
  id: string
  article_id: string
  object_key: string
  url: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  alt_text: string | null
  sort_order: number
  created_at: string
}
```

### 6.5 Content Security Policy (Optional)

If using CSP headers, update middleware or config:

```ts
// Add to src/middleware.ts or CSP configuration
// img-src should include: 'self' data: https://media.wargadigital.id
```

## Verification Checklist

- [ ] `next.config.ts` has R2 domain in `remotePatterns`
- [ ] `ArticleImage` component renders correctly
- [ ] `ArticleGallery` displays multiple images in grid
- [ ] Images load with proper width/height
- [ ] Lazy loading works for images below fold
- [ ] Priority loading works for hero images

## Dependencies

- Sub-plan 04: API endpoint for signed URLs must be complete
- Sub-plan 05: Image metadata saved to database

## Next Steps

- Integrate `ArticleImage` component into article page templates
- Add lightbox functionality for gallery view
- Implement blur placeholder for loading states

```/dev/null/R2_CMS_IMAGE_INTEGRATION_2026-05-01/06_IMAGE_RENDERING.md#L1-97
# Sub-Plan 06: Image Rendering in Next.js

## Objective

Configure Next.js to render article images from Cloudflare R2 using `next/image` component.

## Tasks

### 6.1 Configure `next.config.ts` Remote Patterns

Update `next.config.ts` to allow images from R2 domain:

```ts
// warga-digital/next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // R2 custom domain
      {
        protocol: 'https',
        hostname: 'media.wargadigital.id',
      },
      // R2 dev URL fallback (for development/staging)
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
}

export default nextConfig
```

### 6.2 Create Image Rendering Component

Create a reusable article image component:

```tsx
// warga-digital/src/components/cms/ArticleImage.tsx
import Image from 'next/image'
import type { ArticleImage } from '@/types'

interface ArticleImageProps {
  image: ArticleImage
  articleTitle: string
  priority?: boolean
  sizes?: string
}

export function ArticleImage({
  image,
  articleTitle,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}: ArticleImageProps) {
  return (
    <Image
      src={image.url}
      alt={image.alt_text || articleTitle}
      width={image.width || 1200}
      height={image.height || 800}
      priority={priority}
      sizes={sizes}
      className="rounded-lg object-cover"
    />
  )
}
```

### 6.3 Create Article Gallery Component

For multi-image galleries:

```tsx
// warga-digital/src/components/cms/ArticleGallery.tsx
import { ArticleImage } from './ArticleImage'
import type { ArticleImage as ArticleImageType } from '@/types'

interface ArticleGalleryProps {
  images: ArticleImageType[]
  articleTitle: string
}

export function ArticleGallery({ images, articleTitle }: ArticleGalleryProps) {
  if (!images.length) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((image, index) => (
        <ArticleImage
          key={image.id}
          image={image}
          articleTitle={articleTitle}
          priority={index < 3}
        />
      ))}
    </div>
  )
}
```

### 6.4 Update Types

Add `ArticleImage` type if not exists:

```ts
// warga-digital/src/types/index.ts or new file
export interface ArticleImage {
  id: string
  article_id: string
  object_key: string
  url: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  alt_text: string | null
  sort_order: number
  created_at: string
}
```

### 6.5 Content Security Policy (Optional)

If using CSP headers, update middleware or config:

```ts
// Add to src/middleware.ts or CSP configuration
// img-src should include: 'self' data: https://media.wargadigital.id
```

## Verification Checklist

- [ ] `next.config.ts` has R2 domain in `remotePatterns`
- [ ] `ArticleImage` component renders correctly
- [ ] `ArticleGallery` displays multiple images in grid
- [ ] Images load with proper width/height
- [ ] Lazy loading works for images below fold
- [ ] Priority loading works for hero images

## Dependencies

- Sub-plan 04: API endpoint for signed URLs must be complete
- Sub-plan 05: Image metadata saved to database

## Next Steps

- Integrate `ArticleImage` component into article page templates
- Add lightbox functionality for gallery view
- Implement blur placeholder for loading states