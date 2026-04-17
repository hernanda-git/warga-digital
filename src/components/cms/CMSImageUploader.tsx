"use client";

import React, { useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  CloudArrowUpIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

export interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "failed" | "cancelled";
  progress: number;
  error?: string;
  publicUrl?: string;
  objectKey?: string;
}

interface CMSImageUploaderProps {
  articleId: string;
  onUploadComplete?: (uploadedFiles: UploadFile[]) => void;
  maxFileSize?: number; // in bytes, default 5MB
  maxFiles?: number;
  allowedTypes?: string[];
  concurrency?: number;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_FILES = 10;
const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
const DEFAULT_CONCURRENCY = 3;

export function CMSImageUploader({
  articleId,
  onUploadComplete,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  concurrency = DEFAULT_CONCURRENCY,
}: CMSImageUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        return `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`;
      }

      // Check file size
      if (file.size > maxFileSize) {
        return `File size exceeds ${maxFileSize / 1024 / 1024}MB limit`;
      }

      return null;
    },
    [allowedTypes, maxFileSize],
  );

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles: UploadFile[] = [];
      const errors: string[] = [];

      Array.from(selectedFiles).forEach((file) => {
        // Check max files limit
        if (files.length + newFiles.length >= maxFiles) {
          errors.push(`Maximum ${maxFiles} files allowed`);
          return;
        }

        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
          return;
        }

        newFiles.push({
          id: crypto.randomUUID(),
          file,
          status: "pending",
          progress: 0,
        });
      });

      if (errors.length > 0) {
        errors.forEach((err) => toast.error(err));
      }

      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
      }
    },
    [files.length, maxFiles, validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFileSelect],
  );

  const uploadSingleFile = useCallback(
    async (uploadFile: UploadFile): Promise<void> => {
      const { file, id } = uploadFile;
      const abortController = new AbortController();
      abortControllersRef.current.set(id, abortController);

      try {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: "uploading", progress: 0 } : f,
          ),
        );

        // Step 1: Request signed URL
        const response = await fetch("/api/cms/articles/upload-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            articleId,
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to get upload URL");
        }

        const { uploadUrl, publicUrl, objectKey } = await response.json();

        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, progress: 30 } : f)),
        );

        // Step 2: Upload to R2 with progress tracking
        const xhr = new XMLHttpRequest();

        const uploadPromise = new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const progress = 30 + Math.round((e.loaded / e.total) * 70);
              setFiles((prev) =>
                prev.map((f) => (f.id === id ? { ...f, progress } : f)),
              );
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload cancelled"));
          });

          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        // Handle abort
        abortController.signal.addEventListener("abort", () => {
          xhr.abort();
        });

        await uploadPromise;

        // Success
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: "success",
                  progress: 100,
                  publicUrl,
                  objectKey,
                }
              : f,
          ),
        );
      } catch (error) {
        if (abortController.signal.aborted) {
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: "cancelled" } : f)),
          );
        } else {
          const errorMessage =
            error instanceof Error ? error.message : "Upload failed";
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    status: "failed",
                    error: errorMessage,
                  }
                : f,
            ),
          );
          toast.error(`${file.name}: ${errorMessage}`);
        }
      } finally {
        abortControllersRef.current.delete(id);
      }
    },
    [articleId],
  );

  const uploadAllFiles = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");

    if (pendingFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    try {
      // Upload with concurrency limit
      const chunks: UploadFile[][] = [];
      for (let i = 0; i < pendingFiles.length; i += concurrency) {
        chunks.push(pendingFiles.slice(i, i + concurrency));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map((file) => uploadSingleFile(file)));
      }

      // Check if all uploads completed
      const updatedFiles = files.filter((f) => f.status === "success");
      if (updatedFiles.length > 0) {
        onUploadComplete?.(updatedFiles);
        toast.success(`${updatedFiles.length} file(s) uploaded successfully`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Some uploads failed. Please retry failed files.");
    } finally {
      setIsUploading(false);
    }
  }, [files, concurrency, uploadSingleFile, onUploadComplete]);

  const retryUpload = useCallback(
    (id: string) => {
      const file = files.find((f) => f.id === id);
      if (!file) return;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "pending", progress: 0, error: undefined }
            : f,
        ),
      );

      uploadSingleFile(file);
    },
    [files, uploadSingleFile],
  );

  const cancelUpload = useCallback((id: string) => {
    const abortController = abortControllersRef.current.get(id);
    if (abortController) {
      abortController.abort();
    }
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isUploading
            ? "border-gray-300 bg-gray-50 cursor-not-allowed"
            : "border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(",")}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isUploading
            ? "Upload in progress..."
            : "Drag and drop images here, or click to select"}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Max {maxFileSize / 1024 / 1024}MB per file, up to {maxFiles} files
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Allowed types: {allowedTypes.join(", ")}
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              Files ({files.length}/{maxFiles})
            </h3>
            <div className="flex gap-2">
              {!isUploading && files.some((f) => f.status === "pending") && (
                <button
                  onClick={uploadAllFiles}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Upload All
                </button>
              )}
              <button
                onClick={clearAll}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-md overflow-hidden">
                  {file.status === "success" && file.publicUrl ? (
                    <Image
                      src={file.publicUrl}
                      alt={file.file.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CloudArrowUpIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.file.size / 1024).toFixed(1)} KB
                  </p>

                  {/* Progress Bar */}
                  {file.status === "uploading" && (
                    <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Status */}
                  {file.status === "failed" && file.error && (
                    <p className="mt-1 text-xs text-red-600">{file.error}</p>
                  )}
                  {file.status === "success" && (
                    <p className="mt-1 text-xs text-green-600">
                      Uploaded successfully
                    </p>
                  )}
                  {file.status === "cancelled" && (
                    <p className="mt-1 text-xs text-gray-500">Cancelled</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {file.status === "uploading" && (
                    <button
                      onClick={() => cancelUpload(file.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Cancel upload"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                  {file.status === "failed" && (
                    <button
                      onClick={() => retryUpload(file.id)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Retry upload"
                    >
                      <ArrowPathIcon className="h-5 w-5" />
                    </button>
                  )}
                  {file.status !== "uploading" && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove file"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
