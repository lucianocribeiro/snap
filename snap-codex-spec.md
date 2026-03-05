# Snap — Codex Development Specification
**Version:** 2.0 (Functional — Post UI Shell)
**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase · Google Document AI
**Design system:** Dark-mode-first, Atlassian/Jira-inspired
**Platforms:** Web (Next.js) + Mobile (React Native / Expo — separate repo)

---

## 1. Design System Reference

All components use these Tailwind token classes. Never use raw hex values — always use tokens.

| Token | Usage |
|---|---|
| `bg-snap-bg` | Page background |
| `bg-snap-surface` | Cards, tables, panels |
| `bg-snap-card` | Elevated card containers |
| `border-snap-border` | All borders and dividers |
| `text-snap-textMain` | Primary text |
| `text-snap-textDim` | Secondary / helper text |

**Status badge pattern (established — reuse everywhere):**
- Paid: `border-emerald-500/40 bg-emerald-500/10 text-emerald-300`
- Unpaid: `border-amber-500/40 bg-amber-500/10 text-amber-300`
- Active: `border-blue-500/40 bg-blue-500/10 text-blue-300`
- Inactive: `border-snap-border bg-snap-bg text-snap-textDim`

**Empty state pattern (established — reuse everywhere):**
- Dashed border container, centered icon placeholder, title + description text, primary CTA button

---

## 2. Project Structure

```
/app
  /dashboard              ← Built ✓
  /projects
    /page.tsx             ← Projects list
    /new/page.tsx         ← Create project (multi-step)
    /[id]/page.tsx        ← Project detail (tabbed)
    /[id]/edit/page.tsx   ← Edit project
  /invoices
    /page.tsx             ← Invoices list
    /new/page.tsx         ← Upload + map invoice (multi-step)
    /[id]/page.tsx        ← Invoice detail + edit
  /reports
    /page.tsx             ← Report builder + export
  /users
    /page.tsx             ← User management (Admin only)
  /categories
    /page.tsx             ← Category management (Admin only)
  /settings
    /page.tsx             ← Profile + preferences
  /super-admin
    /dashboard/page.tsx
    /organizations/page.tsx
    /organizations/new/page.tsx
    /organizations/[id]/page.tsx
    /users/page.tsx
    /settings/page.tsx
  /login/page.tsx
  /forgot-password/page.tsx
  /reset-password/page.tsx

/components
  /dashboard              ← Built ✓
    ChartsSection.tsx
    RecentInvoicesTable.tsx
    SummaryCards.tsx
    types.ts
  /projects
    ProjectsTable.tsx
    ProjectForm.tsx        ← Multi-step form
    ProjectDetail.tsx
  /invoices
    InvoicesTable.tsx
    InvoiceUpload.tsx      ← Upload + OCR trigger
    MappingScreen.tsx      ← Field mapping UI
    InvoiceDetail.tsx
  /reports
    ReportBuilder.tsx
    ReportPreview.tsx
  /users
    UsersTable.tsx
    InviteUserModal.tsx
    EditUserModal.tsx
  /categories
    CategoriesTable.tsx
    CategoryRequestsTable.tsx
  /super-admin
    OrganizationsTable.tsx
    NewOrganizationForm.tsx
  /shared
    PageHeader.tsx
    StatusBadge.tsx        ← Extract from RecentInvoicesTable (reuse)
    EmptyState.tsx         ← Extract from RecentInvoicesTable (reuse)
    ConfirmModal.tsx
    ToastNotification.tsx
    StepIndicator.tsx      ← For multi-step forms
    FilterBar.tsx
```

---

## 3. Shared Types (extend `/components/dashboard/types.ts`)

