# Kanban Action Plan Lifecycle Workflow

> **Purpose**: Standardize how tasks are planned, broken down, executed, and archived using a Kanban-style directory structure in the Warga Digital project.  
> **Last Updated**: 2026-04-02  
> **Applies To**: All development work tracked via `docs/kanban/`

---

## 🔄 Overview

This workflow ensures that:
1. Raw task inputs are transformed into structured, validated plans
2. Plans are broken down into granular, actionable execution tickets
3. Work progresses through clear status states (`RAW` → `PLAN` → `EXEC` → `DONE`)
4. Versioning is updated to reflect completed work
5. Commits follow conventional commit standards
6. All changes are pushed to the `dev` branch (never directly to `main`)

---

## 📁 Directory Structure

```
docs/
└── kanban/
    ├── task/                   # Raw input (.txt)
    │   └── 20231027-001_RAW_idea.txt
    ├── outstanding/            # Structured plans (.md)
    │   └── 20231027-001_PLAN_idea.md
    ├── inprogress/             # Execution tickets (.md)
    │   └── 20231027-001_EXEC_01_setup.md
    └── archive/                # Completed work (optional cleanup)
        ├── task/
        ├── outstanding/
        └── execution/
```

---

## 📋 Phase 1: Planning (Raw Input → Structured Plan)

### Step 1.1: Create Structured Plan
1. Read files in `docs/kanban/task/`.
2. Extract or generate ID: `{YYYYMMDD}-{SEQ}` (e.g., `20231027-001`).
3. Transform raw text into a structured Markdown plan.
4. Save as `docs/kanban/outstanding/{ID}_PLAN_{slug}.md`.
5. Include header: `Source: [[../task/{filename}]] | Status: READY_FOR_EXECUTION`.

### Step 1.2: Review & Validate Plan
Ensure the new file contains:
- [ ] **Source Fidelity**: Accurately reflects raw intent without hallucination.
- [ ] **Deliverable Point**: Specific tangible outputs required to close the task.
- [ ] **Expectations Point**: Acceptance criteria and quality standards.
- [ ] **Awareness Point**: Risks, dependencies, legacy concerns, or API limits.
- [ ] **Scope Boundary**: Explicitly state what is OUT of scope.
- [ ] **Resource Check**: Needed credentials, permissions, or tools.
- [ ] **Clarification Flag**: "Questions" section if raw text was ambiguous.

### Step 1.3: Mark Task as Processed
- Rename original `.txt`: `{original_name}.txt` → `{ID}_PROC_{slug}.txt`.
- Append reference at bottom: `-> Plan: ../outstanding/{ID}_PLAN_{slug}.md`.

### Step 1.4: Finalize Planning Phase
- [x] Plan file created in `outstanding/`.
- [x] Plan validated against checklist.
- [x] Original task renamed and linked.
- Update plan header: `Status: READY_FOR_EXECUTION`.

---

## 🛠️ Phase 2: Execution Breakdown (Plan → Actionable Tickets)

### Step 2.1: Select Oldest Outstanding Plan
- Filter `outstanding/` for `_PLAN_` files or `Status: READY_FOR_EXECUTION`.
- Sort by ID ascending (oldest first).
- Select top file for breakdown.

### Step 2.2: Create Execution Tickets
- Parse "Implementation Steps" or "Deliverables" from parent plan.
- Create individual `.md` files in `docs/kanban/inprogress/`.
- Naming: `{ID}_EXEC_{step_number}_{slug}.md` (e.g., `20231027-001_EXEC_01_setup.md`).
- Header: Include `Parent Plan: ../outstanding/{ID}_PLAN_{slug}.md`.
- Content: Brief title and objective for this specific step.

### Step 2.3: Detail Each Execution Ticket
For each file in `inprogress/`, define:
- [ ] **Deliverable Point**: Specific output for THIS step only.
- [ ] **Expectation Point**: Success criteria for THIS step.
- [ ] **Awareness Point**: Specific risks for THIS step.
- [ ] **Scope**: Boundaries for THIS step.
- [ ] **Resource Check**: Tools needed specifically for this step.
- [ ] **Clarification**: Missing info specific to this sub-task.

### Step 2.4: Mark Plan as Active
- Rename parent file: `{ID}_PLAN_{slug}.md` → `{ID}_ACTIVE_{slug}.md`.
- Update header status: `Status: IN_PROGRESS`.

### Step 2.5: Phase Complete
Workflow phase complete. Files are now ready in `inprogress/` for execution.

---

## ✅ Phase 3: Completion & Archive (Close the Loop)

### Step 3.1: Verify Completed Execution Files
- Filter `inprogress/` for files where work is verified complete.
- Validate output against the "Expectation Point" defined in Step 2.3.

### Step 3.2: Update Checklists Before Archiving
- **For each execution ticket**: Mark all deliverable checkboxes (`- [ ]`) as complete (`- [x]`).
- **For the parent plan**: Mark all deliverable, expectation, and resource checkboxes as complete.
- Verify all findings, reports, or outputs are documented in the ticket files.

### Step 3.3: Mark Execution File as Done
- Rename file: `{ID}_EXEC_{step}_{slug}.md` → `{ID}_DONE_{step}_{slug}.md`.
- Move to `archive/execution/` to keep `inprogress/` clean.
- Append to file content:
  ```
  ---
  Completed: {YYYY-MM-DD HH:MM}
  Result: {Brief summary of outcome}
  ---
  ```

