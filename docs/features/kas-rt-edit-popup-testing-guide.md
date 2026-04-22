# Kas RT Edit Popup - Testing Guide

## Quick Start

The implementation is **complete** and ready for testing. This guide provides comprehensive testing instructions.

---

## Test Environment Setup

### Prerequisites
- ✅ Node.js installed
- ✅ Database migrations already applied
- ✅ User account with Kas RT permissions (Ketua RT, Sekretaris, or Bendahara)

### Start Development Server
```bash
cd warga-digital
npm run dev
```

Navigate to: `http://localhost:3000/kas-rt`

---

## Test Scenarios

### ✅ Test 1: Edit Transaction Title

**Steps:**
1. Go to `/kas-rt` page
2. Find any existing transaction
3. Click the **Edit** button (pencil icon)
4. Verify popup opens at **Step 1**
5. Modify the **Judul Transaksi** field
6. Click **Lanjut**
7. Click **Kembali** (to verify data persists)
8. Verify title still has your changes
9. Click **Lanjut** again
10. Click **Simpan**

**Expected Result:**
- ✅ Success toast: "Transaksi berhasil diperbarui"
- ✅ Transaction list refreshes
- ✅ New title is displayed in transaction card

---

### ✅ Test 2: Edit Transaction Description

**Steps:**
1. Go to `/kas-rt` page
2. Find any existing transaction
3. Click **Edit** button
4. Modify the **Deskripsi** field
5. Click **Lanjut** → **Simpan**

**Expected Result:**
- ✅ Success toast appears
- ✅ New description is displayed in transaction card
- ✅ Description shows as line-clamp (truncated if too long)

---

### ✅ Test 3: Edit Title with Empty Value (Validation)

**Steps:**
1. Go to `/kas-rt` page
2. Click **Edit** on any transaction
3. **Clear** the **Judul Transaksi** field (make it empty)
4. Try to click **Lanjut**

**Expected Result:**
- ✅ **Lanjut** button is **disabled**
- ✅ Cannot proceed to Step 2
- ✅ Validation prevents submission

---

### ✅ Test 4: View Existing Attachments

**Steps:**
1. Go to `/kas-rt` page
2. Find transaction with attachments
3. Click **Edit** → **Lanjut** (go to Step 2)
4. Verify **Lampiran Existing** section appears

**Expected Result:**
- ✅ Shows count: "Lampiran Existing (X)"
- ✅ Each attachment displays:
  - Image thumbnail for images
  - Document icon (📄) for non-images
  - File name (truncated if long)
  - Delete button (X icon)
- ✅ If no attachments: Shows "Belum ada lampiran"

---

### ✅ Test 5: Delete Existing Attachment

**Steps:**
1. Go to `/kas-rt` page
2. Find transaction with attachments
3. Click **Edit** → **Lanjut** (Step 2)
4. Click the **X** button on any attachment
5. Verify attachment disappears from list

**Expected Result:**
- ✅ Attachment immediately removed from UI
- ✅ Success toast: "Lampiran berhasil dihapus"
- ✅ No confirmation dialog (direct delete)
- ✅ Changes saved to backend

---

### ✅ Test 6: Add New Attachment

**Steps:**
1. Go to `/kas-rt` page
2. Click **Edit** on any transaction
3. Go to **Step 2**
4. Click **Pilih File** button
5. Select 1-2 files (images or documents)
6. Verify preview appears

**Expected Result:**
- ✅ File name(s) displayed in picker
- ✅ Preview message: "✓ [filename] akan diupload"
- ✅ Can select multiple files
- ✅ Files are NOT uploaded yet (only on submit)

---

### ✅ Test 7: Add Multiple Attachments and Submit

**Steps:**
1. Go to `/kas-rt` page
2. Click **Edit** on transaction
3. Go to **Step 2**
4. Click **Pilih File**
5. Select 2-3 files
6. Click **Simpan**

**Expected Result:**
- ✅ Success toast: "Transaksi berhasil diperbarui"
- ✅ Popup closes
- ✅ Transaction card shows updated attachment count
- ✅ Open attachment viewer to verify new files are there

---

### ✅ Test 8: Delete and Add Attachments in Same Session

**Steps:**
1. Go to `/kas-rt` page
2. Click **Edit** on transaction with attachments
3. Go to **Step 2**
4. **Delete** 1 existing attachment (click X)
5. **Add** 1-2 new attachments
6. Click **Simpan**

**Expected Result:**
- ✅ Deleted attachment is gone
- ✅ New attachments are added
- ✅ Success toast appears
- ✅ Transaction reflects both changes

---

### ✅ Test 9: Navigate Back and Forth Between Steps

**Steps:**
1. Go to `/kas-rt` page
2. Click **Edit**
3. Modify **Title** field
4. Click **Lanjut**
5. Verify Step 2 opens
6. Click **Kembali**
7. Verify Step 1 opens with title still modified
8. Click **Lanjut** again
9. Click **Simpan**

**Expected Result:**
- ✅ Navigation works smoothly
- ✅ Form data persists between steps
- ✅ No data loss when navigating
- ✅ Submit works correctly

---

### ✅ Test 10: Edit Income Transaction

**Steps:**
1. Go to `/kas-rt` page
2. Filter by **Pemasukan** (Income)
3. Click **Edit** on income transaction
4. Verify all fields are editable
5. Modify title, amount, reference
6. Submit changes

**Expected Result:**
- ✅ Reference (Blok) field is required
- ✅ All fields editable
- ✅ Submit successful

---

### ✅ Test 11: Edit Expense Transaction

