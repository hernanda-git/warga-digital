# Phase 3-4 Testing Guide

## Overview
This guide provides step-by-step instructions for testing the Phase 3-4 implementation of the Warga Digital CMS Article Composer, including the FeaturedImagePicker and GalleryUploader components.

## Pre-requisites
- Node.js environment running
- Next.js development server running (`npm run dev`)
- Authentication working (logged in as admin)
- R2 bucket configured and accessible
- Test images available (JPEG, PNG, WebP, GIF)

## Test Environment Setup

1. **Clear Browser Cache** (optional but recommended)
   - Clear localStorage and cookies for the site
   - This ensures clean state for draft article testing

2. **Open Browser DevTools**
   - Press F12 to open developer tools
   - Go to Network tab to monitor API calls
   - Go to Console tab for error messages

3. **Navigate to Compose Page**
   - Go to `/admin/articles/compose`
   - Should see the new FeaturedImagePicker and GalleryUploader components

## Test Cases

### Phase 3: FeaturedImagePicker Component

#### Test 3.1: Featured Image Upload (New Article)
**Objective**: Verify featured image upload works for new articles without existing ID

**Steps**:
1. Open `/admin/articles/compose` (no article ID in URL)
2. Don't enter any title yet
3. Scroll to "Gambar Sampul" section
4. Click the dashed border area
5. Select an image file (JPEG, PNG, WebP)
6. Observe the upload progress

**Expected Results**:
- ✅ File picker dialog opens
- ✅ Selected image shows in the upload area
- ✅ Network tab shows POST to `/api/cms/articles/draft` (creates article)
- ✅ Network tab shows POST to `/api/cms/articles/upload-url` (gets signed URL)
- ✅ Network tab shows PUT request to R2 domain (uploads file)
- ✅ Network tab shows PATCH to `/api/cms/articles/{id}` (updates featured_image_url)
- ✅ Image thumbnail appears after upload completes
- ✅ Replace and Remove buttons appear
- ✅ "Mengupload..." loading state appears then disappears

**Debug Notes**:
- Check browser console for errors
- Check Network tab for failed requests
- Verify R2 URL is correct in PATCH request

---

#### Test 3.2: Featured Image Drag-and-Drop
**Objective**: Verify drag-and-drop works for featured image

**Steps**:
1. Open `/admin/articles/compose`
2. Scroll to "Gambar Sampul" section
3. Drag an image file from file explorer and drop it on the dashed area
4. Wait for upload to complete

**Expected Results**:
- ✅ Dashed area highlights with blue border when dragging
- ✅ Upload begins when image is dropped
- ✅ Image appears after successful upload
- ✅ All API calls complete as in Test 3.1

**Debug Notes**:
- Drag-over state should add border-blue-400 and bg-blue-50 classes
- Drag-leave should remove highlight

---

#### Test 3.3: Featured Image Replace
**Objective**: Verify ability to replace an existing featured image

**Steps**:
1. Complete Test 3.1 (have an image uploaded)
2. Click the upload/replace button (cloud icon) on the image thumbnail
3. Select a different image
4. Wait for upload to complete

**Expected Results**:
- ✅ File picker dialog opens
- ✅ Old image is replaced with new image
- ✅ New image URL is sent in PATCH request
- ✅ Thumbnail updates to show new image
- ✅ No errors in console

**Debug Notes**:
- Should still use same article ID
- Featured_image_url in PATCH should be the new R2 URL

---

#### Test 3.4: Featured Image Remove
**Objective**: Verify featured image can be removed

**Steps**:
1. Have an image uploaded (Test 3.1 complete)
2. Click the Remove button (X icon) on the image thumbnail
3. Confirm the image is removed

**Expected Results**:
- ✅ Image thumbnail disappears
- ✅ Empty dashed border upload area appears
- ✅ Network tab shows PATCH to update with featured_image_url: ""
- ✅ Remove and Replace buttons disappear
- ✅ Upload area is ready for new image

**Debug Notes**:
- featured_image_url should be empty string or null in PATCH body

---

#### Test 3.5: Featured Image Error Handling
**Objective**: Verify error messages are shown for invalid uploads

**Steps**:
1. Open `/admin/articles/compose`
2. Try to upload a non-image file (e.g., text file, PDF)
3. Try to upload a very large image (>10MB) - optional if test image available

**Expected Results**:
- ✅ Non-image files are rejected at file picker level
- ✅ Error message appears: "Tidak ada file gambar valid yang dipilih" or similar
- ✅ Upload does not proceed
- ✅ Component remains in ready state

**Debug Notes**:
- Check ALLOWED_TYPES in component
- File accept attribute should filter file types

---

#### Test 3.6: Featured Image URL Display
**Objective**: Verify the featured image URL is correctly displayed and persisted

