# Returning beta tester flow

Goal: a beta tester must never feel like a new user every time they return.

Routing rules:

- No local/cloud identity: `/connexion?mode=register`
- Identity started but onboarding incomplete: `/inscription`
- Identity/photos complete but style step incomplete: `/inscription/style`
- Profile complete: `/profil`

`/connexion` now checks local beta data and Firebase beta profile before showing the new-user form.

`/start` is the canonical smart entry route for future CTAs such as **Scanner mon dressing**. It restores the best-known profile and sends the user to the correct step.

The current Firebase anonymous session is still browser/device scoped. True cross-device recovery requires durable Firebase Authentication (email link, Google, or account linking).
