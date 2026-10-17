# Password sign-in

User request: remove the recurring email-link step. Existing email addresses serve as usernames; no identity migration, new username registry, password reset by an operator, or account recreation. Preserve all family data, team membership and MFA.

Implementation: `/login` defaults to email + password through `signInWithPassword`. Explicit account creation uses `signUp` with one-time email confirmation. Forgot/set password requests a recovery link to the existing PKCE callback, which preserves `/auth/password` and the eventual app destination. Authenticated users can set/change a password from the parent account menu or admin sidebar. Accounts with an enrolled factor must verify it before the password form is shown; Supabase still enforces its own update-user security checks. The user's password is never sent to an application API, logged or stored in an application table.

Existing account verification found one identity with a password credential already present (only an aggregate count was read; no password hashes were retrieved). No live password or factor was changed by the agent. Previous email links remain valid until provider expiry; there is no longer an email-link button for routine login.

New password forms require 12 characters and reject overlong UTF-8 input rather than silently truncate it. Existing passwords are not subject to the new-password minimum at sign-in. Provider policy/rate limits remain in force. Callback and password-login destinations are restricted to app/admin/password routes; external, malformed and control-character redirects fall back to `/app`.

The one-time confirmation and recovery flows still depend on Supabase email delivery and configured redirect allowlists. A PKCE recovery link must be opened in the same browser where it was requested. No email, account signup or reset was triggered in production by verification. The owner sets or changes their own password; credentials should never be shared in chat.

Design choice: email + password uses the existing verified identities and provider controls. Separate usernames would add a second identity registry and recovery ambiguity without improving this requested sign-in flow. No custom password storage is introduced.

Verification: `npm run check` passed lint, strict typecheck and all 12 tests; `npm run build` passed; all 20 local HTTP protection checks passed. Browser checks covered sign-in, signup and recovery modes, mobile overflow, and console errors (none). A deliberately nonexistent account returned `invalid_credentials` from the live provider, confirming password login is enabled without creating an identity or sending email. Successful owner login/password changes remain owner-only verification; no credentials were requested from the owner.

Deployment: awaiting CI and production promotion. Rollback target: `c427be57abc98fa022d7c830dc1af06d6a41ddeb`, Vercel `dpl_3jRTtBYMsM6rNzP4GyNxpy3rDZZ6`. No database migration is required.