```typescript
// Auth & Users
export type UserRole = "super_admin" | "org_admin" | "user";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: "Active" | "Inactive";
  lastLogin: string | null;
  organizationId: string;
};

// Organization
export type Organization = {
  id: string;
  name: string;
  adminName: string;
  adminEmail: string;
  usersCount: number;
  projectsCount: number;
  createdAt: string;
  status: "Active" | "Inactive";
};

// Projects
export type PeriodType = "Weekly" | "Monthly" | "Custom";

export type CustomPeriod = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type ProjectColumn =
  | "invoiceNumber"
  | "vendor"
  | "invoiceDate"
  | "dueDate"
  | "amount"
  | "tax"
  | "totalAmount"
  | "category"
  | "status"
  | "notes"
  | "custom1"
  | "custom2"
  | "custom3";

export type Project = {
  id: string;
  name: string;
  description?: string;
  periodType: PeriodType;
  customPeriods?: CustomPeriod[];
  selectedColumns: ProjectColumn[];
  customColumnLabels?: { custom1?: string; custom2?: string; custom3?: string };
  categories: Category[];
  invoicesCount: number;
  createdAt: string;
  status: "Active" | "Archived";
};

// Categories
export type Category = {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  invoicesCount: number;
  createdBy: string;
  createdAt: string;
};

export type CategoryRequest = {
  id: string;
  categoryName: string;
  projectId: string;
  projectName: string;
  requestedBy: string;
  requestedAt: string;
  status: "Pending" | "Approved" | "Rejected";
};

// Invoices (extend existing Invoice type)
export type InvoiceStatus = "Paid" | "Unpaid";

export type ExtractedField = {
  key: string;
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
};

export type ColumnMapping = {
  extractedKey: string;
  projectColumn: ProjectColumn | null;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  vendor: string;
  project: string;
  projectId: string;
  category: string;
  invoiceDate: string;
  dueDate?: string;
  amount: string;
  tax?: string;
  totalAmount: string;
  status: InvoiceStatus;
  notes?: string;
  custom1?: string;
  custom2?: string;
  custom3?: string;
  originalFileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  lastEditedAt?: string;
};

// Reports
export type ReportConfig = {
  projectId: string;
  selectedPeriods: string[];
  selectedColumns: ProjectColumn[];
  categoryFilter?: string[];
  statusFilter?: InvoiceStatus | "All";
};
```

---

## 4. Shared Components

### 4.1 PageHeader
**File:** `/components/shared/PageHeader.tsx`
**Props:** `title: string`, `description?: string`, `action?: ReactNode`

```
Layout:
[Title]           [action button (optional)]
[description]
```

Reuse the pattern already established in `page.tsx` dashboard header.

---

### 4.2 StatusBadge
**File:** `/components/shared/StatusBadge.tsx`
**Props:** `status: string`, `variant: "invoice" | "user" | "org" | "project"`

Extract from `RecentInvoicesTable.tsx` and generalize. Map variants to color tokens above.

---

### 4.3 EmptyState
**File:** `/components/shared/EmptyState.tsx`
**Props:** `title: string`, `description: string`, `actionLabel?: string`, `onAction?: () => void`

Extract from `RecentInvoicesTable.tsx`. Add optional CTA button.

---

### 4.4 ConfirmModal
**File:** `/components/shared/ConfirmModal.tsx`
**Props:** `open: boolean`, `title: string`, `description: string`, `confirmLabel: string`, `onConfirm: () => void`, `onCancel: () => void`, `destructive?: boolean`

- Overlay with centered modal panel
- Cancel button (ghost) + Confirm button (destructive red if `destructive=true`)
- Used for: delete invoice, archive project, deactivate user, deactivate org

---

### 4.5 StepIndicator
**File:** `/components/shared/StepIndicator.tsx`
**Props:** `steps: string[]`, `currentStep: number`

- Horizontal step bar for multi-step forms
- Completed steps: filled circle with checkmark, connected by solid line
- Current step: filled circle with number, bold label
- Future steps: empty circle, dim label

---

### 4.6 FilterBar
**File:** `/components/shared/FilterBar.tsx`
**Props:** `filters: FilterConfig[]`, `onChange: (key, value) => void`

```typescript
type FilterConfig = {
  key: string;
  label: string;
  options: { label: string; value: string }[];
  value: string;
};
```

Reuse the `select` pattern from `ChartsSection.tsx` and `RecentInvoicesTable.tsx`.

---

## 5. Authentication Pages

### 5.1 Login
**Route:** `/login`
**File:** `/app/login/page.tsx`

**Layout:** Centered card on full-screen `bg-snap-bg`

**Form fields:**
- App logo + "Snap" wordmark (top center)
- Email input
- Password input (with show/hide toggle)
- "Remember me" checkbox
- Primary button: "Sign In"
- Link: "Forgot your password?"
- Language toggle: EN / ES (bottom of card)

**Validation:**
- Email: required, valid format
- Password: required, min 8 characters
- Show inline error messages below each field on blur

**On submit:**
- Call Supabase `signInWithPassword({ email, password })`
- On success: redirect based on user role
  - `super_admin` → `/super-admin/dashboard`
  - `org_admin` → `/dashboard`
  - `user` → `/dashboard`
