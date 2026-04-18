# Articles CMS - Implementation Plan

**Created:** 2026-04-18  
**Status:** In Progress

---

## 🎯 Implementation Phases

### Phase 1: Foundation (CRITICAL) - ✅ IN PROGRESS
**Goal:** Make articles publicly accessible

**Tasks:**
1. ✅ Create public article detail page (`/artikel/[slug]`)
2. ✅ Create public article list page (`/artikel`)
3. ✅ Create public API endpoint (unauthenticated, published only)
4. ✅ Fix featured image tracking & cleanup
5. ✅ Add admin role check to admin pages

**Files to Create/Modify:**
- `src/app/artikel/page.tsx` (NEW)
- `src/app/artikel/[slug]/page.tsx` (NEW)
- `src/app/api/artikel/[slug]/route.ts` (NEW)
- `src/app/api/cms/articles/[articleId]/route.ts` (MODIFY - cleanup)
- `src/app/admin/articles/page.tsx` (MODIFY - admin check)

---

### Phase 2: Security & Polish (HIGH PRIORITY)
**Goal:** Secure admin access and improve UX

**Tasks:**
1. ✅ Implement image cleanup on deletion
2. ✅ Add SEO metadata (OG tags, Twitter Cards)
3. ✅ Add author attribution
4. ✅ Configure image optimization for public URLs
5. ✅ Add reading time estimate

**Files to Create/Modify:**
- `src/app/api/cms/articles/[articleId]/route.ts` (MODIFY - delete images)
- `src/app/artikel/[slug]/page.tsx` (MODIFY - metadata, author)
- `src/lib/articles.ts` (NEW - utilities)
- `src/components/articles/AuthorByline.tsx` (NEW)
- `src/components/articles/ReadingTime.tsx` (NEW)
- `next.config.ts` (MODIFY - remotePatterns)

---

### Phase 3: UX Enhancement (MEDIUM PRIORITY)
**Goal:** Improve article reading experience

**Tasks:**
1. ✅ Add article navigation (prev/next)
2. ✅ Add social sharing buttons
3. ✅ Implement draft preview mode
4. ✅ Add rich text typography styling
5. ✅ Add related articles section

**Files to Create/Modify:**
- `src/app/artikel/[slug]/page.tsx` (MODIFY - navigation, related)
- `src/components/articles/SocialShare.tsx` (NEW)
- `src/components/articles/ArticleNavigation.tsx` (NEW)
- `src/app/api/cms/articles/[articleId]/preview/route.ts` (NEW)
- `src/app/artikel/[slug]/preview/route.ts` (NEW)

---

## 📝 Technical Debt Resolution

### Duplicate Slug Generation
**Solution:** Use database trigger as source of truth, remove client-side generation

**Changes:**
- Keep DB trigger in `20260501000001_create_articles.sql`
- Remove `generateSlug()` from API routes (use DB-generated)
- Keep client-side for UX preview only (label as "preview")

### Error Handling Standardization
**Solution:** Use `sonner` toast everywhere

**Changes:**
- Replace all `alert()` with `toast.error()`
- Create error handler utility function
- Standardize error response format

### Caching Strategy
**Solution:** Implement ISR + CDN caching

**Changes:**
- Add `revalidate` to public pages (300 seconds)
- Add cache headers to public API
- Consider Redis for query caching (future)

---

## ✅ Completion Checklist

### Phase 1 (Critical)
- [x] Low priority backlog documented
- [ ] Public article list page created
- [ ] Public article detail page created
- [ ] Public API endpoint working
- [ ] Featured image cleanup implemented
- [ ] Admin role verification added

### Phase 2 (High)
- [ ] Image cleanup on article deletion
- [ ] SEO metadata on all article pages
- [ ] Author byline component
- [ ] Image optimization configured
- [ ] Reading time calculation

### Phase 3 (Medium)
- [ ] Previous/Next navigation
- [ ] Social sharing buttons
- [ ] Draft preview mode
- [ ] Typography styling (prose)
- [ ] Related articles

### Technical Debt
- [ ] Slug generation deduplicated
- [ ] Error handling standardized
- [ ] Loading states consistent
- [ ] Rate limiting added
- [ ] Caching implemented

---

**Last Updated:** 2026-04-18
