# Profile Page Refactoring - Implementation Checklist

> **Project**: Profile Page Modular Refactoring  
> **Target File**: `src/app/profil/page.tsx` (2,215 lines → ~200 lines)  
> **Total Estimated Time**: 13-19 days (2.5-4 weeks)  
> **Start Date**: _____________  
> **Target Completion**: _____________

---

## 📋 Pre-Implementation Checklist

### Setup & Planning (1-2 hours)

- [ ] **Read All Documentation**
  - [ ] PROFILE_REFACTOR_SUMMARY.md (30 min)
  - [ ] PROFILE_PAGE_REFACTOR.md (45 min)
  - [ ] PROFILE_ARCHITECTURE.md (30 min)
  - [ ] PROFILE_HOOKS_PLAN.md (45 min)
  - [ ] PROFILE_MIGRATION_GUIDE.md (1 hour)

- [ ] **Environment Setup**
  - [ ] Git branch created: `refactor/profile-page-modular`
  - [ ] Local development server running
  - [ ] Test users/accounts prepared
  - [ ] Browser DevTools configured
  - [ ] Testing library installed

- [ ] **Team Communication**
  - [ ] Team notified of refactoring start
  - [ ] Code freeze on `page.tsx` confirmed
  - [ ] Daily standup slot reserved
  - [ ] Review assignments confirmed

- [ ] **Backup & Safety**
  - [ ] Current `page.tsx` backed up
  - [ ] Feature flag strategy decided
  - [ ] Rollback plan documented
  - [ ] Monitoring alerts configured

---

## 🏗️ Phase 1: Foundation Layer (Days 1-3)

**Goal**: Create types, config, and services without breaking existing code  
**Estimated Time**: 2-3 days  
**Dependencies**: None

### Day 1: Types & Config (6-8 hours)

- [ ] **1.1 Create Directory Structure** (30 min)
  ```bash
  mkdir -p src/types/profile
  mkdir -p src/config
  mkdir -p src/services/profile
  mkdir -p src/hooks/profile
  mkdir -p src/components/profile/shared
  ```
  - [ ] Directories created
  - [ ] Git committed: "chore: create profile refactor directory structure"

- [ ] **1.2 Extract Types** (2-3 hours)
  - [ ] Create `src/types/profile/index.ts`
  - [ ] Copy existing interfaces from `page.tsx`:
    - [ ] `FamilyMember`
    - [ ] `PendingJoinRequestItem`
    - [ ] `PendingJoinRequestRequester`
    - [ ] `ProfileRole`
    - [ ] `ProfileBadge`
    - [ ] `ProfileResidence`
    - [ ] `ProfileData`
  - [ ] Add API response types:
    - [ ] `ProfileApiResponse`
    - [ ] `HouseApiResponse`
    - [ ] `FamilyMemberApiResponse`
    - [ ] `ResidenceApiResponse`
    - [ ] `JoinRequestApiResponse`
    - [ ] `TenantApiResponse`
    - [ ] `CommunityApiResponse`
    - [ ] `RoleApiResponse`
    - [ ] `BadgeApiResponse`
  - [ ] Add UI model types:
    - [ ] `ProfileData` (UI optimized)
    - [ ] `Residence`
    - [ ] `House`
    - [ ] `FamilyMember` (UI optimized)
    - [ ] `JoinRequest`
  - [ ] Add form types:
    - [ ] `ProfileEditFormData`
    - [ ] `AddFamilyMemberFormData`
    - [ ] `PinChangeFormData`
  - [ ] Add validation types:
    - [ ] `ValidationStatus`
    - [ ] `FieldValidationState`
    - [ ] `ValidationResult`
  - [ ] Add utility types:
    - [ ] `ApiResult<T>`
    - [ ] `ConfirmDialogConfig`
  - [ ] Import types in `page.tsx` to verify no errors
  - [ ] Git committed: "feat(profile): add comprehensive type definitions"

