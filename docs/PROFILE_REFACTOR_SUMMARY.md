# Profile Page Refactoring - Executive Summary & Quick Reference

> **Status**: Planning Phase  
> **Target**: `src/app/profil/page.tsx` (2,215 lines)  
> **Goal**: Modular, testable, maintainable architecture  
> **Estimated Duration**: 2.5-4 weeks

---

## 📋 Quick Overview

### Current State

```
❌ 2,215 lines of monolithic code
❌ 40+ useState declarations
❌ 7+ mixed concerns in one file
❌ Inline API calls everywhere
❌ Nearly impossible to test
❌ Hard to maintain and extend
```

### Target State

```
✅ ~200 lines main page (composition only)
✅ 9 focused custom hooks
✅ 10+ reusable components
✅ Centralized services layer
✅ 100% testable
✅ Easy to maintain and extend
```

---

## 🎯 Key Objectives

1. **Reduce Complexity** - Break down 2,215 lines into manageable modules
2. **Improve Testability** - Enable unit and integration testing
3. **Enhance Reusability** - Create reusable hooks and components
4. **Increase Maintainability** - Clear separation of concerns
5. **Better Type Safety** - Comprehensive TypeScript types
6. **Centralize Configuration** - Single source of truth for constants

---

## 📁 New File Structure

```
src/
├── types/profile/
│   └── index.ts                      # 400 lines - All type definitions
│
├── config/
│   └── profile.ts                    # 300 lines - Constants & config
│
├── services/profile/
│   ├── api.service.ts                # 400 lines - API calls
│   ├── transformers.ts               # 250 lines - Data transformations
│   └── validation.service.ts         # 200 lines - Validation logic
│
├── hooks/profile/
│   ├── index.ts                      # Barrel export
│   ├── useProfileData.ts             # 180 lines - Core profile data
│   ├── useProfileEdit.ts             # 150 lines - Edit mode & save
│   ├── useFieldValidation.ts         # 140 lines - Field validation
│   ├── useAvatarUpload.ts            # 120 lines - Avatar management
│   ├── usePinChange.ts               # 130 lines - PIN change
│   ├── useFamilyManagement.ts        # 180 lines - Family CRUD
│   ├── useJoinRequests.ts            # 100 lines - Join requests
│   ├── useThemeSelection.ts          # 110 lines - Theme management
│   └── useResidenceSelector.ts       # 90 lines - Multi-residence
│
├── components/profile/
│   ├── ProfileHeader.tsx             # 120 lines - Hero section
│   ├── ProfileInfoCard.tsx           # 100 lines - Info display
│   ├── ProfileEditForm.tsx           # 150 lines - Edit form
│   ├── FamilyMembersSection.tsx      # 180 lines - Family management
│   ├── JoinRequestsSection.tsx       # 120 lines - Join requests
│   ├── ThemeSheet.tsx                # 140 lines - Theme selection
│   ├── PinChangeDialog.tsx           # 130 lines - PIN change
│   ├── ConfirmDialog.tsx             # 100 lines - Confirmation
│   ├── ResidenceSelector.tsx         # 80 lines - Residence dropdown
│   └── shared/
│       ├── InfoRow.tsx               # 40 lines - Key-value display
│       ├── FieldInput.tsx            # 80 lines - Form input
│       └── ValidationIndicator.tsx   # 50 lines - Validation status
│
└── app/profil/
    └── page.tsx                      # 200 lines - Composition only! ✨
```

**Total**: ~3,500 lines (vs 2,215 monolithic)  
**Benefit**: Better organization, testability, and maintainability

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────────┐
│         PAGE (Composition Layer)             │
│     • Assembles UI from components          │
│     • Orchestrates hooks                    │
│     • Minimal logic                         │
└────────────────────┬────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│  HOOKS       │          │  COMPONENTS  │
│  State +     │          │  Presentation│
│  Logic       │          │  UI Only     │
└──────┬───────┘          └──────────────┘
       │
       ▼
┌──────────────┐
│  SERVICES    │
│  API Calls   │
└──────┬───────┘
       │
  ┌────┴────┐
  ▼         ▼
