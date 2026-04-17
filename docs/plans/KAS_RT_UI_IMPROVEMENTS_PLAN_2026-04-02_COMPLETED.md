# KAS-RT UI Improvements Plan — Warga Digital

> **Created**: 2026-04-02  
> **Author**: Development Team  
> **Status**: ✅ Complete  
> **Target Version**: v0.2.2  
> **Related Issues/PRs**: #N/A

---

## 📋 Overview

This plan addresses three UI/UX improvements for the Kas-RT (RT Cash Flow) page:
1. Add month/year grouping separators between transaction lists (similar to chat room date separators)
2. Remove the "Blok " prefix from reference display, showing only the raw reference value
3. Ensure data integrity with accurate, periodic display ordered from newest to oldest by date

### Scope
- **In Scope**: 
  - Month/year separator rendering in transaction list
  - Reference display formatting (remove "Blok " prefix)
  - Transaction sorting and data ordering validation
- **Out of Scope**: 
  - Backend API changes
  - Database schema modifications
  - Filter functionality changes

---

## 🗂️ Master Checklist

### Phase 1: Month/Year Grouping Separators (Priority: High)
- [x] **#1** Implement month/year separator logic
  - [x] Create helper function to extract month/year from transaction date
  - [x] Group transactions by month/year while maintaining date order
  - [x] Render separator component between groups (e.g., "--- Maret 2026 ---")
  - [x] Files affected: `src/app/kas-rt/page.tsx`
- [x] **#2** Style separator component
  - [x] Add consistent styling matching chat room separators
  - [x] Ensure separators are visually distinct but not intrusive
  - [x] Test with various month/year combinations

### Phase 2: Reference Prefix Removal (Priority: Medium)
- [x] **#3** Remove "Blok " prefix from reference display
  - [x] Update transaction item rendering to show raw `tx.reference` value
  - [x] Remove hardcoded "Blok " string from display logic
  - [x] Files affected: `src/app/kas-rt/page.tsx` (around L1137-1140)
- [x] **#4** Update filter dropdown (if applicable)
  - [x] Check block filter dropdown for "Blok " prefix (around L1309-1311)
  - [x] Ensure consistency across all reference displays
  - [x] Files affected: `src/app/kas-rt/page.tsx`

### Phase 3: Data Ordering & Integrity Validation (Priority: Critical)
- [x] **#5** Verify transaction sorting logic
  - [x] Confirm `filteredTransactions` sorts by date descending (newest to oldest)
  - [x] Validate sorting is stable and consistent
  - [x] Files affected: `src/app/kas-rt/page.tsx` (around L341-376)
- [x] **#6** Test data accuracy
  - [x] Verify all transactions display correctly after grouping
  - [x] Ensure no data is lost or duplicated during grouping
  - [x] Test edge cases: empty lists, single transaction, multiple months

### Phase 4: Testing & Cleanup (Priority: Medium)
- [x] **#7** Manual testing
  - [x] Test with various date ranges
  - [x] Verify separators appear correctly at month boundaries
  - [x] Confirm reference values display without prefix
  - [x] Validate ordering is newest to oldest
- [x] **#8** Code cleanup & documentation
  - [x] Remove any unused code or comments
  - [x] Add inline comments for grouping logic
  - [x] Update this plan with completion notes

---

## 🗺️ Execution Plan

### Step 1: Analyze Current Implementation
- **Goal**: Understand existing transaction list rendering and sorting
- **Files to Review**: `src/app/kas-rt/page.tsx`
- **Implementation Notes**:
  - Review `filteredTransactions` useMemo logic (L341-376)
  - Review transaction list rendering (L1065 onwards)
  - Identify where "Blok " prefix is hardcoded
- **Validation**: Document current behavior before making changes

### Step 2: Implement Month/Year Grouping
- **Goal**: Add visual separators between month/year groups
- **Files to Modify**: `src/app/kas-rt/page.tsx`
- **Implementation Notes**:
  - Create a helper to format month/year in Indonesian (e.g., "Maret 2026")
  - Iterate through sorted transactions and insert separator when month/year changes
  - Use existing `getMonthNameIndonesian()` helper if available
  - Render separator as a centered, styled div between transaction groups
