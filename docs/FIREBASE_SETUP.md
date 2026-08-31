# Look&Go — Firebase production setup

## Services to enable

In the Firebase project used by Look&Go:

1. Authentication → Sign-in method → enable **Anonymous** for the current beta fallback.
2. Firestore Database → create the production database in a European region close to users.
3. Storage → create the default bucket in the same project/region when possible.
4. Project settings → General → Web app → copy the Firebase web configuration.

## Vercel environment variables

Add these values to Production, Preview and Development as needed:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Redeploy Look&Go after saving them.

## Security rules

Deploy the repository rules with Firebase CLI:

```bash
firebase login
firebase use <PROJECT_ID>
firebase deploy --only firestore:rules,firestore:indexes,storage
```

The committed rules restrict `/users/{uid}` Firestore data and `/users/{uid}/...` media to the authenticated Firebase UID. All unmatched paths are denied.

## Beta migration behavior

The web app keeps the browser-local beta profile/media fallback. When Firebase is configured, profile metadata and new reference photos are also synchronized to Firestore/Storage.

Anonymous authentication is suitable only for the current same-browser beta migration. Cross-device account recovery requires a durable sign-in provider (email link, email/password, Google, etc.) before production launch.
