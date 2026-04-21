# Security Audit Report

> Date: 2026-04-21 | Status: CRITICAL issues found — remediation in progress

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 5 | Fixing now |
| HIGH | 3 | Next priority |
| MEDIUM | 4 | Short-term |
| LOW | 2 | Minor |

---

## CRITICAL Issues

### 1. Chat V2 — No Authentication
**File:** `src/app/api/chat-v2/route.ts`
**Risk:** Anyone can send requests with any userId, execute tools as other users, bypass tier limits.
**Fix:** Add session check, force userId from session.

### 2. Thanks.io Webhook — No Signature Validation
**File:** `src/app/api/thanksio/webhook/route.ts`
**Risk:** Attackers can forge delivery/scan events, manipulate campaign stats.
**Fix:** Validate webhook signature header.

### 3. Twilio SMS Webhook — No Signature Validation
**File:** `src/app/api/crm/sms/webhook/route.ts`
**Risk:** Inject fake SMS messages, create false contacts, trigger push notifications.
**Fix:** Validate Twilio request signature.

### 4. XSS in Email Sending
**File:** `src/app/api/crm/send-email/route.ts`
**Risk:** User input (contactName, fromName) injected unsanitized into HTML email.
**Fix:** Escape HTML in all user inputs before embedding in email templates.

### 5. XSS in Contact Form
**File:** `src/app/api/contact/route.ts`
**Risk:** Name, phone, message, photo URLs injected raw into HTML notification email.
**Fix:** Escape all user inputs.

---

## HIGH Issues

### 6. Debug Endpoint Leaks Config
**File:** `src/app/api/debug/test-session/route.ts`
**Risk:** Exposes NEXTAUTH_SECRET length, env config, partial cookies.
**Fix:** Remove or restrict to localhost.

### 7. Chat Log Auth Bypass
**File:** `src/app/api/chat/log/route.ts`
**Risk:** Unauthenticated users with "anon_" prefix can access/create chat logs.
**Fix:** Tighten anonymous access controls.

### 8. 2FA Not Enforced Server-Side
**File:** `src/lib/auth.ts`
**Risk:** JWT issued with `requiresTwoFactor` flag but API routes don't check it.
**Fix:** Add `twoFactorVerified` flag to JWT, check in protected routes.

---

## MEDIUM Issues

### 9. No Rate Limiting on Auth
**Files:** `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/2fa/*`
**Risk:** Brute force 2FA codes, spam registration, DOS email service.

### 10. No CSRF Protection
**Files:** All POST/PUT/DELETE endpoints
**Risk:** Cross-site request forgery on mutation endpoints.

### 11. Regex Injection in Contact Search
**File:** `src/app/api/crm/contacts/route.ts`
**Risk:** ReDoS via malicious search patterns in MongoDB $regex.

### 12. Campaign Ownership Not Checked on All Sub-routes
**Files:** Various `/api/campaigns/[id]/*` routes
**Risk:** User could access other users' campaign data by guessing IDs.

---

## Positive Findings

- JWT sessions with 30-day expiry
- bcryptjs password hashing (12 rounds)
- Email verification required
- 2FA support (TOTP + email)
- Route protection via proxy.ts
- Most data routes filter by userId
- SameSite cookies properly configured
- OAuth (Google/Facebook) properly set up