**Steps**:
1. Upload an image and complete upload (Test 3.1)
2. Enter a title for the article
3. Click "Simpan Draf" to save the article
4. Navigate away and back to edit the same article
5. Scroll to "Gambar Sampul" section

**Expected Results**:
- ✅ Image thumbnail appears when article loads
- ✅ No broken image errors
- ✅ URL is correct R2 URL
- ✅ Replace and Remove buttons are available

**Debug Notes**:
- Check that loadArticle() sets featured_image_url correctly
- Verify R2 URL is accessible

---

### Phase 4: GalleryUploader Component

#### Test 4.1: Gallery Image Upload (Single File)
**Objective**: Verify single gallery image upload works

**Steps**:
1. Open `/admin/articles/compose` with an existing article or new article
2. Scroll to "Galeri Gambar" section
3. Click the dashed border area
4. Select a single image file
5. Wait for upload to progress to 100%
6. Click "Simpan 1 Gambar" button
7. Wait for database save to complete

**Expected Results**:
- ✅ File picker opens
- ✅ File appears in the upload list with status
- ✅ Progress percentage appears during upload
- ✅ File shows "done" status (thumbnail) after upload
- ✅ "Simpan 1 Gambar" button appears
- ✅ Button shows loading spinner during save
- ✅ Image appears in the list with ID after database save
- ✅ Network shows POST to `/api/cms/articles/{id}/images/batch`

**Debug Notes**:
- Progress should show 0-100%
- Status transitions: pending → uploading → done
- Thumbnail should show preview of uploaded image

---

#### Test 4.2: Gallery Multiple File Upload
**Objective**: Verify multiple files can be selected and uploaded

**Steps**:
1. Open `/admin/articles/compose`
2. Scroll to "Galeri Gambar" section
3. Click upload area
4. Select 5 different image files
5. Wait for all to upload (observe concurrent uploads)
6. Click "Simpan 5 Gambar" button

**Expected Results**:
- ✅ All 5 files appear in the upload list
- ✅ Status shows "pending" for new files
- ✅ Files upload concurrently (max 3 at a time)
- ✅ Progress bars show independently for uploading files
- ✅ Once all reach 100%, "Simpan 5 Gambar" button appears
- ✅ Button save completes and shows all 5 images with IDs

**Debug Notes**:
- Check MAX_CONCURRENT = 3 in code
- Multiple PUT requests to R2 should be in flight simultaneously
- Progress calculation should average concurrent file progress

---

#### Test 4.3: Gallery Drag-and-Drop
**Objective**: Verify drag-and-drop works for gallery

**Steps**:
1. Open `/admin/articles/compose`
2. Scroll to "Galeri Gambar" section
3. Drag 3 image files from file explorer and drop on dashed area
4. Wait for uploads to complete
5. Save images

**Expected Results**:
- ✅ Dashed area highlights when dragging
- ✅ All dropped files are added to upload list
- ✅ Uploads proceed as in Test 4.1
- ✅ Images are saved successfully

**Debug Notes**:
- Drag-over should show blue highlight
- Multiple files in one drop should be handled

---

#### Test 4.4: Gallery File Validation
**Objective**: Verify invalid files are rejected

**Steps**:
1. Open `/admin/articles/compose`
2. Try to upload non-image files mixed with valid images
3. Try to upload very large files (if available)
4. Try to upload unsupported image formats

**Expected Results**:
- ✅ Invalid files are filtered out
- ✅ Only valid files are added to upload list
- ✅ Error message shows if no valid files: "Tidak ada file gambar valid yang dipilih"
- ✅ Valid image formats (JPEG, PNG, WebP, GIF) are accepted
- ✅ Invalid formats are rejected

**Debug Notes**:
- Check ALLOWED_TYPES array
- Check MAX_SIZE limit (10MB)
- Multiple invalid files should show single error message

---

#### Test 4.5: Gallery Upload Progress
**Objective**: Verify progress tracking works for large files

**Steps**:
1. Open `/admin/articles/compose`
2. Scroll to "Galeri Gambar" section
3. Upload a larger image file (2-5MB)
4. Observe progress percentage updates
5. Wait for upload to complete

**Expected Results**:
- ✅ Progress percentage updates continuously (0 → 100)
- ✅ Progress bar fills as upload progresses
- ✅ Average progress shown for multiple concurrent uploads
- ✅ Upload completes at 100%
- ✅ Status changes to "done"

**Debug Notes**:
- Progress updates should be smooth
- xhr.upload.onprogress should fire multiple times
- Average calculation: sum of all progress / number of uploading files

---

#### Test 4.6: Gallery Remove Before Save
**Objective**: Verify files can be removed before batch save

