# Security Specification

## 1. Data Invariants
- A user document can only be created at path `/users/{userId}` if `userId` exactly matches the authenticated `request.auth.uid`.
- Timestamps must be strictly locked to `request.time` on creation.
- The `email`, `avatarColor`, and `createdAt` fields are strictly immutable after creation.
- A user can only modify their own `username` or increment their own `gamesPlayed`. They cannot modify other users' documents.
- Shadow fields (fields outside the schema blueprint) are strictly forbidden.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Identity Theft**: Attackers writing to `/users/anotherUserUid` with their own auth token.
2. **Shadow Schema Insertion**: Trying to write `isAdmin: true` or `role: "admin"` inside the user profile document.
3. **Impersonation**: Writing another user's email into their profile on creation.
4. **Timestamp Manipulation**: Submitting a pre-dated or post-dated `createdAt` string instead of `request.time`.
5. **Length Flooding**: Registering a 10MB string as username to exhaust system bandwidth or memory (Denial of Wallet).
6. **Negative Gameplay Counting**: Updating `gamesPlayed` to a negative integer to break leaderboard/profile stats.
7. **Privileged Edit**: Bypassing the owner-check to edit a username of another registered user.
8. **Immutable Modification (Email)**: Changing the registered email address to lock out or hijack the account configuration.
9. **Unauthenticated Read**: Querying private profiles without any valid authentication token.
10. **ID Poisoning (Malformed characters)**: Injecting high-entropy binary strings into `{userId}` path.
11. **Type Poisoning**: Submitting `gamesPlayed: "one hundred"` (string) instead of a native integer.
12. **System Shadow Field**: Creating unmapped parameters in document scope to force undefined behaviors.

## 3. Test Runner Configuration
Tests validates that all above operations return standard HTTP 403 / Firestore `PERMISSION_DENIED` errors.
