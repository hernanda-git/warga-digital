'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  PhotoIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import type { ArticleImage } from '@/types/article-image';

interface CMSImageGalleryProps {
  articleId: string;
  images: ArticleImage[];
  onImagesChange?: (images: ArticleImage[]) => void;
  onImageDelete?: (imageId: string) => Promise<void>;
  onImageUpdate?: (imageId: string, updates: Partial<ArticleImage>) => Promise<void>;
  editable?: boolean;
}

export function CMSImageGallery({
  articleId,
  images,
  onImagesChange,
  onImageDelete,
  onImageUpdate,
  editable = true,
}: CMSImageGalleryProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingAltText, setEditingAltText] = useState<string | null>(null);
  const [altTextValue, setAltTextValue] = useState('');

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (!editable) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  }, [editable]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (!editable || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, [editable, draggedIndex]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    if (!editable || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    e.preventDefault();

    // Reorder images
    const newImages = [...images];
    const [removed] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, removed);

    // Update sort_order values
    const updatedImages = newImages.map((img, index) => ({
      ...img,
      sort_order: index,
    }));

    setDraggedIndex(null);
    setDragOverIndex(null);

    // Notify parent of changes
    onImagesChange?.(updatedImages);

    // Persist sort order to database
    if (onImageUpdate) {
      try {
        await Promise.all(
          updatedImages.map((img) =>
            onImageUpdate(img.id, { sort_order: img.sort_order })
          )
        );
        toast.success('Image order updated');
      } catch (error) {
        toast.error('Failed to save image order');
      }
    }
  }, [editable, draggedIndex, images, onImagesChange, onImageUpdate]);

  const handleDelete = useCallback(async (imageId: string) => {
    if (!editable) return;

    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    if (onImageDelete) {
      try {
        await onImageDelete(imageId);
        toast.success('Image deleted successfully');
      } catch (error) {
        toast.error('Failed to delete image');
      }
    } else {
      // Local delete only
      const newImages = images.filter((img) => img.id !== imageId);
      onImagesChange?.(newImages);
      toast.success('Image removed');
    }
  }, [editable, images, onImageDelete, onImagesChange]);

  const handleEditAltText = useCallback((image: ArticleImage) => {
    if (!editable) return;
    setEditingAltText(image.id);
    setAltTextValue(image.alt_text || '');
  }, [editable]);

  const handleSaveAltText = useCallback(async (imageId: string) => {
    if (onImageUpdate) {
      try {
        await onImageUpdate(imageId, { alt_text: altTextValue });
        toast.success('Alt text updated');
      } catch (error) {
        toast.error('Failed to save alt text');
        return;
      }
    } else {
      // Local update only
      const newImages = images.map((img) =>
        img.id === imageId ? { ...img, alt_text: altTextValue } : img
      );
      onImagesChange?.(newImages);
    }

    setEditingAltText(null);
    setAltTextValue('');
  }, [altTextValue, images, onImageUpdate, onImagesChange]);

  const handleCancelAltText = useCallback(() => {
    setEditingAltText(null);
    setAltTextValue('');
  }, []);

  const handleAltTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAltTextValue(e.target.value);
  }, []);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <PhotoIcon className="h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">No images uploaded yet</p>
        <p className="mt-1 text-xs text-gray-500">Upload images to see them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          Image Gallery ({images.length})
        </h3>
        {editable && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <ArrowsUpDownIcon className="h-4 w-4" />
            <span>Drag to reorder</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div
            key={image.id}
            draggable={editable}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`
              relative group rounded-lg overflow-hidden border-2 transition-all
              ${editable ? 'cursor-move' : 'cursor-default'}
              ${draggedIndex === index ? 'opacity-50 border-blue-500' : 'border-gray-200'}
              ${dragOverIndex === index && draggedIndex !== index ? 'border-blue-400 border-dashed' : ''}
              ${!editable ? 'cursor-default' : 'hover:border-blue-300'}
            `}
          >
            {/* Image */}
            <div className="aspect-square bg-gray-100">
              <Image
                src={image.url}
                alt={image.alt_text || `Image ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>

            {/* Overlay */}
            {editable && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => handleEditAltText(image)}
                    className="p-1.5 bg-white/90 rounded-md hover:bg-white text-gray-700 hover:text-blue-600 transition-colors"
                    title="Edit alt text"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="p-1.5 bg-white/90 rounded-md hover:bg-white text-gray-700 hover:text-red-600 transition-colors"
                    title="Delete image"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Drag handle indicator */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                  <div className="px-2 py-1 bg-white/90 rounded text-xs text-gray-700">
                    Drag to reorder
                  </div>
                </div>
              </div>
            )}

            {/* Alt Text Editor */}
            {editingAltText === image.id && (
              <div className="absolute inset-0 bg-white p-3 flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">
                  Alt Text
                </label>
                <input
                  type="text"
                  value={altTextValue}
                  onChange={handleAltTextChange}
                  placeholder="Describe the image..."
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => handleSaveAltText(image.id)}
                    className="flex-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <CheckIcon className="h-4 w-4 inline mr-1" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelAltText}
                    className="flex-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4 inline mr-1" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Image Info Badge */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-xs text-white truncate">
                {image.alt_text || `Image ${index + 1}`}
              </p>
              {image.width && image.height && (
                <p className="text-xs text-white/70">
                  {image.width} × {image.height}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Image Count and Size Info */}
      <div className="text-xs text-gray-500">
        <p>
          Total images: {images.length} |
          Total size: {(images.reduce((acc, img) => acc + img.size_bytes, 0) / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
    </div>
  );
}
