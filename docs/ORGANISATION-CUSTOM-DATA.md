# Organisation Member Customs - Implementation Guide

## Overview
This feature allows organization administrators to set **custom display data** (name, profile picture, WhatsApp number) for organization positions, separate from the actual user's data.

## What Was Changed

### 1. Database Migration
**File:** `supabase/migrations/20260422000000_create_organisation_member_customs.sql`

Creates a new table `organisation_member_customs` with:
- 1:1 relationship with `organisation_members`
- Custom fields: `custom_full_name`, `custom_block_name`, `custom_whatsapp_number`, `custom_profile_picture_url`
- Row Level Security (RLS) policies matching `organisation_members`

### 2. Type Definitions
**File:** `src/lib/organisation-api.ts`

Added:
- `OrganisationMemberCustomData` interface
- Optional `custom` field to `OrganisationMemberApi`

### 3. API Endpoints

#### GET `/api/organisation`
- Now fetches and merges custom data from `organisation_member_customs`
- Custom data takes precedence over user's actual data

#### POST `/api/organisation/roles/[id]/members`
- Accepts optional `custom` object in request body
- Creates custom record if provided

#### PATCH `/api/organisation/members/[id]`
- Accepts optional `custom` object in request body
- Upserts custom data (creates or updates)
- Deletes custom data if switching from custom to user data

### 4. Frontend - Manage Page
**File:** `src/app/organisasi/manage/page.tsx`

Added:
- Custom data toggle checkbox: "Gunakan Data Custom"
- Form fields for:
  - Custom full name
  - Custom block/area
  - Custom WhatsApp number
  - Custom profile picture URL
- State management for custom data
- Auto-populate from user data when editing

## How to Deploy

### Step 1: Run Database Migrations

Run both migration SQL files in your Supabase Dashboard:

**Migration 1: Custom Data Table**
1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy and paste the contents of `supabase/migrations/20260422000000_create_organisation_member_customs.sql`
3. Click "Run"
4. **Expected**: Table created with RLS policies

**Migration 2: Avatars Storage Bucket**
1. Open a new SQL query in Supabase Dashboard
2. Copy and paste the contents of `supabase/migrations/20260422000001_avatars_storage_bucket.sql`
3. Click "Run"
4. **Expected**: Storage bucket created with policies (no errors)

Alternatively, if using Supabase CLI:
```bash
supabase db push
```

### Step 2: Verify Installation

Run the test script to verify everything is set up correctly:

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy and paste the contents of `supabase/migrations/test-organisation-custom-data.sql`
3. Click "Run"
4. **Expected Results**:
   - `organisation_member_customs table exists`: result = 1
   - `avatars bucket exists`: result = 1
   - `organisation_member_customs policies`: 3 policies listed
   - `avatars storage policies`: 4 policies listed

### Step 2: Deploy Code Changes

Push your changes to trigger Vercel deployment (or deploy manually):
```bash
git add .
git commit -m "feat: add custom data support for organisation members"
git push
```

## Usage Instructions

### For Administrators

1. Go to **Organisasi** page
2. Click **Manage** (edit icon)
3. Click **Tambah Anggota** or edit an existing member
4. Select a user from the dropdown (or leave as "Vacant")
5. Check the **"Gunakan Data Custom"** checkbox
6. Fill in the custom fields:
   - **Nama Lengkap**: Custom display name
   - **Blok / Area**: Custom block or area name
   - **Nomor WhatsApp**: Custom WhatsApp number (format: 628...)
   - **Foto Profil**: Upload image file (JPG/PNG, max 5MB)
7. Click **Tambah Anggota** or **Simpan Perubahan**

### Use Cases

1. **External Contributors**: Add people who aren't registered users (e.g., community partners)
2. **Role-based Display**: Show position title instead of personal name
3. **Temporary Assignments**: Use generic contact info for rotating positions
4. **Privacy Protection**: Hide personal details while maintaining contactability

### Behavior

- **With Custom Data**: Display uses custom fields, WhatsApp link uses custom number
- **Without Custom Data**: Display uses user's actual data from `users` table
- **Vacant Position**: Can have custom data (shows as "Posisi Kosong" with custom contact)
- **Switching Users**: Custom data persists unless manually changed or disabled

## Data Structure

### Custom Data Object
```typescript
{
  fullName: string;          // Display name
  blockName: string;         // Block/area name
  whatsappNumber: string;    // WhatsApp number (628...)
  profilePictureUrl: string | null;  // Image URL
}
```

### API Request Body
```json
{
  "userId": "user-uuid-or-null",
  "custom": {
    "fullName": "Custom Name",
    "blockName": "Blok X",
    "whatsappNumber": "6281234567890",
    "profilePictureUrl": "https://example.com/avatar.jpg"
  }
}
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Can add new member with custom data
- [ ] Can edit member to add custom data
- [ ] Can edit member to remove custom data (uncheck toggle)
- [ ] Can create vacant position with custom data
- [ ] Organisation page displays custom data correctly
- [ ] WhatsApp link uses custom number when available
- [ ] Profile picture shows custom image when available
- [ ] Custom data persists after page reload
- [ ] Deleting member also deletes custom data (cascade)

## Notes

- Custom data is stored separately from user data
- Original user link is preserved even with custom data
- Custom profile picture URL should be publicly accessible
- RLS ensures only authorized users can view/edit custom data
- Notifications use custom name when available

## Rollback

If you need to revert:

1. Drop the table:
```sql
DROP TABLE IF EXISTS organisation_member_customs CASCADE;
```

2. Revert code changes in git