┌─────┐  ┌──────┐
│Trans│  │Valid │
│form │  │ation │
└─────┘  └──────┘
```

---

## 🔑 Key Architectural Decisions

### 1. Hook-Based State Management

**Decision**: Use custom hooks for each feature domain  
**Why**: Encapsulates logic, enables reusability, improves testability

```typescript
// Instead of 40+ useState in one component:
const { profile, isLoading, error, refreshProfile } = useProfileData();
const { isEditing, formData, handleSave } = useProfileEdit(profile);
const { handleUpload } = useAvatarUpload();
```

### 2. Service Layer Pattern

**Decision**: Centralize all API calls in service layer  
**Why**: Consistent error handling, easy to mock, single source of truth

```typescript
// Instead of inline fetch calls:
const result = await fetchProfile();
if (result.success) {
  setProfile(result.data);
}
```

### 3. Type Transformation Layer

**Decision**: Separate API types from UI types  
**Why**: API changes don't break UI, business logic centralized

```typescript
// API → Transformer → UI
ProfileApiResponse → transformProfileData() → ProfileData
```

### 4. Configuration Centralization

**Decision**: All constants in `config/profile.ts`  
**Why**: Single source of truth, easy to modify

```typescript
// Instead of scattered strings:
PROFILE_API_ENDPOINTS.PROFILE
PROFILE_MESSAGES.SAVE_SUCCESS
VALIDATION_RULES.USERNAME.MIN_LENGTH
```

### 5. Component Composition

**Decision**: Small, focused presentational components  
**Why**: Reusable, testable, easy to understand

```typescript
// Instead of 2000 lines of JSX:
<ProfileHeader {...} />
<ProfileInfoCard {...} />
<FamilyMembersSection {...} />
```

---

## 🚀 Quick Start Guide

### For Implementers

1. **Read Documentation** (1 hour)
   - ✅ This summary
   - ✅ `PROFILE_PAGE_REFACTOR.md` - Detailed plan
   - ✅ `PROFILE_ARCHITECTURE.md` - Visual diagrams
   - ✅ `PROFILE_HOOKS_PLAN.md` - Hook specifications
   - ✅ `PROFILE_MIGRATION_GUIDE.md` - Step-by-step implementation

2. **Set Up Environment** (30 minutes)
   ```bash
   git checkout -b refactor/profile-page-modular
   mkdir -p src/{types,services,hooks,components}/profile
   ```

3. **Follow Implementation Phases** (2.5-4 weeks)
   - Phase 1: Foundation (types, config, services)
   - Phase 2: Core hooks (useProfileData, useProfileEdit)
   - Phase 3: Feature hooks (avatar, PIN, family, etc)
   - Phase 4: Components (presentational)
   - Phase 5: Page integration
   - Phase 6: Cleanup

### For Reviewers

**What to Look For**:
- ✅ Single Responsibility - Each file has one job
- ✅ Type Safety - Proper TypeScript usage
- ✅ Error Handling - Consistent ApiResult pattern
- ✅ Testing - Unit tests for all services/hooks
- ✅ No Logic in Components - Only presentation
- ✅ Proper Dependencies - Hooks depend on services, not vice versa

---

## 📊 Implementation Roadmap

### Phase 1: Foundation (Days 1-3)
**Deliverables**:
- ✅ `types/profile/index.ts` - All type definitions
- ✅ `config/profile.ts` - All constants
- ✅ `services/profile/api.service.ts` - API functions
- ✅ `services/profile/transformers.ts` - Data transformations
- ✅ `services/profile/validation.service.ts` - Validation logic

**Testing**: Unit tests for all services

### Phase 2: Core Hooks (Days 4-6)
**Deliverables**:
- ✅ `useProfileData` - Main profile data hook
- ✅ `useProfileEdit` - Edit mode and save logic

**Testing**: Integration tests, parallel testing in page

### Phase 3: Feature Hooks (Days 7-10)
**Deliverables**:
- ✅ `useFieldValidation` - Username/phone checks
- ✅ `useAvatarUpload` - Avatar management
- ✅ `usePinChange` - PIN change dialog
- ✅ `useFamilyManagement` - Family CRUD
- ✅ `useJoinRequests` - Join request handling
- ✅ `useThemeSelection` - Theme picker
- ✅ `useResidenceSelector` - Multi-residence

**Testing**: Unit tests for each hook

### Phase 4: Components (Days 11-14)
**Deliverables**:
- ✅ All presentational components
- ✅ Shared/reusable components

**Testing**: Component tests with React Testing Library

### Phase 5: Integration (Days 15-17)
**Deliverables**:
- ✅ New page implementation
- ✅ All features working
- ✅ Old implementation replaced

**Testing**: E2E tests, manual QA

### Phase 6: Cleanup (Days 18-19)
**Deliverables**:
- ✅ Documentation updated
- ✅ Old code removed
- ✅ Code review complete

**Testing**: Final smoke tests

---

## 🎨 Code Examples

### Before (Monolithic)

```typescript
// 2,215 lines in one file...
export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editWaNumber, setEditWaNumber] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<...>("idle");
  // ... 30+ more useState declarations
  
  useEffect(() => {
    // 100+ lines of profile loading logic
  }, []);
  
  const handleSave = async () => {
    // 80+ lines of save logic with inline API calls
  };
  
  const handleAvatarChange = async (e) => {
    // 40+ lines of upload logic
  };
  
  // ... 15+ more handlers
  
  return (
    // 2000+ lines of nested JSX
  );
}
```

### After (Modular)

```typescript
// ~200 lines total!
export default function ProfilePage() {
  // Hooks organize all state and logic
  const { profile, isLoading, error } = useProfileData();
  const { isEditing, formData, handleSave } = useProfileEdit(profile);
  const { handleUpload } = useAvatarUpload();
  const { handleChange } = usePinChange();
  const { handleAdd, handleTransfer } = useFamilyManagement(currentHouse);
  
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorDisplay error={error} />;
  if (!profile) return null;
  
  // Clean composition
  return (
    <>
      <ProfileHeader profile={profile} onAvatarClick={handleUpload} />
      <ProfileInfoCard profile={profile} isEditing={isEditing} />
      {isEditing && <ProfileEditForm formData={formData} onSave={handleSave} />}
      <FamilyMembersSection members={members} onAdd={handleAdd} />
      <ThemeSheet isOpen={isThemeOpen} onSelect={handleThemeSelect} />
    </>
  );
}
```

---

## 🧪 Testing Strategy

### Unit Tests (Services & Hooks)

```typescript
// Test services in isolation
describe("fetchProfile", () => {
  it("returns success with valid data", async () => {
    mockFetch({ ok: true, data: mockProfile });
    const result = await fetchProfile();
    expect(result.success).toBe(true);
  });
});