**Steps:**
1. Go to `/kas-rt` page
2. Filter by **Pengeluaran** (Expense)
3. Click **Edit** on expense transaction
4. Verify all fields are editable
5. Reference field should show but NOT be required
6. Submit changes

**Expected Result:**
- ✅ Reference field is optional (can be empty)
- ✅ No attachment requirement for edit (unlike create)
- ✅ All fields editable
- ✅ Submit successful

---

### ✅ Test 12: Large File Upload (Edge Case)

**Steps:**
1. Go to `/kas-rt` page
2. Click **Edit**
3. Go to **Step 2**
4. Try to upload a file **larger than 5MB**
5. Click **Simpan**

**Expected Result:**
- ✅ Backend rejects file > 5MB
- ✅ Error toast shows: "Ukuran file [name] melebihi batas maksimal 5MB"
- ✅ Transaction not updated
- ✅ User can try again with smaller file

---

### ✅ Test 13: Edit Transaction - No Changes

**Steps:**
1. Go to `/kas-rt` page
2. Click **Edit** on any transaction
3. Don't modify anything
4. Click **Lanjut** → **Simpan**

**Expected Result:**
- ✅ Submit successful
- ✅ Transaction remains unchanged
- ✅ Success toast appears
- ✅ No errors

---

### ✅ Test 14: Progress Indicator

**Steps:**
1. Go to `/kas-rt` page
2. Click **Edit**
3. Verify progress indicator at top

**Expected Result:**
- ✅ Shows 2 dots (Step 1 and Step 2)
- ✅ Current step is highlighted
- ✅ Can click dots to navigate (if validation passes)
- ✅ Different from create mode (which shows 3 dots)

---

### ✅ Test 15: Category Field (Readonly)

**Steps:**
1. Go to `/kas-rt` page
2. Click **Edit**
3. Verify category is NOT shown/NOT editable

**Expected Result:**
- ✅ Category field is hidden in edit mode
- ✅ Cannot change category (per requirements)
- ✅ No transaction details breakdown shown (per requirements)

---

## Regression Testing

### ✅ Create Mode Still Works

**Test create mode to ensure no regression:**

1. Click **"Catat Transaksi"** button
2. Verify **3-step** form (not 2-step)
3. Complete Step 1 (Type + Category)
4. Complete Step 2 (Amount, Date, etc.)
5. Complete Step 3 (Title, Description, Attachment)
6. Submit

**Expected Result:**
- ✅ Create mode still works as before
- ✅ 3-step flow unchanged
- ✅ Template auto-fill still works
- ✅ Attachment requirement for expense still enforced

---

## Browser Compatibility

Test on multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Mobile browser (Chrome Mobile, Safari iOS)

---

## Mobile Testing

### Responsive Design
1. Open browser DevTools
2. Toggle device toolbar
3. Test on various screen sizes:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - Desktop (1920px)

**Expected Result:**
- ✅ Form fits within viewport
- ✅ All fields accessible
- ✅ Buttons clickable
- ✅ Attachments display correctly
- ✅ No horizontal scroll

---

## Performance Testing

### Load Time
1. Open Network tab in DevTools
2. Click Edit button
3. Measure popup open time

**Expected Result:**
- ✅ Popup opens instantly (< 100ms)
- ✅ No lag when switching steps
- ✅ File picker opens quickly
- ✅ Submit completes in < 2 seconds (normal network)

---

## Accessibility Testing

### Keyboard Navigation
1. Click Edit button
2. Use **Tab** to navigate fields
3. Use **Enter/Space** to activate buttons

**Expected Result:**
- ✅ Can navigate all fields with Tab
- ✅ Can activate buttons with Enter/Space
- ✅ Focus indicators visible
- ✅ No keyboard traps

### Screen Reader
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Open Edit popup
3. Navigate through fields

**Expected Result:**
- ✅ Labels read correctly
- ✅ Required fields announced
- ✅ Step indicators announced
- ✅ Attachment actions clear

---

## Known Limitations

1. **No Undo for Attachment Delete**
   - Once deleted, must re-upload
   - Consider adding undo feature in future

2. **No Attachment Reordering**
   - Attachments shown in upload order
   - Cannot change order

3. **No Image Cropping/Editing**
   - Images uploaded as-is
   - Consider adding image editor in future

---

## Bug Reporting Template

If you find any issues, report using this template:

```markdown
**Title:** [Brief description]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots:**
[If applicable]

**Environment:**
- Browser: [Chrome/Firefox/Safari]
- Device: [Desktop/Mobile]
- Screen size: [if relevant]

**Severity:**
[Critical/High/Medium/Low]
```

---

## Success Criteria

All tests must pass with:
- ✅ No critical bugs
- ✅ No data loss
- ✅ All features working as specified
- ✅ No regression in create mode
- ✅ Mobile responsive
- ✅ Accessibility acceptable

---

## Sign-off Checklist

Before deploying to production:

- [ ] All 15 test scenarios passed
- [ ] Regression testing completed
- [ ] Mobile testing completed
- [ ] Browser compatibility verified
- [ ] Performance acceptable
- [ ] No console errors
- [ ] Documentation reviewed
- [ ] Team demo completed
- [ ] Stakeholder approval obtained

---

## Rollback Plan

If issues are found in production:

1. **Immediate Action:**
   - Disable Kas RT feature flag (if available)
   - Or revert to previous deployment

2. **Fix Issues:**
   - Address reported bugs
   - Re-test thoroughly

3. **Redeploy:**
   - Follow normal deployment process
   - Monitor closely after redeployment

---

**Testing Guide Version:** 1.0  
**Last Updated:** April 22, 2026  
**Status:** ✅ Ready for QA Testing