- [ ] **1.3 Create Configuration** (2-3 hours)
  - [ ] Create `src/config/profile.ts`
  - [ ] Add API endpoints:
    - [ ] `PROFILE_API_ENDPOINTS`
  - [ ] Add relationship labels:
    - [ ] `RELATIONSHIP_LABELS`
  - [ ] Add validation rules:
    - [ ] `VALIDATION_RULES.USERNAME`
    - [ ] `VALIDATION_RULES.PHONE`
    - [ ] `VALIDATION_RULES.FULL_NAME`
    - [ ] `VALIDATION_RULES.EMAIL`
    - [ ] `VALIDATION_RULES.PIN`
  - [ ] Add avatar config:
    - [ ] `AVATAR_CONFIG`
  - [ ] Add UI messages:
    - [ ] `PROFILE_MESSAGES` (all messages)
  - [ ] Add confirm dialog templates:
    - [ ] `CONFIRM_DIALOGS`
  - [ ] Add default values:
    - [ ] `PROFILE_DEFAULTS`
  - [ ] Add debounce times:
    - [ ] `DEBOUNCE_TIMES`
  - [ ] Test import in `page.tsx`
  - [ ] Git committed: "feat(profile): centralize configuration and constants"

### Day 2: API Service (6-8 hours)

- [ ] **1.4 Create API Service** (4-5 hours)
  - [ ] Create `src/services/profile/api.service.ts`
  - [ ] Implement profile endpoints:
    - [ ] `fetchProfile()`
    - [ ] `updateProfile(payload)`
  - [ ] Implement validation endpoints:
    - [ ] `checkUsernameAvailability(username)`
    - [ ] `checkPhoneAvailability(phone)`
  - [ ] Implement avatar endpoint:
    - [ ] `uploadAvatar(file)`
  - [ ] Implement PIN endpoint:
    - [ ] `changePin(payload)`
  - [ ] Implement family endpoints:
    - [ ] `addFamilyMember(houseId, payload)`
    - [ ] `removeFamilyMember(houseId, userId)`
    - [ ] `transferOwnership(houseId, userId)`
  - [ ] Implement join request endpoint:
    - [ ] `respondToJoinRequest(requestId, action)`
  - [ ] Implement theme endpoint:
    - [ ] `updateTheme(themeId)`
  - [ ] Implement logout endpoint:
    - [ ] `logout()`
  - [ ] All functions use `ApiResult<T>` pattern
  - [ ] Consistent error handling
  - [ ] Git committed: "feat(profile): implement API service layer"

- [ ] **1.5 Write API Service Tests** (2-3 hours)
  - [ ] Create `src/services/profile/__tests__/api.service.test.ts`
  - [ ] Test `fetchProfile`:
    - [ ] Success case
    - [ ] 401 error case
    - [ ] Network error case
  - [ ] Test `updateProfile`:
    - [ ] Success case
    - [ ] Validation error case
  - [ ] Test `checkUsernameAvailability`:
    - [ ] Available
    - [ ] Taken
  - [ ] Test `checkPhoneAvailability`:
    - [ ] Available
    - [ ] Taken
  - [ ] Test `uploadAvatar`:
    - [ ] Success
    - [ ] File too large
  - [ ] Test `changePin`:
    - [ ] Success
    - [ ] Wrong current PIN
  - [ ] All tests pass
  - [ ] Coverage > 80%
  - [ ] Git committed: "test(profile): add API service tests"

### Day 3: Transformers & Validation (6-8 hours)

- [ ] **1.6 Create Transformers** (3-4 hours)
  - [ ] Create `src/services/profile/transformers.ts`
  - [ ] Implement `transformProfileData(api)`:
    - [ ] Normalize null values
    - [ ] Format dates
    - [ ] Compute derived fields
    - [ ] Transform nested objects
  - [ ] Implement `transformHouse(api)`
  - [ ] Implement `transformFamilyMember(api)`
  - [ ] Implement `transformResidence(api)`
  - [ ] Implement `transformJoinRequest(api)`
  - [ ] Implement `transformBadge(api)`
  - [ ] Helper functions:
    - [ ] `formatDate(iso)`
    - [ ] `formatBlokRumah(house)`
    - [ ] `toDateInputValue(iso)`
  - [ ] Git committed: "feat(profile): implement data transformers"

