# Landing Page Architecture Diagrams

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LANDING PAGE                                │
│                      (React Component)                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ uses
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐    ┌──────────────┐
│ Profile Hook │     │Marketplace   │    │Announcements │
│              │     │    Hook      │    │    Hook      │
└──────┬───────┘     └──────┬───────┘    └──────┬───────┘
       │                    │                    │
       │ calls              │ calls              │ calls
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────┐
│              API SERVICE LAYER                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │fetchProfile│  │fetchMarket │  │fetchAnnoun │     │
│  └────────────┘  └────────────┘  └────────────┘     │
└────────────────────┬─────────────────────────────────┘
                     │
                     │ uses
                     │
                     ▼
            ┌────────────────┐
            │   apiFetch     │
            │ (API Client)   │
            └────────────────┘
                     │
                     │ HTTP
                     │
                     ▼
            ┌────────────────┐
            │  Backend API   │
            └────────────────┘
```

## 2. Component Hierarchy

```
LandingPage
│
├── LandingHeader
│   ├── Avatar
│   └── BellIcon (notification)
│
├── FeatureGrid
│   └── Feature Cards (9 items)
│       ├── Administrasi
│       ├── Kas RT
│       ├── IPL
│       ├── Jual Beli
│       ├── Jasa
│       ├── Event
│       ├── Organisasi
│       ├── Informasi
│       └── Emergency
│
├── LandingSection (Info Warga)
│   ├── ResidentPostsSection
│   │   └── PostCard[]
│   └── EmptyState (conditional)
│
├── LandingSection (UMKM)
│   ├── HorizontalCardStrip
│   │   └── Card[]
│   └── EmptyState (conditional)
│
└── LandingSection (JASA)
    ├── HorizontalCardStrip
    │   └── Card[]
    └── EmptyState (conditional)
```

## 3. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │LandingHeader │  │FeatureGrid   │  │CardStrip     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ receives data
                          │
┌─────────────────────────────────────────────────────────────┐
│                      STATE LAYER (Hooks)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useProfileData()                                    │   │
│  │  • headerProfile: HeaderProfile                      │   │
│  │  • walletBalance: string                             │   │
│  │  • isReady: boolean                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useMarketplaceData()                                │   │
│  │  • umkmItems: HorizontalCardItem[]                   │   │
│  │  • jasaItems: HorizontalCardItem[]                   │   │
│  │  • isLoaded: boolean                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useAnnouncementsData()                              │   │
│  │  • items: ResidentPostItem[]                         │   │
│  │  • isLoaded: boolean                                 │   │
│  │  • hasContent: boolean                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ calls
                          │
┌─────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  fetchProfile(): ApiResult<ProfileApiResponse>      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  fetchMarketplace(): ApiResult<MarketplaceResponse>  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  fetchAnnouncements(): ApiResult<AnnouncementResp>   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ transforms
                          │
┌─────────────────────────────────────────────────────────────┐
│                   TRANSFORMATION LAYER                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  transformProfileToHeader()                          │   │
│  │  extractWalletBalance()                              │   │
│  │  extractCommunityInfo()                              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  transformCategoriesToCards()                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  transformAnnouncementsToPosts()                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ uses
                          │
┌─────────────────────────────────────────────────────────────┐
│                      UTILITY LAYER                           │
│  • formatRupiah()                                            │
│  • buildBlokLabel()                                          │
│  • Cookie Service (saveToCookies, clearCookies)              │
│  • Validation Helpers (isValidProfile, hasContent)           │
└──────────────────────────────────────────────────────────────┘
```

## 4. File Dependency Graph

```
page.tsx
  │
  ├──> useProfileData
  │      ├──> fetchProfile (api.service)
  │      │      └──> apiFetch
  │      ├──> transformProfileToHeader (transformers)
  │      ├──> extractWalletBalance (transformers)
  │      ├──> extractCommunityInfo (transformers)
  │      └──> updateCommunityCookies (cookie.service)
  │
  ├──> useMarketplaceData
  │      ├──> fetchMarketplaceSummary (api.service)
  │      │      └──> apiFetch
  │      └──> transformCategoriesToCards (transformers)
  │
  ├──> useAnnouncementsData
  │      ├──> fetchAnnouncements (api.service)
  │      │      └──> apiFetch
  │      └──> transformAnnouncementsToPosts (transformers)
  │
  ├──> LandingHeader (component)
  ├──> FeatureGrid (component)
  ├──> LandingSection (component)
  ├──> HorizontalCardStrip (component)
  ├──> ResidentPostsSection (component)
  ├──> EmptyState (component)
  │
  └──> ROUTES, MARKETPLACE_SECTIONS, EMPTY_STATE_CONFIGS (config)
```

