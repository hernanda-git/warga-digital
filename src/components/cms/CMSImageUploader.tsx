"use client";

import React, { useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  CloudArrowUpIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "failed";
  error?: string;
  publicUrl?: string;
}

interface CMSImageUploaderProps {
  articleId: string;
  onUploadComplete?: (uploadedFiles: UploadFile[]) => void;
  maxFileSize?: number;
  maxFiles?: number;
  allowedTypes?: string[];
}

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_MAX_FILES = 10;
const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function CMSImageUploader({
  articleId,
  onUploadComplete,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
}: CMSImageUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!allowedTypes.includes(file.type)) {
        return `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`;
      }
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

  const uploadAllFiles = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      pendingFiles.forEach((pf) => formData.append("files", pf.file));

      const res = await apiFetch(
        `/api/cms/articles/${articleId}/images/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const { images } = await res.json();

      // Mark uploaded files as success
      setFiles((prev) =>
        prev.map((f) => {
          if (f.status === "pending" || f.status === "uploading") {
            const uploaded = images?.find(() => true);
            return {
              ...f,
              status: "success" as const,
              publicUrl: uploaded?.url || undefined,
            };
          }
          return f;
        }),
      );

      const succeeded = files.filter((f) => f.status === "success");
      if (succeeded.length > 0 || images?.length > 0) {
        onUploadComplete?.(files.map((f) => ({ ...f, status: "success" as const })));
        toast.success(`${images?.length || 0} file(s) uploaded successfully`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "pending" || f.status === "uploading"
            ? { ...f, status: "failed" as const, error: message }
            : f,
        ),
      );
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }, [files, articleId, onUploadComplete]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  return (
    <div className="space-y-4">
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
                      {file.status === "uploading" ? (
                        <ArrowPathIcon className="h-6 w-6 text-blue-400 animate-spin" />
                      ) : (
                        <CloudArrowUpIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.file.size / 1024).toFixed(1)} KB
                  </p>
                  {file.status === "failed" && file.error && (
                    <p className="mt-1 text-xs text-red-600">{file.error}</p>
                  )}
                  {file.status === "success" && (
                    <p className="mt-1 text-xs text-green-600">Uploaded</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {(file.status === "pending" || file.status === "failed") && (
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