- [ ] **1.7 Write Transformer Tests** (1-2 hours)
  - [ ] Create `src/services/profile/__tests__/transformers.test.ts`
  - [ ] Test `transformProfileData`:
    - [ ] With all fields
    - [ ] With null fields
    - [ ] With empty arrays
  - [ ] Test `formatDate`:
    - [ ] Valid ISO string
    - [ ] Null value
    - [ ] Invalid string
  - [ ] Test `transformFamilyMember`:
    - [ ] With relationship label
  - [ ] All tests pass
  - [ ] Git committed: "test(profile): add transformer tests"

- [ ] **1.8 Create Validation Service** (2-3 hours)
  - [ ] Create `src/services/profile/validation.service.ts`
  - [ ] Implement `validateUsername(username)`:
    - [ ] Length check
    - [ ] Pattern check
    - [ ] Return ValidationResult
  - [ ] Implement `validatePhone(phone)`:
    - [ ] Length check
    - [ ] Pattern check
  - [ ] Implement `validateEmail(email)`:
    - [ ] Pattern check
  - [ ] Implement `validatePin(pin)`:
    - [ ] Length and pattern
  - [ ] Implement `validateAvatarFile(file)`:
    - [ ] Size check
    - [ ] Type check
  - [ ] Implement `validateProfileForm(formData)`:
    - [ ] All field validations
    - [ ] Returns errors object
  - [ ] Implement `validateAddMemberForm(formData)`
  - [ ] Git committed: "feat(profile): implement validation service"

- [ ] **1.9 Write Validation Tests** (1 hour)
  - [ ] Create `src/services/profile/__tests__/validation.service.test.ts`
  - [ ] Test all validation functions
  - [ ] Test edge cases
  - [ ] All tests pass
  - [ ] Git committed: "test(profile): add validation service tests"

**Phase 1 Checkpoint**:
- [ ] All service layer tests pass
- [ ] No TypeScript errors
- [ ] Code reviewed
- [ ] Git pushed to remote

---

## 🎣 Phase 2: Core Hooks (Days 4-6)

**Goal**: Create primary hooks for profile data and editing  
**Estimated Time**: 2-3 days  
**Dependencies**: Phase 1 complete

### Day 4: useProfileData (6-8 hours)

- [ ] **2.1 Implement useProfileData** (4-5 hours)
  - [ ] Create `src/hooks/profile/useProfileData.ts`
  - [ ] State declarations:
    - [ ] `profile`
    - [ ] `isLoading`
    - [ ] `error`
    - [ ] `hasMounted`
  - [ ] Implement `loadProfile()`:
    - [ ] Call `fetchProfile()`
    - [ ] Handle 401 → redirect
    - [ ] Transform API response
    - [ ] Update global stores (theme, header)
  - [ ] Implement mount effect:
    - [ ] Check authentication
    - [ ] Load profile
  - [ ] Implement `refreshProfile()`:
    - [ ] Exposed for other hooks
  - [ ] Compute derived values:
    - [ ] `currentResidence`
    - [ ] `isKepalaKeluarga`
  - [ ] Return interface defined
  - [ ] Git committed: "feat(profile): implement useProfileData hook"

- [ ] **2.2 Test useProfileData** (2-3 hours)
  - [ ] Create `src/hooks/profile/__tests__/useProfileData.test.ts`
  - [ ] Test loading on mount
  - [ ] Test success case
  - [ ] Test error case
  - [ ] Test 401 redirect
  - [ ] Test refreshProfile()
  - [ ] Test derived values
  - [ ] All tests pass
  - [ ] Git committed: "test(profile): add useProfileData tests"

