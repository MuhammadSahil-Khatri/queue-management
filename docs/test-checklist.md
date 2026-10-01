# Manual Test Checklist: Chunk 2 Authentication & Authorization

This checklist allows you to systematically verify every security invariant, role permission, and authentication requirement specified for **Chunk 2**.

---

## Pre-Requisites & Seeded Test Accounts

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@queuecraft.local` | `AdminPass123!` | System-wide administrator |
| **MANAGER** | `manager@queuecraft.local` | `ManagerPass123!` | Examination Department |
| **STAFF 1** | `staff1@queuecraft.local` | `StaffPass123!` | Examination Dept, STF-0001, Shift Morning |
| **STAFF 2** | `staff2@queuecraft.local` | `StaffPass123!` | Examination Dept, STF-0002, Shift Evening |
| **CUSTOMER 1** | `customer1@queuecraft.local` | `CustomerPass123!` | Self-registered visitor |
| **CUSTOMER 2** | `customer2@queuecraft.local` | `CustomerPass123!` | Self-registered visitor |

---

## Test Cases

### 1. Customer Self-Registration
- [ ] Navigate to `/register`.
- [ ] Enter:
  - Name: `Jane Doe`
  - Email: `jane.doe@example.com`
  - Phone: `+1-555-9999`
  - Password: `Password123!`
  - Confirm Password: `Password123!`
- [ ] Submit registration.
- [ ] **Expected Result**: User is automatically registered with role `CUSTOMER`, logged in, and redirected directly to `/customer` portal.

---

### 2. Login as Each Seeded Role & Verify Role Redirection
On the `/login` page, you can use the **1-Click Demo Login** buttons:
- [ ] Click **Admin** &rarr; Sign In &rarr; verify redirected to `/admin`, top navbar displays purple `ADMIN` badge.
- [ ] Click **Manager** &rarr; Sign In &rarr; verify redirected to `/manager`, top navbar displays blue `MANAGER` badge and "Examination Department".
- [ ] Click **Staff 1** &rarr; Sign In &rarr; verify redirected to `/staff`, displays "Service Staff Desk", staff code `STF-0001`, assigned counter, and duty status switcher.
- [ ] Click **Customer 1** &rarr; Sign In &rarr; verify redirected to `/customer`, displays Customer Portal.

---

### 3. Customer Blocked from `/api/users` & Admin Routes
- [ ] Log in as `customer1@queuecraft.local`.
- [ ] In the browser address bar, attempt to navigate to `/admin/users` or `/admin`.
- [ ] **Expected Result**: The app displays the **403 - Not Authorized** gatekeeper with the message:
  *"Your current role CUSTOMER does not have permission to access this section."*
- [ ] Verify via terminal or dev tools:
  ```bash
  # Attempting to query /api/users with a Customer token
  curl -H "Authorization: Bearer <CUSTOMER_TOKEN>" http://localhost:3000/api/users
  ```
  **Response**: `403 Forbidden` (`FORBIDDEN`).

---

### 4. Privilege Escalation Prevention on Register
- [ ] Attempt to send a registration payload with `role: "ADMIN"` or `role: "MANAGER"`:
  ```bash
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Hacker",
      "email": "hacker@test.com",
      "password": "Password123!",
      "role": "ADMIN"
    }'
  ```
- [ ] Inspect the returned JSON user object.
- [ ] **Expected Result**: The returned `user.role` is strictly `"CUSTOMER"`. The server logic forcefully discards any role parameter sent by public sign-up.

---

### 5. Manager Department Boundary Enforcement
- [ ] Log in as `manager@queuecraft.local` (assigned to "Examination Department").
- [ ] Navigate to `/manager/staff`.
- [ ] Verify the table lists ONLY staff in "Examination Department".
- [ ] Open "Onboard New Staff" modal:
  - Role is locked to `STAFF`.
  - Department is locked to `Examination Department`.
- [ ] Test API enforcement against cross-department manipulation:
  ```bash
  # Attempting to assign or edit a staff member to another department
  curl -X POST http://localhost:3000/api/users \
    -H "Authorization: Bearer <MANAGER_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Unauthorized Staff",
      "email": "unauth@test.com",
      "password": "Password123!",
      "role": "STAFF",
      "departmentId": "other-dept-999"
    }'
  ```
- [ ] **Expected Result**: Blocked with `403 Forbidden` (`DEPARTMENT_MISMATCH` or `FORBIDDEN`).

---

### 6. Admin Safety Guards (Self-Demotion & Last Admin Protection)
- [ ] Log in as `admin@queuecraft.local`.
- [ ] Navigate to `/admin/users`.
- [ ] Locate your own row in the table (marked with a "You" badge).
- [ ] Verify the Deactivate and Delete buttons are disabled for your own account.
- [ ] Click the **Edit** button for yourself.
- [ ] Verify the **Role** dropdown is disabled with the warning: *"Admins cannot demote their own account"*.
- [ ] If attempting to demote or deactivate via raw API:
  - Returns `400 Bad Request` (`CANNOT_DEMOTE_SELF` / `CANNOT_DEACTIVATE_SELF`).
- [ ] If there is only one active Admin:
  - Attempting to delete or deactivate the last admin returns `400 Bad Request` (`LAST_ADMIN_PROTECTED`).

---

### 7. Token Expiry & Silent Refresh
- [ ] Log in as any user.
- [ ] In browser dev tools > Network tab, trigger an action or refresh page.
- [ ] Notice `POST /api/auth/refresh` runs silently sending the `httpOnly` cookie.
- [ ] A new access token is returned and stored in memory. The user session stays active without requiring re-login.

---

### 8. Logout Revoking Refresh Token
- [ ] Click the **Logout** button in the header.
- [ ] Verify user is redirected to `/login` and the in-memory token is cleared.
- [ ] Attempting to call `POST /api/auth/refresh` returns:
  ```json
  { "error": { "code": "NO_REFRESH_TOKEN", "message": "Refresh token cookie is missing" } }
  ```
- [ ] The refresh token record in the database is marked with `revokedAt`.

---

### 9. Deactivated User Locked Out
- [ ] As `admin@queuecraft.local`, navigate to `/admin/users`.
- [ ] Click the power button next to `customer2@queuecraft.local` to deactivate the account.
- [ ] Log out of Admin.
- [ ] Attempt to log in with `customer2@queuecraft.local` and `CustomerPass123!`.
- [ ] **Expected Result**: Blocked with error:
  *"Your account has been deactivated. Please contact an administrator."*
  (HTTP status `401 Unauthorized`).
- [ ] Any existing access tokens held by the deactivated user are immediately rejected by `authenticate` middleware.
