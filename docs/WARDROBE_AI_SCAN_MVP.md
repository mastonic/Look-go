# Look&Go — Scan Dressing IA (MVP)

## Objectif

Permettre à une cliente de photographier sa penderie et de transformer les vêtements visibles en pièces structurées dans son dressing numérique Look&Go.

## Parcours utilisateur

1. La cliente ouvre `/dressing`.
2. Elle ajoute 1 à 3 photos de penderie.
3. Les images sont compressées localement avant envoi.
4. `/api/ai/wardrobe-scan` vérifie la session Firebase puis envoie les images au moteur vision.
5. L’IA renvoie des vêtements structurés avec un score de confiance.
6. La cliente corrige si nécessaire : catégorie, type, couleur, motif, styles.
7. Elle peut ignorer une pièce ou un doublon probable.
8. Après validation seulement, les photos sources sont sauvegardées dans Firebase Storage et les pièces dans Firestore.
9. Le dressing est filtrable par catégories.

## Données reconnues

Chaque pièce peut contenir :

- catégorie principale ;
- sous-catégorie / type (robe, jupe, blazer, jean, etc.) ;
- couleur principale ;
- couleurs secondaires ;
- motif ;
- styles ;
- matière probable ;
- saisons ;
- occasions ;
- signature visuelle utile à la détection de doublons ;
- zone de détection normalisée ;
- score de confiance IA.

## Taxonomie principale

- Hauts
- Bas
- Robes
- Vestes & manteaux
- Chaussures
- Sacs
- Accessoires
- Ensembles
- Autres

La précision (ex. jupe midi, robe longue, blazer croisé) reste dans `subcategory` / `garmentType` afin de ne pas multiplier les collections Firestore.

## Stockage

Firestore :

`users/{uid}/wardrobe/{itemId}`

Storage :

`users/{uid}/wardrobe/...`

Les règles existantes limitent déjà l’accès au propriétaire du `uid`.

## Détection de doublons

Le MVP combine :

- catégorie ;
- sous-catégorie ;
- couleur principale ;
- motif ;
- `visualSignature` créée par le moteur vision.

Un score >= 0.78 affiche « Doublon possible ». La cliente garde la décision finale.

À terme, cette logique pourra être enrichie par un embedding visuel ou un hash perceptuel calculé sur le crop de chaque vêtement.

## Modèle IA

Le modèle est configurable :

`OPENAI_WARDROBE_MODEL=gpt-5.6-terra`

Le endpoint utilise l’API Responses avec images en entrée et Structured Outputs JSON Schema.

## Checklist avant merge production

- [ ] `npm run build` passe sans erreur.
- [ ] Profil bêta complet -> clic « Scanner mon dressing » -> `/dressing` sans refaire l’inscription.
- [ ] Utilisateur non reconnu -> connexion/onboarding normal.
- [ ] 1 photo Android : prévisualisation + analyse.
- [ ] 2 photos Android : les deux prévisualisations restent visibles.
- [ ] 3 photos Android : compression + analyse sans 413.
- [ ] Test iPhone Safari avec galerie/caméra.
- [ ] Penderie peu chargée : type et couleur corrects.
- [ ] Penderie chargée : pas d’invention excessive ; confidence baisse sur les pièces cachées.
- [ ] Correction manuelle d’une robe/jupe/couleur/style avant sauvegarde.
- [ ] « Ignorer » exclut bien la pièce de Firestore.
- [ ] Doublon probable affiché lorsqu’une pièce similaire existe déjà.
- [ ] Sauvegarde -> rechargement page -> pièces toujours présentes.
- [ ] Suppression d’une pièce -> disparition persistante.
- [ ] Vérifier latence et coût moyen sur 10 scans représentatifs.

## Étape suivante

Après validation du MVP, connecter `wardrobe` au moteur de création de looks afin que Look&Go commence systématiquement par les pièces réellement possédées avant de suggérer un achat.