## 5. State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION                            │
│              (AuthStore - Zustand)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ isAuthenticated = true
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               LANDING PAGE MOUNTS                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐   ┌──────────┐
    │ Profile  │    │Marketplace│   │Announce  │
    │  Hook    │    │  Hook    │   │   Hook   │
    └────┬─────┘    └────┬─────┘   └────┬─────┘
         │               │               │
         │ setState      │ setState      │ setState
         │               │               │
         ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐   ┌──────────┐
    │isLoading │    │isLoading │   │isLoading │
    │  = true  │    │  = true  │   │  = true  │
    └────┬─────┘    └────┬─────┘   └────┬─────┘
         │               │               │
         │ API call      │ API call      │ API call
         │               │               │
         ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐   ┌──────────┐
    │Response  │    │Response  │   │Response  │
    │Received  │    │Received  │   │Received  │
    └────┬─────┘    └────┬─────┘   └────┬─────┘
         │               │               │
         │ transform     │ transform     │ transform
         │               │               │
         ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐   ┌──────────┐
    │ Update   │    │ Update   │   │ Update   │
    │  State   │    │  State   │   │  State   │
    └────┬─────┘    └────┬─────┘   └────┬─────┘
         │               │               │
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │   RE-RENDER      │
              │  (React updates  │
              │   components)    │
              └──────────────────┘
```

## 6. Before vs After Architecture

### BEFORE (Monolithic)

```
┌─────────────────────────────────────────────────────────┐
│                  page.tsx (380 lines)                    │
│                                                          │
│  • useState (multiple states)                            │
│  • useEffect (profile fetch)                             │
│  • useEffect (marketplace fetch)                         │
│  • useEffect (announcements fetch)                       │
│  • buildBlokLabel()                                      │
│  • buildMarketplaceItems()                               │
│  • mapAnnouncement()                                     │
│  • Cookie management (inline)                            │
│  • Error handling (inline)                               │
│  • JSX rendering (complex)                               │
│  • Duplicate empty states                                │
│                                                          │
│  ❌ Everything in one place                              │
│  ❌ Hard to test                                         │
│  ❌ Code duplication                                     │
│  ❌ Tight coupling                                       │
└─────────────────────────────────────────────────────────┘
```

### AFTER (Modular)

```
┌─────────────────────────────────────────────────────────┐
│              page.tsx (172 lines)                        │
│                                                          │
│  • useProfileData()        ─────────┐                   │
│  • useMarketplaceData()    ─────────┼─────┐             │
│  • useAnnouncementsData()  ─────────┼─────┼───┐         │
│  • JSX composition (simple)         │     │   │         │
│                                     │     │   │         │
│  ✅ Clean & focused                 │     │   │         │
│  ✅ Easy to understand              │     │   │         │
└─────────────────────────────────────┼─────┼───┼─────────┘
                                      │     │   │
                    ┌─────────────────┘     │   │
                    │         ┌─────────────┘   │
                    │         │         ┌───────┘
                    ▼         ▼         ▼
          ┌──────────────────────────────────────┐
          │         CUSTOM HOOKS                 │
          │  • State management                  │
          │  • Data fetching coordination        │
          │  • Loading/error states              │
          │                                      │
          │  ✅ Reusable                         │
          │  ✅ Testable                         │
          └──────────┬───────────────────────────┘
                     │
                     ▼
          ┌──────────────────────────────────────┐
          │       SERVICE LAYER                  │
          │  • API calls                         │
          │  • Error handling                    │
          │  • Result types                      │
          │                                      │
          │  ✅ Single responsibility            │
          │  ✅ Easy to mock                     │
          └──────────┬───────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐   ┌─────────────────┐