- [ ] **2.3 Parallel Testing in Page** (1 hour)
  - [ ] Import useProfileData in `page.tsx`
  - [ ] Call hook (don't use result yet)
  - [ ] Console log comparison with old implementation
  - [ ] Verify data matches
  - [ ] Git committed: "test(profile): verify useProfileData matches old implementation"

### Day 5: useProfileEdit (6-8 hours)

- [ ] **2.4 Implement useProfileEdit** (4-5 hours)
  - [ ] Create `src/hooks/profile/useProfileEdit.ts`
  - [ ] State declarations:
    - [ ] `isEditing`
    - [ ] `formData`
    - [ ] `isSaving`
    - [ ] `saveError`
    - [ ] `validationErrors`
  - [ ] Implement `initializeFormData()`:
    - [ ] Map profile to form
  - [ ] Implement effect to reset form on profile change
  - [ ] Implement `startEditing()`
  - [ ] Implement `cancelEditing()`
  - [ ] Implement `updateField()`:
    - [ ] Generic field updater
    - [ ] Clear field error
  - [ ] Implement `handleSave()`:
    - [ ] Validate form
    - [ ] Call updateProfile()
    - [ ] Handle errors
    - [ ] Refresh profile on success
    - [ ] Exit edit mode
  - [ ] Return interface defined
  - [ ] Git committed: "feat(profile): implement useProfileEdit hook"

- [ ] **2.5 Test useProfileEdit** (2-3 hours)
  - [ ] Create `src/hooks/profile/__tests__/useProfileEdit.test.ts`
  - [ ] Test form initialization
  - [ ] Test field updates
  - [ ] Test validation errors
  - [ ] Test save success
  - [ ] Test save error
  - [ ] Test cancel
  - [ ] All tests pass
  - [ ] Git committed: "test(profile): add useProfileEdit tests"

### Day 6: Barrel Export & Integration Test (2-4 hours)

- [ ] **2.6 Create Barrel Export** (30 min)
  - [ ] Create `src/hooks/profile/index.ts`
  - [ ] Export useProfileData
  - [ ] Export useProfileEdit
  - [ ] Export types
  - [ ] Git committed: "feat(profile): add hooks barrel export"

- [ ] **2.7 Integration Testing** (1.5-3.5 hours)
  - [ ] Test both hooks together in page
  - [ ] Verify edit flow works
  - [ ] Verify save flow works
  - [ ] Check for race conditions
  - [ ] Monitor console for errors
  - [ ] Performance check (no unnecessary re-renders)
  - [ ] Git committed: "test(profile): integration test core hooks"

**Phase 2 Checkpoint**:
- [ ] Core hooks working correctly
- [ ] All tests pass
- [ ] Integration verified
- [ ] Code reviewed
- [ ] Git pushed to remote

---

## ⚙️ Phase 3: Feature Hooks (Days 7-10)

**Goal**: Implement all feature-specific hooks  
**Estimated Time**: 3-4 days  
**Dependencies**: Phase 2 complete

### Day 7: Validation & Avatar (6-8 hours)

- [ ] **3.1 Implement useFieldValidation** (3-4 hours)
  - [ ] Create `src/hooks/profile/useFieldValidation.ts`
  - [ ] State for username validation
  - [ ] State for phone validation
  - [ ] Implement debounced `checkUsername()`
  - [ ] Implement debounced `checkPhone()`
  - [ ] Client-side validation before API
  - [ ] Implement `resetValidation()`
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): implement useFieldValidation hook"

- [ ] **3.2 Implement useAvatarUpload** (3-4 hours)
  - [ ] Create `src/hooks/profile/useAvatarUpload.ts`
  - [ ] State declarations
  - [ ] File input ref
  - [ ] Implement `handleFileSelect()`:
    - [ ] Validate file
    - [ ] Create preview
    - [ ] Upload file
    - [ ] Refresh profile
  - [ ] Implement `triggerFileInput()`
  - [ ] Implement `clearPreview()`
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): implement useAvatarUpload hook"

### Day 8: PIN & Theme (6-8 hours)

- [ ] **3.3 Implement usePinChange** (3-4 hours)
  - [ ] Create `src/hooks/profile/usePinChange.ts`
  - [ ] Dialog state
  - [ ] Form data state
  - [ ] Implement `openDialog()`
  - [ ] Implement `closeDialog()`
  - [ ] Implement `updatePin()`
  - [ ] Implement `handleChange()`:
    - [ ] Validate PINs
    - [ ] Check match
    - [ ] Call changePin()
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): implement usePinChange hook"

- [ ] **3.4 Implement useThemeSelection** (3-4 hours)
  - [ ] Create `src/hooks/profile/useThemeSelection.ts`
  - [ ] Sheet state
  - [ ] Theme selection state
  - [ ] Implement `openSheet()`
  - [ ] Implement `closeSheet()`
  - [ ] Implement `handleSelect()`:
    - [ ] Update theme API
    - [ ] Update stores
    - [ ] Update cookies
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): implement useThemeSelection hook"

