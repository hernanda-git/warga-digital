# Warga Digital - Documentation Index

Welcome to the Warga Digital documentation. This index provides a structured overview of all project documentation, organized by topic.

---

## 📁 Documentation Structure

```
docs/
├── INDEX.md                          ← You are here
├── DESIGN/                           ← Design system documentation
│   ├── index.md                      - Design system overview
│   ├── COLORS.md                     - Color palette & CSS variables
│   ├── TYPOGRAPHY.md                 - Font families & text styles
│   ├── COMPONENTS.md                 - UI components reference
│   ├── LAYOUT.md                     - Spacing & layout tokens
│   └── BEST_PRACTICES.md              - Usage guidelines
├── theme-system/                     ← Theme & color system documentation
├── versioning/                       ← Versioning & release management
└── features/                         ← Feature implementation guides
```

---

## 🎨 Design System

Comprehensive design system documentation for consistent UI across the app.

| File | Purpose | Best For |
|------|---------|----------|
| [DESIGN/index.md](DESIGN/index.md) | Complete design system overview | First-time readers |
| [DESIGN/COLORS.md](DESIGN/COLORS.md) | Color palette & CSS variables | Developers & reference |
| [DESIGN/TYPOGRAPHY.md](DESIGN/TYPOGRAPHY.md) | Font families & text styles | Designers & developers |
| [DESIGN/COMPONENTS.md](DESIGN/COMPONENTS.md) | UI components reference | Developers |
| [DESIGN/LAYOUT.md](DESIGN/LAYOUT.md) | Spacing & layout tokens | Developers |
| [DESIGN/BEST_PRACTICES.md](DESIGN/BEST_PRACTICES.md) | Usage guidelines | All team members |

### Quick Navigation by Role

- **Developers**: Read [DESIGN/COMPONENTS.md](DESIGN/COMPONENTS.md) for UI components
- **Designers**: See [DESIGN/COLORS.md](DESIGN/COLORS.md) for color values
- **All**: Start with [DESIGN/index.md](DESIGN/index.md)

---

## 🎨 Theme System

Documentation for the 15-theme color palette system, including design decisions, specifications, and deployment guides.

| File | Purpose | Best For |
|------|---------|----------|
| [THEME_DOCUMENTATION_INDEX.md](theme-system/THEME_DOCUMENTATION_INDEX.md) | Complete theme docs overview | First-time readers |
| [ACHIEVEMENT_SUMMARY.md](theme-system/ACHIEVEMENT_SUMMARY.md) | Expansion overview & impact | Executives & stakeholders |
| [COLOR_SPECTRUM_ANALYSIS.md](theme-system/COLOR_SPECTRUM_ANALYSIS.md) | Before/after color analysis | Designers & planners |
| [THEME_COLORS.md](theme-system/THEME_COLORS.md) | Complete theme specifications | Developers & reference |
| [THEMES_QUICK_REFERENCE.md](theme-system/THEMES_QUICK_REFERENCE.md) | Quick lookup & code examples | Developers |
| [THEME_EXPANSION_SUMMARY.md](theme-system/THEME_EXPANSION_SUMMARY.md) | Technical implementation details | Technical teams |
| [DEPLOYMENT_CHECKLIST.md](theme-system/DEPLOYMENT_CHECKLIST.md) | Pre-deployment verification | DevOps & QA |

### Quick Navigation by Role

- **Product Managers**: Start with [ACHIEVEMENT_SUMMARY.md](theme-system/ACHIEVEMENT_SUMMARY.md)
- **Designers**: Read [COLOR_SPECTRUM_ANALYSIS.md](theme-system/COLOR_SPECTRUM_ANALYSIS.md)
- **Developers**: Use [THEMES_QUICK_REFERENCE.md](theme-system/THEMES_QUICK_REFERENCE.md)
- **DevOps/QA**: Follow [DEPLOYMENT_CHECKLIST.md](theme-system/DEPLOYMENT_CHECKLIST.md)

---

## 📦 Versioning System

Semantic versioning and changelog management system following SemVer 2.0.0 and Keep a Changelog standards.