- On error: show toast "Invalid email or password"

---

### 5.2 Forgot Password
**Route:** `/forgot-password`

**Fields:** Email input, "Send reset link" button, "Back to login" link
**On submit:** Call Supabase `resetPasswordForEmail(email)`
**Success state:** Replace form with confirmation message

---

### 5.3 Reset Password
**Route:** `/reset-password`

**Fields:** New password, confirm password, password strength indicator, "Reset password" button
**Validation:** Passwords must match, min 8 characters
**On submit:** Call Supabase `updateUser({ password })`
**On success:** Redirect to `/login` with success toast

---

## 6. Projects

### 6.1 Projects List
**Route:** `/projects`
**File:** `/app/projects/page.tsx`
**Component:** `/components/projects/ProjectsTable.tsx`

**Page layout:**
```
[PageHeader: "Projects" | "+ New Project" button (Admin only)]
[Search bar]
[ProjectsTable]
```

**Table columns:**
| Column | Type |
|---|---|
| Project name | Link to `/projects/:id` |
| Period type | Badge: Weekly / Monthly / Custom |
| Columns | Count (e.g. "8 columns") |
| Categories | Count |
| Invoices | Count |
| Created | Date |
| Status | Badge: Active / Archived |
| Actions | View · Edit (Admin) · Archive (Admin) |

**Filters:** Status (All / Active / Archived)
**Empty state:** "No projects yet. Create your first project to get started."

---

### 6.2 New Project (Multi-step form)
**Route:** `/projects/new`
**File:** `/app/projects/new/page.tsx`
**Component:** `/components/projects/ProjectForm.tsx`

Use `StepIndicator` component with 5 steps: Basic Info · Period · Columns · Categories · Review

**State shape:**
```typescript
type ProjectFormState = {
  name: string;
  description: string;
  periodType: PeriodType;
  customPeriods: CustomPeriod[];
  selectedColumns: ProjectColumn[];
  customColumnLabels: { custom1: string; custom2: string; custom3: string };
  categories: string[];
};
```

**Step 1 — Basic Info:**
- Project name (required, max 80 chars)
- Description (optional, max 300 chars)
- "Next" button (disabled until name is filled)

**Step 2 — Period Configuration:**
- Three option cards: Weekly · Monthly · Custom
- If Custom selected: show "+ Add Period" button
  - Each custom period: name input, start date, end date
  - Add up to 24 custom periods
  - Existing periods shown as list with delete option

**Step 3 — Column Selection:**
- Section header: "Select the columns you want to track in this project"
- Checkboxes for all 13 columns (10 standard + 3 custom)
- For custom columns: show rename input field when checkbox is checked
- Default columns pre-selected: Invoice #, Vendor, Invoice Date, Total Amount, Category, Status
- Minimum 1 column required

Standard column labels:
```
invoiceNumber   → "Invoice #"
vendor          → "Vendor / Supplier"
invoiceDate     → "Invoice Date"
dueDate         → "Due Date"
amount          → "Amount (excl. tax)"
tax             → "Tax"
totalAmount     → "Total Amount"
category        → "Category"
status          → "Status"
notes           → "Notes"
custom1         → User-defined label (default: "Custom 1")
custom2         → User-defined label (default: "Custom 2")
custom3         → User-defined label (default: "Custom 3")
```

**Step 4 — Categories:**
- Text input + "Add" button
- Added categories displayed as removable chips/tags
- Max 10 categories — show counter "X / 10"
- At limit: input disabled, message shown: "Maximum of 10 categories reached."
- Minimum 1 category required

**Step 5 — Review:**
- Summary cards for each step's configuration
- "Back" to edit any step
- "Create Project" button
- On success: redirect to `/projects/:id`, show success toast

---

### 6.3 Project Detail (Tabbed)
**Route:** `/projects/:id`
**Tabs:** Overview · Invoices · Dashboard · Reports

**Overview tab:**
- Project name, description, status
- Period type and period list (if custom)
- Selected columns list
- Categories list
- Edit button (Admin only), Archive button (Admin only)

**Invoices tab:**
- Filtered `InvoicesTable` scoped to this project
- "+ Add Invoice" button

**Dashboard tab:**
- `ChartsSection` scoped to this project (no project filter needed — auto-filtered)
- `SummaryCards` for this project only

**Reports tab:**
- `ReportBuilder` pre-loaded with this project