### Day 9: Family & Join Requests (6-8 hours)

- [ ] **3.5 Implement useFamilyManagement** (4-5 hours)
  - [ ] Create `src/hooks/profile/useFamilyManagement.ts`
  - [ ] All state declarations
  - [ ] Implement `startManaging()` / `stopManaging()`
  - [ ] Implement `showAddMemberForm()` / `hideAddMemberForm()`
  - [ ] Implement `updateAddFormField()`
  - [ ] Implement `handleAddMember()`:
    - [ ] Validate form
    - [ ] Call addFamilyMember()
    - [ ] Refresh profile
  - [ ] Implement `handleTransferOwnership()`:
    - [ ] Call transferOwnership()
    - [ ] Refresh profile
  - [ ] Implement `handleRemoveMember()`:
    - [ ] Call removeFamilyMember()
    - [ ] Refresh profile
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): implement useFamilyManagement hook"

- [ ] **3.6 Implement useJoinRequests** (2-3 hours)
  - [ ] Create `src/hooks/profile/useJoinRequests.ts`
  - [ ] State declarations
  - [ ] Implement `respondToRequest(requestId, action)`
  - [ ] Implement `handleAccept()`
  - [ ] Implement `handleReject()`
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): implement useJoinRequests hook"

### Day 10: Residence Selector & Hook Tests (6-8 hours)

- [ ] **3.7 Implement useResidenceSelector** (2-3 hours)
  - [ ] Create `src/hooks/profile/useResidenceSelector.ts`
  - [ ] State for selected index
  - [ ] Compute current residence
  - [ ] Implement `handleChange()`
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): implement useResidenceSelector hook"

- [ ] **3.8 Complete Hook Testing** (4-5 hours)
  - [ ] All hook tests written
  - [ ] All tests pass
  - [ ] Coverage > 75%
  - [ ] Update barrel export with all hooks
  - [ ] Git committed: "test(profile): complete all hook tests"

**Phase 3 Checkpoint**:
- [ ] All hooks implemented
- [ ] All hook tests pass
- [ ] Barrel export updated
- [ ] Code reviewed
- [ ] Git pushed to remote

---

## 🎨 Phase 4: Components (Days 11-14)

**Goal**: Extract all presentational components  
**Estimated Time**: 3-4 days  
**Dependencies**: Phase 3 complete

### Day 11: Shared Components (6-8 hours)

- [ ] **4.1 Create Shared Components** (6-8 hours)
  - [ ] **InfoRow** (1 hour)
    - [ ] Create `src/components/profile/shared/InfoRow.tsx`
    - [ ] Props interface defined
    - [ ] Render key-value pair
    - [ ] Optional icon support
    - [ ] Tests written
    - [ ] Git committed
  - [ ] **FieldInput** (2 hours)
    - [ ] Create `src/components/profile/shared/FieldInput.tsx`
    - [ ] Props interface (label, value, onChange, error, etc)
    - [ ] Support different input types
    - [ ] Error display
    - [ ] Validation indicator slot
    - [ ] Tests written
    - [ ] Git committed
  - [ ] **ValidationIndicator** (1 hour)
    - [ ] Create `src/components/profile/shared/ValidationIndicator.tsx`
    - [ ] Props interface (status, message)
    - [ ] Status icons (checking, available, taken, error)
    - [ ] Color coding
    - [ ] Tests written
    - [ ] Git committed
  - [ ] **ConfirmDialog** (2-3 hours)
    - [ ] Create `src/components/profile/ConfirmDialog.tsx`
    - [ ] Props interface (config, isOpen, onClose)
    - [ ] Modal/dialog wrapper
    - [ ] Danger variant styling
    - [ ] Loading state on confirm
    - [ ] Tests written
    - [ ] Git committed

### Day 12: Major Components Part 1 (6-8 hours)

- [ ] **4.2 Create ProfileHeader** (2-3 hours)
  - [ ] Create `src/components/profile/ProfileHeader.tsx`
  - [ ] Extract hero section JSX
  - [ ] Props interface (profile, onAvatarClick, isUploading, etc)
  - [ ] Avatar with upload trigger
  - [ ] Name and username display
  - [ ] Blok/house info
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): create ProfileHeader component"