// Test hooks with renderHook
describe("useProfileData", () => {
  it("loads profile on mount", async () => {
    const { result } = renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.profile).not.toBeNull());
  });
});
```

### Component Tests

```typescript
describe("ProfileHeader", () => {
  it("renders profile name and avatar", () => {
    render(<ProfileHeader profile={mockProfile} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
describe("Profile Edit Flow", () => {
  it("allows user to edit and save profile", () => {
    cy.visit("/profil");
    cy.get("[data-testid=edit-button]").click();
    cy.get("[data-testid=fullname-input]").type("New Name");
    cy.get("[data-testid=save-button]").click();
    cy.contains("Profil berhasil diperbarui");
  });
});
```

---

## ⚠️ Critical Success Factors

### 1. Single Source of Truth for Profile Data

**Must**: Always use `useProfileData` as the primary data source  
**Must**: Other hooks call `refreshProfile()` after mutations  
**Don't**: Create duplicate profile state in other hooks

### 2. Proper Error Handling

**Must**: Use `ApiResult<T>` pattern consistently  
**Must**: Handle 401 (redirect to login)  
**Must**: Show user-friendly error messages

### 3. Type Safety Throughout

**Must**: Define types for all API responses  
**Must**: Transform API types to UI types  
**Must**: No `any` types (use `unknown` if needed)

### 4. Component Purity

**Must**: Components are presentational only  
**Must**: No business logic in components  
**Must**: All logic in hooks or services

### 5. Testing Coverage

**Must**: Unit tests for all services  
**Must**: Hook tests for all custom hooks  
**Must**: Component tests for major components  
**Must**: E2E tests for critical flows

---

## 🔄 Migration Safety

### Parallel Implementation

```typescript
// Test new implementation alongside old
const newProfile = useProfileData(); // New hook
const [oldProfile, setOldProfile] = useState(null); // Old state

useEffect(() => {
  console.log("Match:", deepEqual(oldProfile, newProfile.profile));
}, [oldProfile, newProfile.profile]);
```

### Feature Flags

```typescript
const USE_NEW_PROFILE = process.env.NEXT_PUBLIC_USE_NEW_PROFILE === "true";

if (USE_NEW_PROFILE) {
  return <NewProfilePage />;
}
return <OldProfilePage />;
```

### Rollback Plan

1. **Immediate**: Revert commit or restore backup file
2. **Feature Flag**: Toggle `NEXT_PUBLIC_USE_NEW_PROFILE=false`
3. **Targeted**: Revert specific problematic component/hook

---

## 📈 Success Metrics

### Code Quality Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Main page LOC | 2,215 | ~200 | ✅ |
| useState count | 40+ | 0 | ✅ |
| Cyclomatic complexity | Very High | Low | ✅ |
| Test coverage | 0% | 80%+ | ✅ |
| Reusable hooks | 0 | 9 | ✅ |
| Reusable components | 0 | 12+ | ✅ |

### Developer Experience Metrics

- ⏱️ **Time to understand code**: 2 hours → 30 minutes
- 🐛 **Time to fix bug**: 2 hours → 30 minutes
- ✨ **Time to add feature**: 4 hours → 1 hour
- 🧪 **Time to write tests**: N/A → 30 minutes per feature

### Business Metrics

- 🚀 **Faster feature development**
- 🎯 **Fewer bugs in production**
- 👥 **Easier onboarding for new developers**
- 📦 **More reusable code across app**

---

## 📚 Documentation Reference

### Primary Documents

1. **PROFILE_REFACTOR_SUMMARY.md** (this file)
   - Executive overview
   - Quick reference
   - Implementation roadmap

2. **PROFILE_PAGE_REFACTOR.md**
   - Detailed problems analysis
   - Complete refactoring plan
   - Types, config, services structure
   - Expected file sizes and complexity

3. **PROFILE_ARCHITECTURE.md**
   - Visual architecture diagrams
   - Before/after comparisons
   - Data flow diagrams
   - Component hierarchy
   - State management flows

4. **PROFILE_HOOKS_PLAN.md**
   - Detailed hook specifications
   - Implementation outlines
   - Hook dependencies
   - Return type interfaces
   - Usage examples

5. **PROFILE_MIGRATION_GUIDE.md**
   - Step-by-step implementation
   - Phase-by-phase breakdown
   - Testing strategies
   - Rollback procedures
   - Common pitfalls

### Reference Order

**For Planning**: Read in order 1 → 2 → 3 → 4 → 5  
**For Implementation**: Keep 5 open, reference 4 and 2 as needed  
**For Review**: Use 1 as checklist, verify against 2 and 3

---

## 🎯 Next Steps

### Immediate (Today)

1. ✅ Read this summary completely
2. ✅ Review all documentation
3. ✅ Understand current implementation
4. ✅ Set up development environment
5. ✅ Create feature branch

### This Week

1. ✅ Phase 1: Foundation layer
2. ✅ Set up testing infrastructure
3. ✅ Create types and config
4. ✅ Implement services
5. ✅ Write service tests

### Next Week

1. ✅ Phase 2: Core hooks
2. ✅ Test hooks in parallel
3. ✅ Phase 3: Feature hooks
4. ✅ Write hook tests

### Following Weeks

1. ✅ Phase 4: Components
2. ✅ Phase 5: Integration
3. ✅ Phase 6: Cleanup
4. ✅ Deploy to production

---

## 💡 Key Takeaways

1. **Separation of Concerns** - Each layer has one responsibility
2. **Testability First** - Design for testability from the start
3. **Type Safety** - Comprehensive TypeScript throughout
4. **Incremental Migration** - Low-risk, step-by-step approach
5. **Reusability** - Create reusable hooks and components
6. **Documentation** - Keep docs updated as you go
7. **Testing** - Test each layer independently
8. **Rollback Ready** - Always have a rollback plan

---

## 🤝 Team Collaboration

### Communication

- 📢 Notify team before starting major phases
- 🔄 Daily updates on progress
- ❓ Ask questions early and often
- 📝 Document decisions and trade-offs

### Code Review

- 👀 Request reviews per phase, not at the end
- 🧪 Include test results in PR
- 📊 Share metrics and comparisons
- 🎯 Focus on architecture adherence

### Knowledge Sharing

- 🎓 Host walkthrough session after completion
- 📖 Update team documentation
- 🗣️ Share lessons learned
- 🔁 Use this pattern for other pages

---

## 🎉 Expected Outcomes

After completing this refactoring:

✅ **Developers will have**:
- Clear, understandable code structure
- Easy-to-test components and hooks
- Reusable patterns for other pages
- Confidence to make changes

✅ **The codebase will have**:
- Better organization and structure
- Higher test coverage
- Improved maintainability
- Reduced technical debt

✅ **The product will have**:
- More stable profile page
- Faster feature development
- Fewer bugs in production
- Better user experience

---

## 📞 Support & Questions

**Need Help?**
- Re-read the relevant documentation section
- Check the migration guide for common pitfalls
- Review code examples in the architecture doc
- Ask team members who've done similar refactoring

**Found an Issue?**
- Document the problem
- Check if it's in common pitfalls
- Try the suggested solution
- Update docs if you find a new pitfall

**Have Improvements?**
- Document your findings
- Share with the team
- Update this guide
- Help improve the pattern

---

**Good luck with the refactoring! 🚀**

Remember: This is a journey, not a sprint. Take it one phase at a time, test thoroughly, and don't hesitate to ask for help.