---

## 7. Invoices

### 7.1 Invoices List
**Route:** `/invoices`
**File:** `/app/invoices/page.tsx`

**Page layout:**
```
[PageHeader: "Invoices" | "+ Add Invoice" button]
[FilterBar: Project · Status · Period · Category · Date range]
[InvoicesTable]
```

**Table columns:** Invoice # · Vendor · Project · Category · Invoice Date · Due Date · Amount · Tax · Total · Status · Actions (View · Edit · Delete[Admin])

**Filters:**
- Project: dropdown of all projects
- Status: All / Paid / Unpaid
- Period: based on selected project's period config
- Category: dropdown of categories in selected project
- Date range: start date + end date pickers

---

### 7.2 Add Invoice (Multi-step upload flow)
**Route:** `/invoices/new`
**File:** `/app/invoices/new/page.tsx`

Use `StepIndicator` with 5 steps: Select Project · Upload · Review Extraction · Map Columns · Confirm

**Step 1 — Select Project:**
- Dropdown of all active projects (required)
- "Next" disabled until project selected

**Step 2 — Upload Invoice:**
- Upload dropzone: accepts PDF, JPG, PNG (max 10MB)
- File preview:
  - PDF: embedded PDF viewer or thumbnail
  - Image: `<img>` preview
- "Take photo" button (renders only on mobile via media query or React Native — on web, show as disabled with tooltip "Available on mobile app")
- "Process Invoice" primary button
- On click: upload file to Supabase Storage, trigger Edge Function to call Google Document AI

**Loading state during OCR:**
- Full-step overlay spinner
- Message: "Reading your invoice..." (EN) / "Leyendo tu factura..." (ES)

**Step 3 — Review Extracted Data:**
Two-panel layout (stacked on mobile, side-by-side on desktop):

Left panel — Original file:
- PDF/image preview (scrollable)
- "View full size" link

Right panel — Extracted fields (editable form):
```
For each extracted field:
  [Field label]
  [Input value]           [Confidence indicator dot]
  
Confidence colors:
  green dot  = high confidence (>85%)
  yellow dot = medium confidence (60–85%) — label: "Review suggested"
  red dot    = low confidence (<60%) — label: "Manual input required"
```

All fields editable regardless of confidence. Fields:
- Invoice Number
- Vendor Name
- Invoice Date
- Due Date
- Subtotal / Amount
- Tax
- Total Amount
- Any additional fields returned by Document AI

"Next" button proceeds to mapping.

**Step 4 — Map to Project Columns:**
```
Left column              Right column
─────────────────────────────────────────
Extracted field label    [Dropdown → project column]
Extracted value          
```

- Dropdowns populated from the selected project's `selectedColumns`
- Pre-fill mappings based on:
  1. Vendor history (if same vendor was mapped before, apply same mapping)
  2. Intelligent defaults (e.g. "Total" → `totalAmount`, "Fecha" → `invoiceDate`)
- Unmapped fields can be left as "Do not import"
- "Confirm Mapping" button