- [ ] **4.3 Create ProfileInfoCard** (2-3 hours)
  - [ ] Create `src/components/profile/ProfileInfoCard.tsx`
  - [ ] Extract info display JSX
  - [ ] Props interface
  - [ ] Use InfoRow components
  - [ ] Action buttons (edit, PIN, theme, logout)
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): create ProfileInfoCard component"

- [ ] **4.4 Create ProfileEditForm** (2-3 hours)
  - [ ] Create `src/components/profile/ProfileEditForm.tsx`
  - [ ] Extract edit form JSX
  - [ ] Props interface (formData, errors, onChange, etc)
  - [ ] Use FieldInput components
  - [ ] Validation indicators
  - [ ] Save/Cancel buttons
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): create ProfileEditForm component"

### Day 13: Major Components Part 2 (6-8 hours)

- [ ] **4.5 Create FamilyMembersSection** (3-4 hours)
  - [ ] Create `src/components/profile/FamilyMembersSection.tsx`
  - [ ] Extract family management JSX
  - [ ] Props interface
  - [ ] Member list rendering
  - [ ] Add member form (conditional)
  - [ ] Transfer/Remove actions
  - [ ] Loading states per member
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): create FamilyMembersSection component"

- [ ] **4.6 Create JoinRequestsSection** (2-3 hours)
  - [ ] Create `src/components/profile/JoinRequestsSection.tsx`
  - [ ] Extract join requests JSX
  - [ ] Props interface
  - [ ] Request list rendering
  - [ ] Accept/Reject buttons
  - [ ] Loading state per request
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): create JoinRequestsSection component"

### Day 14: Dialogs & Final Components (6-8 hours)

- [ ] **4.7 Create ThemeSheet** (2-3 hours)
  - [ ] Create `src/components/profile/ThemeSheet.tsx`
  - [ ] Extract theme selection JSX
  - [ ] Props interface
  - [ ] Modal/sheet wrapper
  - [ ] Theme grid
  - [ ] Active theme indicator
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): create ThemeSheet component"

- [ ] **4.8 Create PinChangeDialog** (2-3 hours)
  - [ ] Create `src/components/profile/PinChangeDialog.tsx`
  - [ ] Extract PIN change JSX
  - [ ] Props interface
  - [ ] Modal wrapper
  - [ ] OTP inputs for PINs
  - [ ] Error display
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): create PinChangeDialog component"

- [ ] **4.9 Create ResidenceSelector** (1-2 hours)
  - [ ] Create `src/components/profile/ResidenceSelector.tsx`
  - [ ] Props interface
  - [ ] Dropdown rendering
  - [ ] Selected residence display
  - [ ] Tests written
  - [ ] Git committed: "feat(profile): create ResidenceSelector component"

- [ ] **4.10 Component Barrel Export** (30 min)
  - [ ] Create `src/components/profile/index.ts`
  - [ ] Export all components
  - [ ] Git committed: "feat(profile): add components barrel export"

**Phase 4 Checkpoint**:
- [ ] All components created
- [ ] All component tests pass
- [ ] Storybook stories created (optional)
- [ ] Code reviewed
- [ ] Git pushed to remote

---

## 🔗 Phase 5: Integration (Days 15-17)

**Goal**: Create new page and replace old implementation  
**Estimated Time**: 2-3 days  
**Dependencies**: Phase 4 complete

### Day 15: New Page Implementation (6-8 hours)

- [ ] **5.1 Create New Page (Parallel)** (4-6 hours)
  - [ ] Create `src/app/profil-new/page.tsx`
  - [ ] Import all hooks
  - [ ] Import all components
  - [ ] Orchestrate hooks (all ~9 hooks)
  - [ ] Compose components
  - [ ] Handle loading states
  - [ ] Handle error states
  - [ ] Add logout handler
  - [ ] Clean JSX (~200 lines)
  - [ ] Git committed: "feat(profile): create new modular page implementation"