**Steps**:
1. Open `/admin/articles/compose`
2. Select 3 images and upload
3. While uploading or after upload completes (before clicking save)
4. Click X button on one of the files
5. File should be removed from list
6. Click "Simpan 2 Gambar" for remaining files

**Expected Results**:
- ✅ Clicking X removes file from list
- ✅ File counter updates (e.g., "Simpan 2 Gambar")
- ✅ Only remaining files are saved to database
- ✅ Removed file is not in final gallery

**Debug Notes**:
- Removal should work in any state (pending, uploading, done, error)
- AbortController should cancel uploads if file is removed while uploading

---

#### Test 4.7: Gallery Retry Failed Upload
**Objective**: Verify failed uploads can be retried

**Steps**:
1. Open browser DevTools Network tab
2. Throttle network to simulate slow connection
3. Start uploading a file
4. Before it completes, set network to "Offline"
5. Upload should fail
6. Click the retry button (arrow icon) on the failed file
7. Set network back to online
8. Retry should complete successfully

**Expected Results**:
- ✅ Failed file shows "error" status with X icon
- ✅ Error message appears below filename
- ✅ Retry button (arrow icon) is visible
- ✅ Clicking retry restarts upload
- ✅ File uploads and completes successfully
- ✅ Status changes to "done"
- ✅ Now "Simpan N Gambar" button appears

**Debug Notes**:
- Failed files should not be included in batch save
- Retry button should reset progress to 0
- Error state should clear on retry

---

#### Test 4.8: Gallery Batch Save
**Objective**: Verify batch save works correctly

**Steps**:
1. Upload 3 images successfully
2. All show "done" status and thumbnails
3. Click "Simpan 3 Gambar" button
4. Observe the database insert

**Expected Results**:
- ✅ Button shows loading spinner
- ✅ Network tab shows POST to `/api/cms/articles/{id}/images/batch`
- ✅ Request body contains all 3 images with object_key, url, mime_type, sort_order
- ✅ Response includes images with real IDs
- ✅ Upload list clears
- ✅ All images now show in the composed article's gallery
- ✅ Images are no longer in upload state

**Debug Notes**:
- Check sort_order starts at 0 and increments
- Verify object_key matches R2 upload
- URL should be public R2 URL
- mime_type should match file type

---

#### Test 4.9: Gallery with New Article
**Objective**: Verify gallery upload works for new articles

**Steps**:
1. Open `/admin/articles/compose` (no ID in URL)
2. Scroll to "Galeri Gambar" section
3. Upload 2 images
4. Observe draft creation
5. Click "Simpan 2 Gambar"

**Expected Results**:
- ✅ Network shows POST to `/api/cms/articles/draft` before first upload
- ✅ Returned article_id is used for all subsequent operations
- ✅ Images are successfully uploaded and saved
- ✅ articleId is propagated to both components

**Debug Notes**:
- Draft should be created only once
- All subsequent uploads should use same article_id

---

#### Test 4.10: Gallery with Existing Article
**Objective**: Verify gallery works for existing articles

**Steps**:
1. Open `/admin/articles/compose?id={existing_article_id}`
2. Scroll to "Galeri Gambar" section
3. Existing images should be visible (if any)
4. Upload 2 new images
5. Click save

**Expected Results**:
- ✅ Existing images load and display
- ✅ No draft is created (article already exists)
- ✅ New images are uploaded to existing article
- ✅ New images are added to the existing gallery
- ✅ All images appear in final list

**Debug Notes**:
- loadArticle() should populate images state
- existingImages prop should display initial gallery
- New uploads should have different sort_order than existing

---

### Integration Tests

#### Test 5.1: Complete Workflow - New Article
**Objective**: Verify complete workflow for new article with featured image and gallery

**Steps**:
1. Open `/admin/articles/compose`
2. Enter title "Test Article"
3. Slug should auto-generate
4. Upload featured image
5. Add excerpt and content
6. Upload 3 gallery images
7. Click "Simpan Draf"
8. Verify article is created with all data

**Expected Results**:
- ✅ Article ID is created (from draft)
- ✅ Featured image is saved
- ✅ Gallery images are saved
- ✅ Article metadata is saved
- ✅ Redirects to article list or stays on compose
- ✅ Toast shows "Draf disimpan" success message

**Debug Notes**:
- Check database for complete article record
- Verify all images are in R2 bucket
- Verify all image records in article_images table

---

#### Test 5.2: Complete Workflow - Edit Existing Article
**Objective**: Verify editing existing article works correctly

**Steps**:
1. Create or find an existing article
2. Open `/admin/articles/compose?id={id}`
3. Article loads with existing data
4. Replace featured image
5. Add new gallery images
6. Modify content
7. Click "Publikasi"
8. Verify article is updated

**Expected Results**:
- ✅ All existing data loads correctly
- ✅ Featured image can be changed
- ✅ Gallery can be extended with new images
- ✅ Content changes are saved
- ✅ Article status changes to published
- ✅ All images are accessible

