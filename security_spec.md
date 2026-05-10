# Security Specification for VisionTV

## 1. Data Invariants
- A user can only read their own private profile data.
- User roles (admin/user) are immutable by the user themselves.
- Admins have full access to all collections.
- `createdAt` and `updatedAt` field must be valid server timestamps.

## 2. The "Dirty Dozen" Payloads
- T1: Attempt to create a user with `role: 'admin'` as a normal user.
- T2: Attempt to update another user's profile.
- T3: Attempt to delete a user profile as a non-admin.
- T4: Attempt to update `uid` of a user document.
- T5: Attempt to write a string longer than 1000 characters to `displayName`.
- T6: Attempt to write to a non-existent collection `ghost_collection`.
- T7: Attempt to read `users` collection without being signed in.
- T8: Attempt to update `createdAt` after document creation.
- T9: Attempt to inject a massive array into a user field.
- T10: Attempt to spoof `email_verified` as false.
- T11: Attempt to create a document with an ID that is too long or contains invalid characters.
- T12: Attempt to list all users as a regular user.

## 3. The Test Runner
(I will skip the full test runner file for now but ensure rules cover these cases)
