# Look&Go — Try-On + Défilé IA MVP

## Principe non négociable

Look&Go conserve deux références visuelles privées par utilisateur :

1. **Portrait de référence** — identité du visage et cheveux.
2. **Plein pied de référence** — silhouette, proportions et morphologie apparente.

Le produit ne doit jamais présenter une génération comme fidèle à l'identité si ces références n'ont pas été utilisées.

## Pipeline Try-On

`portrait + plein pied + images produits -> VTO -> contrôle -> try-on validé`

Chaque look Signature / Équilibre / Smart produit une image indépendante du **même utilisateur**. Seuls les vêtements doivent changer.

Contrôles bêta :
- visage cohérent avec le portrait ;
- morphologie cohérente avec le plein pied ;
- pas d'amincissement/élargissement intentionnel ;
- couleur de peau et cheveux préservés ;
- vêtements reconnaissables et couleurs cohérentes ;
- mains/anatomie sans anomalie majeure.

## Pipeline Défilé

`try-on validé + portrait -> image-to-video -> contrôle -> vidéo`

Le défilé n'est jamais généré directement depuis une description textuelle du client. Le **Try-On validé est la première frame**. Le portrait reste une référence d'identité.

Mouvement MVP : marche lente, mouvement naturel du tissu, rotation légère 30–45°, pose finale. 5–8 secondes, vertical 9:16 en priorité.

## Providers à benchmarker

### Image / Try-On
- GPT Image 2 : édition photoréaliste, références image, jusqu'à 4K.
- Nano Banana 2 / Pro : image-to-image photoréaliste et références multiples.
- Seedream 4.5 : transformation contrôlée jusqu'à 4K.

Le benchmark doit utiliser exactement les mêmes portraits, plein-pieds et vêtements et noter : identité, morphologie, fidélité vêtement, anatomie, latence, coût.

### Vidéo / Défilé
- Seedance 2.0 : références image, cohérence d'identité, 4–15 s, jusqu'à 4K.
- Cinema Studio Video 3.0 : start image, 4–15 s, jusqu'à 4K.
- MiniMax H3 : start image + références image, 4–15 s, 2K.

## UX bêta

Sur chaque look :
- `Voir sur moi` -> génère/récupère le Try-On.
- onglets `PHOTO | DÉFILÉ`.
- `Générer mon défilé` uniquement après Try-On terminé et validé.
- le défilé n'est pas généré automatiquement pour les 3 budgets afin de maîtriser coût et latence.

## Stockage cible Firebase

`users/{uid}`

`profiles/{uid}` contient les données non-image et les références privées :
- `portraitStoragePath`
- `fullBodyStoragePath`

`tryons/{tryonId}` : userId, lookId, tier, source refs, product refs, provider, providerJobId, status, outputStoragePath, createdAt.

`runways/{runwayId}` : userId, tryonId, tier, portrait ref, provider, providerJobId, status, outputStoragePath, createdAt.

Les médias sont stockés dans Cloud Storage privé avec règles par UID. Les URLs publiques permanentes ne sont pas utilisées pour les photos client.

## Garde-fous

- consentement explicite avant upload/génération ;
- suppression des références et générations depuis le compte ;
- aucune inférence d'attribut sensible non nécessaire au stylisme ;
- aucune promesse de fidélité « 100 % » ;
- résultats IA clairement identifiés ;
- journalisation du provider/model/version pour pouvoir reproduire et auditer les tests.
