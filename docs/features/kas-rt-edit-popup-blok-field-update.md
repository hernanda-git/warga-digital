# Kas RT Edit Popup - Blok Field Visibility Update

## Change Summary

**Date:** April 22, 2026  
**File Modified:** `src/components/kas-rt/KasRtTransactionForm.tsx`  
**Lines Changed:** ~25 lines (conditional wrapper added)

---

## What Changed

### Before
The **Blok (Reference)** field was displayed for **both income and expense** transactions in edit mode:

```tsx
<div>
  <label>Blok *</label>
  <input value={form.reference} ... />
</div>
```

### After
The **Blok** field is now **only shown for income** transactions:

```tsx
{form.type === "income" && (
  <div>
    <label>Blok *</label>
    <input value={form.reference} ... />
  </div>
)}
```

---

## Why This Change

### Problem
- Expense transactions don't use the Blok field
- Showing it for expenses was confusing and unnecessary
- Inconsistent with create mode behavior (where Blok is hidden for expenses)

### Solution
- Conditionally render Blok field based on `form.type === "income"`
- Matches the existing validation logic (Blok only required for income)
- Cleaner UX for expense transactions

---

## Impact

### Income Transactions (Pemasukan)
✅ **No change** - Blok field still shown and required

### Expense Transactions (Pengeluaran)
✅ **Blok field hidden** - Cleaner form, less confusion

### Validation
✅ **No changes needed** - Validation already correct:
```typescript
const referenceValid = isIncomeForm
  ? form.reference.trim().length > 0
  : true;
```

### Backend
✅ **No changes needed** - Already handles null reference for expenses

---

## Edit Mode Form Fields (After Change)

### Income Transactions
1. Judul Transaksi * (required)
2. Deskripsi (optional)
3. Jumlah (Rp) * (required)
4. **Blok * (required)** ← Shown
5. Tanggal * (required)

### Expense Transactions
1. Judul Transaksi * (required)
2. Deskripsi (optional)
3. Jumlah (Rp) * (required)
4. **~~Blok~~** ← **Hidden**
5. Tanggal * (required)

---

## Testing Checklist

### ✅ Test: Edit Income Transaction
1. Edit an income transaction
2. Verify Blok field is **visible**
3. Verify Blok field is **required**
4. Submit with empty Blok → Should fail validation
5. Submit with valid Blok → Should succeed

### ✅ Test: Edit Expense Transaction
1. Edit an expense transaction
2. Verify Blok field is **NOT visible**
3. Verify form is cleaner (one less field)
4. Submit should work without Blok field

### ✅ Test: Validation Still Works
1. Edit income → Clear Blok → Try to submit
2. Should not be able to proceed (validation prevents)
3. Edit expense → Should submit without Blok

### ✅ Test: Create Mode Unchanged
1. Create new income → Blok field shown
2. Create new expense → Blok field hidden
3. No regression in create mode

---

## Code Location

**File:** `src/components/kas-rt/KasRtTransactionForm.tsx`  
**Lines:** 298-324 (in edit mode Step 1 section)

```tsx
{form.type === "income" && (
  <div>
    <label
      htmlFor="edit-reference"
      className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
    >
      Blok{" "}
      <span className="font-normal normal-case text-red-500">
        *
      </span>
    </label>
    <input
      id="edit-reference"
      type="text"
      value={form.reference}
      onChange={(e) =>
        updateFormField("reference", e.target.value)
      }
      placeholder="Contoh: N2"
      maxLength={20}
      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
      style={{ borderColor: "var(--color-input-border)" }}
      onFocus={(e) => applyFocusRing(e.currentTarget)}
      onBlur={(e) => clearFocusRing(e.currentTarget)}
    />
  </div>
)}
```

---

## Build Status

✅ **Build successful** - No errors  
✅ **TypeScript** - No type errors  
✅ **ESLint** - No new warnings  
✅ **Backward compatible** - No breaking changes

---

## Related Changes

This update complements the previous Kas RT edit popup improvements:
- ✅ Editable Title & Description
- ✅ Attachment management (add/delete)
- ✅ 2-step form flow
- ✅ **Blok field visibility (this change)**

---

## User Benefits

1. **Cleaner UI** - One less field for expense transactions
2. **Less confusion** - Users won't wonder why they need Blok for expenses
3. **Consistency** - Matches create mode behavior
4. **Better UX** - Form shows only relevant fields

---

**Status:** ✅ Complete and Deployed