│  TRANSFORMERS   │   │ COOKIE SERVICE  │
│  • Pure funcs   │   │  • Cookie ops   │
│  • Business     │   │  • Abstraction  │
│    logic        │   │                 │
│                 │   │  ✅ Isolated    │
│  ✅ Testable    │   │  ✅ Reusable    │
└─────────────────┘   └─────────────────┘
```

## 7. SOLID Principles Mapping

```
┌──────────────────────────────────────────────────────────────┐
│  S - SINGLE RESPONSIBILITY PRINCIPLE                         │
├──────────────────────────────────────────────────────────────┤
│  ✓ api.service.ts       → API calls only                    │
│  ✓ transformers.ts      → Data transformation only          │
│  ✓ cookie.service.ts    → Cookie management only            │
│  ✓ useProfileData.ts    → Profile state only                │
│  ✓ EmptyState.tsx       → Empty state rendering only        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  O - OPEN/CLOSED PRINCIPLE                                   │
├──────────────────────────────────────────────────────────────┤
│  ✓ MARKETPLACE_SECTIONS → Easy to add new sections          │
│  ✓ EmptyState variants  → Add new variants without change   │
│  ✓ Transformer functions→ Add new transformers easily        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  L - LISKOV SUBSTITUTION PRINCIPLE                           │
├──────────────────────────────────────────────────────────────┤
│  ✓ All hooks return consistent shapes                       │
│  ✓ EmptyState works anywhere                                │
│  ✓ LandingSection wraps any content                         │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  I - INTERFACE SEGREGATION PRINCIPLE                         │
├──────────────────────────────────────────────────────────────┤
│  ✓ Hooks return only what's needed                          │
│  ✓ Components accept minimal props                          │
│  ✓ No forced dependencies                                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  D - DEPENDENCY INVERSION PRINCIPLE                          │
├──────────────────────────────────────────────────────────────┤
│  ✓ Hooks depend on services (abstraction)                   │
│  ✓ Services depend on apiFetch (abstraction)                │
│  ✓ Components depend on hooks (abstraction)                 │
│  ✓ Not on concrete implementations                          │
└──────────────────────────────────────────────────────────────┘
```

## 8. Error Handling Flow

```
API Call
   │
   ├── Success ────────┐
   │                   ▼
   │         ┌──────────────────┐
   │         │ { success: true, │
   │         │   data: T }      │
   │         └────────┬─────────┘
   │                  │
   │                  ▼
   │         ┌──────────────────┐
   │         │  Transform data  │
   │         └────────┬─────────┘
   │                  │
   │                  ▼
   │         ┌──────────────────┐
   │         │  Update state    │
   │         │  setData(data)   │
   │         │  setLoading(false)│
   │         └──────────────────┘
   │
   └── Failure ───────┐
                      ▼
            ┌──────────────────┐
            │ { success: false,│
            │   error: string }│
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │  Update state    │
            │  setError(error) │
            │  setLoading(false)│
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ Show error UI or │
            │ keep cached data │
            └──────────────────┘
```

## 9. Type Flow Diagram

```
API Response Types          UI Model Types
(from backend)              (for components)
       │                           ▲
       │                           │
       ▼                           │
┌────────────────┐          ┌────────────────┐
│ProfileApiResp  │──trans──>│ HeaderProfile  │
└────────────────┘          └────────────────┘

┌────────────────┐          ┌────────────────┐
│MarketplaceCat  │──trans──>│HorizontalCard  │
│   Summary      │          │     Item       │
└────────────────┘          └────────────────┘

┌────────────────┐          ┌────────────────┐
│AnnouncementApi │──trans──>│ResidentPostItem│
└────────────────┘          └────────────────┘

        │                           ▲
        │      Transformers         │
        └───────────────────────────┘
         (Anti-corruption layer)
```

## 10. Testing Strategy

```
┌─────────────────────────────────────────────────────────┐
│                   UNIT TESTS                            │
├─────────────────────────────────────────────────────────┤
│  Transformers (Pure Functions)                          │
│  ├─ buildBlokLabel()              ✓ Easy               │
│  ├─ transformProfileToHeader()    ✓ Easy               │
│  ├─ transformCategoriesToCards()  ✓ Easy               │
│  └─ transformAnnouncementsToPosts() ✓ Easy             │
│                                                         │
│  Services (Mock apiFetch)                               │
│  ├─ fetchProfile()                ✓ Medium             │
│  ├─ fetchMarketplaceSummary()     ✓ Medium             │
│  └─ fetchAnnouncements()          ✓ Medium             │
│                                                         │
│  Cookie Service                                         │
│  ├─ saveCommunityToCookies()      ✓ Medium             │
│  └─ clearCommunityCookies()       ✓ Medium             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                INTEGRATION TESTS                        │
├─────────────────────────────────────────────────────────┤
│  Custom Hooks (Mock services)                           │
│  ├─ useProfileData()              ✓ Medium             │
│  ├─ useMarketplaceData()          ✓ Medium             │
│  └─ useAnnouncementsData()        ✓ Medium             │
│                                                         │
│  Components (Mock data)                                 │
│  ├─ EmptyState                    ✓ Easy               │
│  ├─ LandingSection                ✓ Easy               │
│  └─ LandingHeader                 ✓ Easy               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   E2E TESTS                             │
├─────────────────────────────────────────────────────────┤
│  Full Page (Real API or mocked backend)                 │
│  ├─ Page loads correctly          ✓ Hard               │
│  ├─ Shows loading states           ✓ Hard               │
│  ├─ Displays data when loaded      ✓ Hard               │
│  └─ Shows empty states             ✓ Hard               │
└─────────────────────────────────────────────────────────┘
```

---

**Legend:**
- `─>` : Data flow direction
- `│` : Vertical connection
- `├─` : Branch connection
- `└─` : End branch
- `▼` : Downward flow
- `✓` : Implemented/Applied
- `❌` : Problem/Issue
- `✅` : Solution/Benefit