- **Validation**: Separators appear at correct month boundaries, styling is consistent

### Step 3: Remove "Blok " Prefix
- **Goal**: Display raw reference values without prefix
- **Files to Modify**: `src/app/kas-rt/page.tsx`
- **Implementation Notes**:
  - Locate `<span>Blok {tx.reference}</span>` (around L1137-1140)
  - Change to `<span>{tx.reference}</span>`
  - Check filter dropdown options (around L1309-1311) for similar prefix
  - Update to show raw value: `<option key={blok} value={blok}>{blok}</option>`
- **Validation**: Reference displays show only the raw value (e.g., "A1" instead of "Blok A1")

### Step 4: Verify Data Ordering
- **Goal**: Ensure transactions display newest to oldest accurately
- **Files to Modify**: `src/app/kas-rt/page.tsx`
- **Implementation Notes**:
  - Review sorting logic in `filteredTransactions` useMemo
  - Ensure sort key is transaction date, descending order
  - Verify grouping logic doesn't disrupt sort order
- **Validation**: Transactions display in correct chronological order (newest first)

### Step 5: Test & Validate
- **Goal**: Confirm all changes work correctly together
- **Files to Test**: `src/app/kas-rt/page.tsx`
- **Implementation Notes**:
  - Test with transactions spanning multiple months
  - Test with transactions from same month
  - Test with empty transaction list
  - Verify reference values display correctly
  - Confirm ordering is maintained after grouping
- **Validation**: All three requirements met, no regressions

---

## 📊 Progress Tracking

| Phase | Tasks | Status | Started | Completed | Notes |
|-------|-------|--------|---------|-----------|-------|
| Phase 1 | #1, #2 | ✅ Complete | — | — | Month/year grouping |
| Phase 2 | #3, #4 | ✅ Complete | — | — | Reference prefix removal |
| Phase 3 | #5, #6 | ✅ Complete | — | — | Data ordering validation |
| Phase 4 | #7, #8 | ✅ Complete | — | — | Testing & cleanup |
| **Total** | **8** | **100% Complete** | — | — | — |

---

## ⚠️ Risks & Considerations

### Security & Compliance
- No security implications; UI-only changes

### Architecture & Performance
- Grouping logic adds minimal overhead; should not impact performance
- Ensure grouping is done efficiently within existing useMemo

### Database & Data Integrity
- No database changes required
- Data ordering must be preserved exactly as returned from API

### Breaking Changes
- Reference display change may affect user expectations; ensure raw values are clear
- Month separators are additive; no existing functionality removed

---

## 🚨 Rollback Plan

If issues arise during or after implementation:
1. Revert changes to `src/app/kas-rt/page.tsx` via git
2. Restore previous transaction list rendering logic
3. Verify original "Blok " prefix display is restored
4. Confirm transaction ordering matches previous behavior

---

## ✅ Definition of Done

Each task is considered complete when:
- [x] Code changes are implemented and committed
- [x] TypeScript compilation passes with no errors
- [x] Linting & formatting checks pass (`npm run lint`, `npm run format`)
- [x] Manual testing confirms expected behavior
- [x] No regressions in related functionality
- [x] Checklist item marked complete with commit reference

---

## 📝 Change Summary

### Files Created
- None expected

### Files Modified
- `src/app/kas-rt/page.tsx` — Add month/year grouping, remove "Blok " prefix, verify ordering

### Files Deleted
- None expected

### Dependencies Added/Removed
- None expected

---

## 🔖 Versioning & Commit Guidelines

### Version Bump Strategy
- **Patch** (`0.2.x`): UI improvements, non-breaking changes

### Conventional Commit Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Examples**:
```
fix(kas-rt): add month/year grouping separators and remove Blok prefix
ui(kas-rt): improve transaction list with date grouping and raw reference display
```

---

**Last Updated**: 2026-04-02
> **Completed on**: 2026-04-02
> **Version**: v0.2.2  
**Next Action**: Plan archived, ready for next cycle  
**Assigned To**: Development Team