---

#### Test 5.3: Autosave Functionality
**Objective**: Verify autosave works with image uploads

**Steps**:
1. Open `/admin/articles/compose`
2. Enter title
3. Upload featured image
4. Wait 30+ seconds without manual save
5. Check console/network for autosave request

**Expected Results**:
- ✅ Autosave triggers after 30 seconds of inactivity
- ✅ Article is saved automatically
- ✅ "Tersimpan" status appears
- ✅ Featured image URL is included in autosave

**Debug Notes**:
- Check AUTOSAVE_INTERVAL constant
- Verify PATCH request includes featured_image_url

---

### Error Handling Tests

#### Test 6.1: Network Error During Featured Image Upload
**Objective**: Verify graceful error handling for network failures

**Steps**:
1. Open developer tools Network tab
2. Set network throttle to offline
3. Try to upload featured image
4. Error should appear

**Expected Results**:
- ✅ Clear error message appears: "Upload gagal" or specific error
- ✅ User can retry upload
- ✅ Component remains functional
- ✅ No console errors

**Debug Notes**:
- Error should be caught and displayed
- Allow retry without page reload

---

#### Test 6.2: Network Error During Gallery Upload
**Objective**: Verify gallery upload error recovery

**Steps**:
1. Start uploading multiple files
2. While uploading, go offline
3. Some files may fail, observe behavior

**Expected Results**:
- ✅ Failed files show error status
- ✅ Successful files continue showing done status
- ✅ Error message appears for failed file
- ✅ Retry button available for failed files
- ✅ Save button works for completed uploads

**Debug Notes**:
- Individual file failures should not affect others
- Batch save should only include done files

---

#### Test 6.3: Invalid Response Handling
**Objective**: Verify handling of unexpected API responses

**Steps**:
1. Use network tools to mock error response
2. Try to upload featured image
3. Observe error handling

**Expected Results**:
- ✅ Error message is displayed
- ✅ No unhandled promise rejections in console
- ✅ Component is usable after error

---

### Performance Tests

#### Test 7.1: Large File Upload Performance
**Objective**: Verify performance with larger files

**Steps**:
1. Create or find a 5-8MB image file
2. Upload via FeaturedImagePicker
3. Monitor progress and network usage
4. Time the upload

**Expected Results**:
- ✅ Progress updates smoothly
- ✅ No UI freezing during upload
- ✅ Upload completes successfully
- ✅ Network bandwidth is reasonable

---

#### Test 7.2: Multiple Concurrent Uploads
**Objective**: Verify concurrent upload handling

**Steps**:
1. Upload 10 images to gallery
2. Observe that only 3 are uploading concurrently
3. Others wait in queue
4. As uploads complete, new ones start
5. All eventually complete

**Expected Results**:
- ✅ Never more than 3 uploads in progress simultaneously
- ✅ Queue is respected
- ✅ All files eventually upload
- ✅ No browser crashes or hangs

**Debug Notes**:
- Monitor Network tab to count active XHR requests
- Check MAX_CONCURRENT constant = 3

---

## Quick Smoke Test (5 minutes)

For quick verification that everything is working:

1. ✅ Open `/admin/articles/compose`
2. ✅ Upload featured image (drag or click)
3. ✅ Upload 2 gallery images
4. ✅ Click "Simpan 2 Gambar"
5. ✅ Click "Simpan Draf"
6. ✅ Reload page
7. ✅ Verify images are still there

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Images not uploading to R2 | Check R2 credentials in .env |
| "Draft" not creating | Check `/api/cms/articles/draft` is working |
| No signed URL | Check `/api/cms/articles/upload-url` is working |
| Images don't persist | Check database connection and migrations |
| Progress not showing | Check xhr.upload.onprogress is being called |
| Files won't select | Check accept attributes match test files |
| Thumbnail not showing | Check R2 URL is publicly accessible |

## Browser DevTools Tips

### Network Tab
- Filter by XHR to see API calls only
- Check upload sizes and timings
- Verify PUT requests to R2 domain
- Check response bodies for errors

### Console Tab
- Watch for error logs
- Check for unhandled promise rejections
- Verify no TypeScript/eslint warnings

### Application Tab
- Check localStorage for draft_cleanup_id
- Verify session is valid
- Check cookies for authentication

## Sign-Off Checklist

- [ ] All 7 Phase 3 tests passing
- [ ] All 10 Phase 4 tests passing
- [ ] All 3 integration tests passing
- [ ] All 3 error handling tests passing
- [ ] All 2 performance tests passing
- [ ] Quick smoke test passes
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] No broken images
- [ ] Images accessible in R2
- [ ] Database records created correctly
- [ ] Ready for production