- [ ] **5.2 Initial Testing** (2 hours)
  - [ ] Test in dev environment
  - [ ] All features render
  - [ ] No console errors
  - [ ] No TypeScript errors
  - [ ] Initial smoke test passed

### Day 16: Comprehensive Testing (6-8 hours)

- [ ] **5.3 Feature Testing** (3-4 hours)
  - [ ] Test profile loading
  - [ ] Test edit mode
  - [ ] Test save profile
  - [ ] Test username validation
  - [ ] Test phone validation
  - [ ] Test avatar upload
  - [ ] Test PIN change
  - [ ] Test theme selection
  - [ ] Test family management (if KK)
  - [ ] Test join requests
  - [ ] Test logout
  - [ ] All features work correctly

- [ ] **5.4 Edge Case Testing** (2-3 hours)
  - [ ] Test with no profile picture
  - [ ] Test with null fields
  - [ ] Test with multiple residences
  - [ ] Test with no family members
  - [ ] Test with no join requests
  - [ ] Test network errors
  - [ ] Test 401 responses
  - [ ] Test concurrent operations
  - [ ] All edge cases handled

- [ ] **5.5 Performance Testing** (1 hour)
  - [ ] Check render counts
  - [ ] Verify no unnecessary re-renders
  - [ ] Check bundle size impact
  - [ ] Verify load time acceptable
  - [ ] Performance metrics good

### Day 17: Deployment & Monitoring (6-8 hours)

- [ ] **5.6 A/B Testing Setup** (optional, 2 hours)
  - [ ] Add feature flag
  - [ ] Test flag toggling
  - [ ] Deploy to staging
  - [ ] Test both versions work

- [ ] **5.7 Replace Old Implementation** (2 hours)
  - [ ] Backup old `page.tsx`
  - [ ] Copy new implementation to `page.tsx`
  - [ ] Delete `profil-new` directory
  - [ ] Update imports if needed
  - [ ] Final smoke test
  - [ ] Git committed: "feat(profile): replace old implementation with modular version"

- [ ] **5.8 Production Deployment** (2-4 hours)
  - [ ] Final code review
  - [ ] All tests passing
  - [ ] Merge to main
  - [ ] Deploy to production
  - [ ] Monitor for errors
  - [ ] Check metrics
  - [ ] Verify in production

**Phase 5 Checkpoint**:
- [ ] New page working in production
- [ ] No critical errors
- [ ] All features functional
- [ ] Performance acceptable
- [ ] Team notified

---

## 🧹 Phase 6: Cleanup (Days 18-19)

**Goal**: Remove old code, finalize documentation  
**Estimated Time**: 1-2 days  
**Dependencies**: Phase 5 complete, production stable

### Day 18: Code Cleanup (4-6 hours)

- [ ] **6.1 Remove Old Code** (2-3 hours)
  - [ ] Delete `page.backup.tsx`
  - [ ] Delete `page.old.tsx`
  - [ ] Remove unused imports
  - [ ] Remove commented code
  - [ ] Remove debug console.logs
  - [ ] Git committed: "chore(profile): remove old implementation files"

- [ ] **6.2 Code Quality** (2-3 hours)
  - [ ] Run ESLint
  - [ ] Fix all linting errors
  - [ ] Run Prettier
  - [ ] Format all files
  - [ ] Run TypeScript check
  - [ ] Fix all type errors
  - [ ] Git committed: "chore(profile): fix linting and formatting"

### Day 19: Documentation & Finalization (4-6 hours)

- [ ] **6.3 Update Documentation** (2-3 hours)
  - [ ] Update README if needed
  - [ ] Add JSDoc comments to complex functions
  - [ ] Update inline comments
  - [ ] Create migration notes
  - [ ] Document any breaking changes
  - [ ] Git committed: "docs(profile): update documentation"

- [ ] **6.4 Knowledge Sharing** (2-3 hours)
  - [ ] Prepare walkthrough presentation
  - [ ] Host team walkthrough session
  - [ ] Answer team questions
  - [ ] Document lessons learned
  - [ ] Update best practices guide

**Phase 6 Checkpoint**:
- [ ] All old code removed
- [ ] Documentation updated
- [ ] Team trained
- [ ] Refactoring complete! 🎉

---