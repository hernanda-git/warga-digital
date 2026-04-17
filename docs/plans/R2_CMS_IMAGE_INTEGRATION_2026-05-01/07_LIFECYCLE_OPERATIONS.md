# Sub-Plan 07: Lifecycle & Cleanup Operations

## Objective

Implement lifecycle management for R2 article images, including replace, delete, and orphan cleanup workflows.

---

## Tasks

### 7.1 Replace Image

- [ ] Upload new image to new object key (immutable-style approach)
- [ ] Update DB reference (`article_images.url`)
- [ ] Queue old object for deletion (optional delayed cleanup via background job)

**Implementation Notes:**
- Never overwrite existing objects; always create new ones
- Use new UUID for each replacement
- Keep old object until new one is confirmed saved

### 7.2 Delete Article (Bulk Image Cleanup)

- [ ] Fetch all related `article_images.object_key` values for the article
- [ ] Bulk delete objects from R2 using admin API
- [ ] Delete DB rows in the same workflow (transaction)
- [ ] Handle partial failures gracefully

**Implementation Notes:**
- Wrap R2 delete + DB delete in a transaction
- Log failures for manual retry/monitoring
- Consider soft-delete pattern for audit purposes

### 7.3 Orphan Cleanup Job

- [ ] Create scheduled job (e.g., cron worker or Supabase pg_cron)
- [ ] Query DB for all `article_images.object_key` values
- [ ] Compare against R2 bucket object keys
- [ ] Identify orphaned objects (exist in R2, not in DB)
- [ ] Delete orphans after grace period (e.g., 7 days)
- [ ] Log cleanup actions for audit

**Implementation Notes:**
- Run during off-peak hours
- Use pagination for large buckets
- Consider marking orphans first before deletion (two-phase)

---

## Dependencies

- Sub-Plan 03 (Upload API Endpoint)
- Sub-Plan 04 (Supabase Schema)

## Status

`PENDING`
