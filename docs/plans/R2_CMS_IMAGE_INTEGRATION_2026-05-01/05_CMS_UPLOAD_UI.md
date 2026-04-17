# Sub-Plan 05: CMS Multi-Image Upload UI Flow

## Overview

Implement the client-side multi-image upload UI for the CMS editor, including progress tracking, retry logic, and integration with the signed URL endpoint.

## Tasks

### 5.1 UI Components

- [ ] Create `CMSImageUploader` component
  - [ ] Multi-file selection input
  - [ ] Per-file progress bar
  - [ ] Cancel button for in-flight uploads
  - [ ] Retry button for failed uploads
  - [ ] Preview thumbnails after upload

- [ ] Create `CMSImageGallery` component
  - [ ] Drag-and-drop reordering
  - [ ] Sort order persistence
  - [ ] Delete/replace individual images
  - [ ] Alt text input per image

### 5.2 Client-Side Validation

- [ ] File type allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- [ ] Max file size: 5MB per image (configurable)
- [ ] Image dimension validation (optional)
- [ ] Show validation errors before upload starts

### 5.3 Upload Orchestration

- [ ] Implement parallel upload with concurrency limit (3-5 simultaneous)
- [ ] Request signed URL for each file via `POST /api/cms/articles/upload-url`
- [ ] Execute browser PUT to R2 signed URL
- [ ] Collect response: `publicUrl`, width, height, objectKey
- [ ] Handle partial failures gracefully

### 5.4 State Management

- [ ] Track upload states: pending, uploading, success, failed
- [ ] Store uploaded image metadata for submission
- [ ] Integrate with article draft auto-save

### 5.5 Integration with CMS Editor

- [ ] Insert image blocks into editor content
- [ ] Link image metadata to article save flow
- [ ] Handle image replacement workflow

## Dependencies

- Sub-Plan 03: Signed Upload URL Endpoint (API must be ready)
- Sub-Plan 04: Database Schema (article_images table)

## Verification

- [ ] Upload 5+ images simultaneously
- [ ] Verify progress bars update correctly
- [ ] Verify retry works for failed uploads
- [ ] Verify cancel stops in-flight uploads
- [ ] Verify images persist after page refresh (draft)