| File | Purpose | Best For |
|------|---------|----------|
| [START_HERE_VERSIONING.md](versioning/START_HERE_VERSIONING.md) | Quick start guide | Everyone |
| [VERSIONING_QUICK_REFERENCE.md](versioning/VERSIONING_QUICK_REFERENCE.md) | Commands & FAQ | Daily reference |
| [VERSIONING.md](versioning/VERSIONING.md) | Complete versioning guide | Comprehensive understanding |
| [VERSIONING_SETUP.md](versioning/VERSIONING_SETUP.md) | Implementation details | Technical teams |
| [IMPLEMENTATION_SUMMARY_VERSIONING.md](versioning/IMPLEMENTATION_SUMMARY_VERSIONING.md) | System overview | Project leads |
| [VERSION_SYSTEM_CHECKLIST.md](versioning/VERSION_SYSTEM_CHECKLIST.md) | Verification checklist | QA & validation |
| [README_VERSIONING.txt](versioning/README_VERSIONING.txt) | Plain text summary | Quick reference |

### Quick Start

```bash
# Check current version
npm run version:info

# Bump version
npm run version:patch    # Bug fixes
npm run version:minor    # New features
npm run version:major    # Breaking changes
```

### Reading Order

1. [START_HERE_VERSIONING.md](versioning/START_HERE_VERSIONING.md) (2 min)
2. [VERSIONING_QUICK_REFERENCE.md](versioning/VERSIONING_QUICK_REFERENCE.md) (5 min)
3. [VERSIONING.md](versioning/VERSIONING.md) (20 min)

---

## 🚀 Features

Implementation guides and user documentation for project features.

| File | Purpose | Best For |
|------|---------|----------|
| [kas_rt_transactions_guide.md](features/kas_rt_transactions_guide.md) | Kas-RT transactions table documentation | Developers & DBAs |
| [KAS_RT_NOTIFICATIONS_IMPLEMENTATION.md](features/KAS_RT_NOTIFICATIONS_IMPLEMENTATION.md) | Kas-RT notifications system | Developers |
| [KAS_RT_NOTIFICATIONS_QUICK_REFERENCE.md](features/KAS_RT_NOTIFICATIONS_QUICK_REFERENCE.md) | Quick reference for notifications | Developers & QA |
| [PROFILE_EDIT_USER_GUIDE.md](features/PROFILE_EDIT_USER_GUIDE.md) | Profile edit feature guide | Users & support |

### Kas-RT Transactions

Comprehensive documentation for the `kas_rt_transactions` financial ledger table:

- Schema definition & constraints
- Import workflows & idempotency
- Data format standards (Indonesian localization)
- RLS & security policies
- Migration & maintenance scripts

**Start here**: [kas_rt_transactions_guide.md](features/kas_rt_transactions_guide.md)



### Kas-RT Notifications

Comprehensive notification system for community treasury management:

- Transaction edit/delete notifications
- Category management notifications
- Role-based notification routing
- Deduplication and error handling

**Start here**: [KAS_RT_NOTIFICATIONS_IMPLEMENTATION.md](features/KAS_RT_NOTIFICATIONS_IMPLEMENTATION.md)

### Profile Edit

Enhanced profile management with:

- WhatsApp number editing
- Real-time availability checking
- Profile picture management
- Username validation

**Start here**: [PROFILE_EDIT_USER_GUIDE.md](features/PROFILE_EDIT_USER_GUIDE.md)

---

## 📋 Root Documentation

These files remain in the project root for visibility and standard conventions:

| File | Purpose |
|------|---------|
| [README.md](../README.md) | Project overview and getting started |
| [CHANGELOG.md](../CHANGELOG.md) | Change history (Keep a Changelog format) |
| [VERSION](../VERSION) | Current version number |

---

## 🔗 External References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

## 📞 Need Help?

1. **Quick answers**: Check the quick reference files in each category
2. **Detailed information**: Read the complete guides
3. **Current status**: Run `npm run version:info` for versioning, check `CHANGELOG.md` for recent changes
4. **Project overview**: See [README.md](../README.md)

---

**Last Updated**: 2025  
**Project**: Warga Digital  
**Status**: Active Development