**Step 5 — Confirm & Save:**
- Summary table of all mapped fields + values
- Category selector (dropdown from project categories, required)
- Status selector: Paid / Unpaid (required)
- Notes field (optional, max 500 chars)
- Custom column fields if selected in project (labeled with user's custom names)
- "Save Invoice" button
- On success: redirect to `/invoices/:id`, show success toast "Invoice saved successfully"

---

### 7.3 Invoice Detail / Edit
**Route:** `/invoices/:id`

**Layout:**
```
[PageHeader: Invoice # | Edit button | Delete button (Admin)]

[Two columns on desktop]
Left: Original file preview + download link
Right: All invoice fields as editable form
       Category (editable)
       Status (editable)
       Notes (editable)
       Custom fields (editable, shown with user's labels)
       
       [Re-map Fields button] → reopens Step 4 mapping screen
       
       Metadata: Uploaded on [date] by [user] · Last edited [date]

[Save Changes button]
```

**Delete:** Triggers `ConfirmModal` with destructive styling. Admin only.

---

## 8. Reports

### 8.1 Report Builder
**Route:** `/reports`
**File:** `/app/reports/page.tsx`

**Layout:**
```
[PageHeader: "Reports"]

[Configuration panel]
  Project selector (required)
  Period selector (multi-select, based on project period config)
  Column selector (checklist, defaults to project column config)
  Category filter (optional multi-select)
  Status filter (All / Paid / Unpaid)

[Preview section]
  [ReportPreview table]

[Export button: "Export to Excel (.xlsx)"]
```

**ReportPreview:**
- Table matching selected columns as headers
- Rows: all invoices matching selected filters
- Shows "X invoices · Total: $X" summary line below table
- "No data for the selected filters" empty state if no results

**Excel export:**
- Use SheetJS (`xlsx` npm package) client-side
- File name format: `Snap_[ProjectName]_Report_[YYYY-MM-DD].xlsx`
- Columns: exactly those selected in report config, using project's custom column labels
- Includes summary row at bottom: totals for Amount, Tax, Total Amount columns
- Triggers browser file download

---

## 9. Users (Admin only)

### 9.1 Users List
**Route:** `/users`

```
[PageHeader: "Users" | "+ Invite User" button]
[UsersTable]
```

**Table columns:** Name · Email · Role · Status · Last Login · Actions (Edit · Deactivate)

---

### 9.2 Invite User Modal
**Trigger:** "+ Invite User" button
**Fields:**
- First name (required)
- Last name (required)
- Email (required, unique validation)
- Role: locked to "User" in V1
- "Send Invite" button

**On submit:**
- Create user in Supabase Auth with `inviteUserByEmail`
- Assign to organization via `user_organizations` table
- Show success toast: "Invite sent to [email]"

---

### 9.3 Edit User Modal
**Trigger:** Edit action in table
**Fields:**
- First name (editable)
- Last name (editable)
- Role (editable: User / Admin — Admin can promote users)
- Status toggle: Active / Inactive
- "Save" button

---

## 10. Categories (Admin only)

### 10.1 Categories Page
**Route:** `/categories`

**Two sections:**

**Section 1 — Active Categories:**
```
[Section header: "Categories"]
[CategoriesTable]
```
Table: Category name · Project · Invoices using it · Created by · Created date · Actions (Edit · Delete)

Delete: only allowed if `invoicesCount === 0`. Otherwise show tooltip: "Cannot delete a category in use."

**Section 2 — Category Requests:**
```
[Section header: "Pending Requests" | badge with pending count]
[CategoryRequestsTable]
```
Table: Category name · Project · Requested by · Date · Actions (Approve · Reject)

On Approve: create category, update request status, notify user (in-app toast)
On Reject: update request status, notify user

---

## 11. Super Admin Pages

### 11.1 Super Admin Dashboard
**Route:** `/super-admin/dashboard`

Summary cards: Total organizations · Total active users · Total invoices processed · New orgs this month

Recent organizations table (last 10): Org name · Admin email · Users · Created · Status · Actions (View · Deactivate)

---

### 11.2 Organizations List
**Route:** `/super-admin/organizations`

```
[PageHeader: "Organizations" | "+ New Organization" button]
[Search bar] [Status filter]
[OrganizationsTable]
```

Table: Org name · Admin name · Admin email · Users · Projects · Created · Status · Actions (View · Edit · Deactivate/Activate)

---

### 11.3 New Organization
**Route:** `/super-admin/organizations/new`

**Fields:**
- Organization name (required)
- Admin first name (required)
- Admin last name (required)
- Admin email (required)
- Auto-generated temporary password (shown in read-only field with copy button)
- "Create Organization" button

**On submit:**
- Create org record in `organizations` table
- Create admin user via Supabase `inviteUserByEmail`
- Assign role `org_admin` in `user_roles` table
- Show success modal with credentials summary

---

### 11.4 Organization Detail
**Route:** `/super-admin/organizations/:id`

- Org name, admin details, created date, status
- Users table (name, email, role, status — read only)
- Projects count (number only — no data access)
- Edit button, Deactivate/Activate button

---

### 11.5 Super Admin Users (Read-only audit view)
**Route:** `/super-admin/users`

Filters: Organization · Role · Status
Table: Name · Email · Organization · Role · Status · Last Login
No edit actions — read only.

---

## 12. Settings

### 12.1 Admin Settings
**Route:** `/settings`

**Tabs:** Organization · Profile · Preferences

**Organization tab (Admin only):**
- Organization name (editable)
- "Save" button

**Profile tab:**
- First name, last name (editable)
- Email (read-only — contact super admin to change)
- Change password: current password, new password, confirm new password
- "Save Profile" button

**Preferences tab:**
- Language: EN / ES (radio or segmented control)
- "Save Preferences" button

---

### 12.2 User Settings
Same as Admin Settings but without the Organization tab.

---

## 13. Supabase Data Model Reference

### Tables

```sql
organizations
  id, name, status, created_at

user_profiles
  id (= auth.users.id), first_name, last_name, email,
  organization_id, role (super_admin|org_admin|user),
  language (en|es), status, last_login_at

projects
  id, organization_id, name, description, period_type,
  selected_columns (jsonb), custom_column_labels (jsonb),
  status, created_at, created_by

project_periods (for custom periods)
  id, project_id, name, start_date, end_date

categories
  id, project_id, organization_id, name, created_by, created_at

category_requests
  id, project_id, organization_id, category_name,
  requested_by, status (pending|approved|rejected), created_at

invoices
  id, project_id, organization_id, invoice_number, vendor,
  invoice_date, due_date, amount, tax, total_amount, category_id,
  status (paid|unpaid), notes, custom1, custom2, custom3,
  original_file_url, column_mappings (jsonb),
  uploaded_by, uploaded_at, last_edited_at

vendor_mappings (for OCR memory)
  id, organization_id, vendor_name, column_mappings (jsonb),
  updated_at
```

### Row Level Security (RLS) — Critical

Every table except `organizations` and `user_profiles` must have RLS enabled with this pattern:

```sql
-- Users can only see data from their own organization
CREATE POLICY "org_isolation" ON invoices
  FOR ALL USING (
    organization_id = (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );
```

Apply the same policy pattern to: `projects`, `categories`, `category_requests`, `invoices`, `vendor_mappings`, `project_periods`.

---

## 14. OCR Integration (Supabase Edge Function)

**Function name:** `process-invoice`
**Trigger:** Called from client after file is uploaded to Supabase Storage

**Input:**
```typescript
{ fileUrl: string; projectId: string; organizationId: string; language: "en" | "es" }
```

**Process:**
1. Download file from Supabase Storage
2. Send to Google Document AI Invoice Parser endpoint
3. Parse response into `ExtractedField[]` array
4. Check `vendor_mappings` table for existing mapping for this vendor
5. Return extracted fields + suggested mappings

**Output:**
```typescript
{
  extractedFields: ExtractedField[];
  suggestedMappings: ColumnMapping[];
  vendorName: string | null;
}
```

**Client-side after OCR response:** Advance to Step 3 (Review Extraction) with returned data pre-populated.

---

## 15. Navigation & Role Guards

### Route protection
Use Next.js middleware to check Supabase session on every protected route.

```
/super-admin/* → requires role: super_admin
/users         → requires role: org_admin or super_admin
/categories    → requires role: org_admin or super_admin
All other /    → requires any authenticated session
```

Unauthenticated users → redirect to `/login`
Wrong role → redirect to their role's dashboard

### Language
- Store language preference in `user_profiles.language`
- On login, load preference into React context: `LanguageContext`
- All user-facing strings use translation keys
- Translation files: `/locales/en.json` and `/locales/es.json`
- Toggle in top nav updates context + persists to Supabase

---

## 16. Build Sequence (Recommended for Codex)

Follow this order to avoid dependency issues:

1. **Shared components** — PageHeader, StatusBadge, EmptyState, ConfirmModal, StepIndicator, FilterBar
2. **Auth pages** — Login, Forgot Password, Reset Password
3. **Supabase client setup** — `/lib/supabase.ts`, auth middleware, RLS policies
4. **Projects** — List → New (multi-step) → Detail → Edit
5. **Invoices (no OCR first)** — List → Detail/Edit → manual entry flow
6. **OCR integration** — Edge Function → upload flow → mapping screen
7. **Reports** — ReportBuilder → ReportPreview → Excel export
8. **Users** — List → Invite modal → Edit modal
9. **Categories** — List → Requests management
10. **Super Admin pages** — Dashboard → Organizations → Users
11. **Settings** — Profile → Organization → Preferences
12. **Language / i18n** — Apply after all pages exist

---

## 17. MVP Scope Boundaries

The following are explicitly OUT of scope for V1. Do not build:

- AI agent / chat interface for project insights
- Mobile app (React Native — separate project)
- Multi-currency support (USD only for now)
- Invoice approval workflows
- Bulk invoice upload
- Email notifications (invite emails use Supabase default)
- Audit log / activity history
- API access / webhooks
- Handwritten invoice support
- Dark/light mode toggle (dark mode only for V1)