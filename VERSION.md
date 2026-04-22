# Warga Digital - Version Information

## Current Version: 1.0.0

### Release Information
- **Version:** 1.0.0
- **Release Date:** 2026-04-22
- **Codename:** Production Ready
- **Status:** Stable

### Project Details
- **Name:** Warga Digital
- **Description:** Digital community management platform for RT/RW organizations
- **License:** Proprietary
- **Private:** Yes

### Technology Stack
- **Framework:** Next.js 15.5.15
- **React:** 18.3.1
- **TypeScript:** 5.x
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS 3.4.14
- **UI Components:** NextUI 2.4.8
- **State Management:** Zustand 5.0.2
- **Charts:** Recharts 2.10.4
- **Animations:** Framer Motion 11.15.0

### Key Features
- Community Management (RT/RW)
- Jasa Services Marketplace
- UMKM Marketplace
- Digital Wallet (Dompet)
- Community Fund (Kas RT)
- Article/CMS System
- Organization Management
- User Profiles & Authentication
- Family Management
- Notifications
- Admin Dashboard

### Version Scripts
```bash
# Bump version
npm run version:major    # 1.0.0 → 2.0.0
npm run version:minor    # 1.0.0 → 1.1.0
npm run version:patch    # 1.0.0 → 1.0.1

# Prepare release
npm run version:prepare  # Generate release notes

# Show version info
npm run version:info
```

### Build & Deploy
```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

### Database Migrations
All migrations are located in `supabase/migrations/` and should be run in Supabase Dashboard SQL Editor in chronological order.

**Latest Migration:** `20260422042042_fix_owner_data_integrity.sql`

### Environment Variables
Required for production:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

### Documentation
- `CHANGELOG.md` - Version history and changes
- `docs/` - Technical documentation
- `supabase/migrations/README_MIGRATION.md` - Database migration guide

### Support
For issues or questions, please refer to the documentation or contact the development team.

---

**Last Updated:** 2026-04-22  
**Maintained By:** Warga Digital Development Team