### Step 3.4: Check Parent Plan Status
- Read parent file in `outstanding/` (linked in EXEC file header).
- Scan `inprogress/` and `archive/execution/` for all `{ID}_*_*.md` files.
- **If ALL execution files are `_DONE_`**:
  - Rename parent: `{ID}_ACTIVE_{slug}.md` → `{ID}_DONE_{slug}.md`.
  - Update header: `Status: COMPLETED`.
  - Append completion summary.
  - **Update ticket reference table**: Change all file paths from `inprogress/` to `../archive/execution/`.
  - Mark all parent plan checkboxes as complete.
- **If SOME children remain**:
  - Keep parent as `{ID}_ACTIVE_{slug}.md`.
  - Update progress: "3/5 steps completed".

### Step 3.5: Update Original Task File
- Navigate to `task/{ID}_PROC_{slug}.txt`.
- Append completion marker:
  `-> Completed: {YYYY-MM-DD} | Plan: ../outstanding/{ID}_DONE_{slug}.md`.
- Optional: Move to `archive/task/` for long-term storage.

---

## 🏷️ Status State Reference

| Directory | Status Tag | Meaning |
|-----------|------------|---------|
| `task/` | `_RAW_` | New unprocessed input |
| `task/` | `_PROC_` | Processed, plan linked |
| `outstanding/` | `_PLAN_` | Ready for execution breakdown |
| `outstanding/` | `_ACTIVE_` | Execution tickets created, work in progress |
| `outstanding/` | `_DONE_` | All child execution files completed |
| `inprogress/` | `_EXEC_` | Ticket is being worked on |
| `archive/execution/` | `_DONE_` | Ticket completed and archived |

---

## 📝 Naming Convention

**Pattern**: `{YYYYMMDD}-{SEQ}_{STATUS}_{slug}.{ext}`

**Examples**:
- `task/` → `20231027-001_PROC_login_fix.txt`
- `outstanding/` → `20231027-001_ACTIVE_login_fix.md`
- `inprogress/` → `20231027-001_EXEC_02_update_css.md`
- `archive/` → `20231027-001_DONE_login_fix.md`

- **Slug**: kebab-case, short, descriptive (max 3-4 words).
- **SEQ**: Zero-padded sequence (001, 002...) unique per day or global.

---

## 🔄 Git & Versioning Guidelines

### Update Versioning
- Edit the `VERSION` file at the project root
- Follow semantic versioning:
  - **Patch** (`0.1.x`): Bug fixes, security patches, non-breaking improvements
  - **Minor** (`0.x.0`): New features, API additions, backward-compatible changes
  - **Major** (`x.0.0`): Breaking changes, architectural shifts

### Commit to `dev` Branch
1. **Ensure you're on `dev`**:
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Stage changes**:
   ```bash
   git add docs/kanban/ VERSION <other-changed-files>
   ```

3. **Commit with conventional commit message**:
   ```
   <type>(<scope>): <description>

   - Summary of completed work
   - Files created/modified/deleted
   ```

   **Examples**:
   ```
   docs(kanban): archive login fix plan v0.2.0 and update execution tickets

   - Mark 20231027-001_DONE_login_fix.md as complete
   - Update parent plan status to COMPLETED
   - Bump VERSION from 0.1.0 to 0.2.0 (minor release)
   ```

4. **Push to `dev`**:
   ```bash
   git push origin dev
   ```

---

## 🏷️ Conventional Commit Types

| Type | Use Case | Example |
|------|----------|---------|
| `feat` | New feature | `feat(auth): add two-factor authentication` |
| `fix` | Bug fix | `fix(api): resolve null pointer in user endpoint` |
| `docs` | Documentation | `docs(kanban): archive login fix action plan` |
| `refactor` | Code restructuring | `refactor(register): extract helper functions` |
| `chore` | Maintenance | `chore(deps): update package versions` |
| `test` | Testing | `test(auth): add login flow integration tests` |

---

## ⚠️ Important Rules

1. **Never commit directly to `main`** — all work goes through `dev`
2. **Always follow naming conventions** — ensures automated sorting and traceability
3. **Keep task files linked** — maintain `task/` ↔ `outstanding/` ↔ `inprogress/` traceability
4. **Update VERSION file** — every significant milestone should bump the version
5. **Use conventional commits** — ensures automated changelog generation and clear history

---

## 🚀 Quick Reference Commands

```bash
# 1. Switch to dev branch
git checkout dev && git pull origin dev

# 2. Archive completed execution ticket
mv docs/kanban/inprogress/ID_EXEC_01_slug.md docs/kanban/archive/execution/ID_DONE_01_slug.md

# 3. Update version
echo "0.2.0" > VERSION

# 4. Stage and commit
git add docs/kanban/ VERSION <other-files>
git commit -m "docs(kanban): complete execution step and bump version to vX.Y.Z"

# 5. Push
git push origin dev
```

---

## ✅ Checklist for Completion

- [ ] All deliverable checkboxes marked complete in execution tickets
- [ ] All deliverable/expectation/resource checkboxes marked complete in parent plan
- [ ] Execution tickets renamed to `_DONE_` and moved to `archive/execution/`
- [ ] Parent plan ticket references updated to point to archive paths
- [ ] Parent plan status updated (`ACTIVE` → `DONE` if all steps complete)
- [ ] Original task file updated with completion marker
- [ ] `VERSION` file bumped appropriately
- [ ] Committed to `dev` branch with conventional commit message
- [ ] Pushed to `origin/dev`

---

**Maintained By**: Development Team  
**Review Cycle**: Update this workflow when process improvements are identified