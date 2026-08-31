# Returning beta flow validation

1. New visitor opens `/connexion?mode=register` → sees beta registration form.
2. Returning tester with an incomplete local profile opens the same URL → is redirected to the correct onboarding step.
3. Returning tester with `complete: true` → is redirected to `/profil`.
4. `/start` performs the same smart routing and is the preferred future CTA target.
5. If Firebase beta profile is available for the current session, it is merged before routing.
