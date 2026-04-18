# Articles CMS - Low Priority Features Backlog

**Created:** 2026-04-18  
**Status:** Backlog (Not Implemented)

---

## Overview

This document tracks low-priority features and enhancements for the Articles CMS. These items are not critical for launch but can be implemented in future iterations to improve user experience and engagement.

---

## 🔵 LOW PRIORITY FEATURES

### 16. Bookmark/Save Feature
**Description:** Allow users to save articles for later reading

**Requirements:**
- [ ] Create `user_bookmarks` table (user_id, article_id, created_at)
- [ ] Add bookmark button on article cards and detail page
- [ ] Create "Saved Articles" page for authenticated users
- [ ] Add bookmark count display on articles

**Estimated Effort:** 1-2 days

---

### 17. Newsletter Integration
**Description:** Email notifications when new articles are published

**Requirements:**
- [ ] Create `newsletter_subscriptions` table (email, subscribed_at, confirmed)
- [ ] Add subscription form component (landing page, article sidebar)
- [ ] Implement double opt-in flow
- [ ] Create email template for new article notifications
- [ ] Add cron job to send digest emails (daily/weekly)
- [ ] Integrate with email service (Resend, SendGrid, etc.)

**Estimated Effort:** 2-3 days

---

### 18. Search Functionality
**Description:** Site-wide search including articles

**Requirements:**
- [ ] Create search API endpoint with full-text search
- [ ] Add search bar component (header, article index)
- [ ] Implement search results page
- [ ] Add search filters (date, category, author)
- [ ] Consider integrating Algolia/Meilisearch for better search

**Estimated Effort:** 2-3 days

---

### 19. Category/Tag System
**Description:** Organize articles by topics

**Requirements:**
- [ ] Create `categories` table (id, name, slug, description, parent_id)
- [ ] Create `article_categories` join table
- [ ] Add category selection in admin compose page
- [ ] Create category archive pages (`/artikel/kategori/[slug]`)
- [ ] Add category badges on article cards
- [ ] Implement hierarchical categories (optional)

**Estimated Effort:** 2-3 days

---

### 20. RSS Feed
**Description:** XML feed for article syndication

**Requirements:**
- [ ] Create `/feed.xml` route handler
- [ ] Generate valid RSS 2.0 XML
- [ ] Include latest 20 published articles
- [ ] Add full content or excerpt option
- [ ] Include featured image in enclosure
- [ ] Add `sitemap.xml` for articles (related)

**Estimated Effort:** 0.5-1 day

---

## 📋 IMPLEMENTATION NOTES

### Priority Order (When Resources Allow)
1. **RSS Feed** - Quick win, standard expectation
2. **Category/Tag System** - Important for content organization
3. **Search Functionality** - Improves content discoverability
4. **Newsletter Integration** - User retention feature
5. **Bookmark Feature** - Nice-to-have engagement feature

### Dependencies
- Category system should be implemented before search (for filters)
- Newsletter requires working email infrastructure
- Bookmark requires user authentication (already exists)

### Technical Considerations
- RSS feed should be cached (regenerate every 15-30 min)
- Search may need external service for scale (Algolia free tier)
- Categories should support soft-delete
- Newsletter emails should use queue system for bulk sends

---

## Future Enhancements (Beyond Low Priority)

### Analytics Dashboard
- Article view statistics
- Popular articles ranking
- Reader engagement metrics
- Traffic sources

### Multi-language Support
- Article translations
- Language selector
- i18n routing

### Advanced Features
- Audio article (text-to-speech)
- Print-friendly view
- Dark mode for reading
- Font size adjustment
- Reading progress indicator

### Monetization
- Premium/paid articles
- Donation integration
- Ad placement system

---

**Last Updated:** 2026-04-18
