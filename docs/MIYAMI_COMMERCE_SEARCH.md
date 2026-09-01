# Miyami commerce search

Look&Go utilise Miyami WebSearch/SearXNG comme fournisseur principal pour retrouver des pages marchandes proches des looks générés.

Source amont : https://github.com/ankushthakur2007/miyami_websearch_tool

## Flux

`Try-On Look&Go -> /api/commerce/search -> Miyami /search-api -> filtrage strict des domaines marchands Look&Go -> résultats shopping`

Si Miyami ne répond pas, ne retourne aucun résultat exploitable ou dépasse le timeout :

1. Look&Go essaie Brave Search uniquement si `BRAVE_SEARCH_API_KEY` est configurée.
2. Look&Go bascule ensuite vers l'annuaire marchand interne pour éviter tout écran 503.
3. Le fallback n'invente jamais de produit, de prix ou de stock.

## Configuration

Par défaut, le client utilise :

`https://websearch.miyami.tech`

Variables disponibles :

- `MIYAMI_SEARCH_API_URL` : URL d'une instance Miyami compatible avec `/search-api`.
- `MIYAMI_SEARCH_TIMEOUT_MS` : timeout entre 2500 et 15000 ms, 9000 ms par défaut.
- `BRAVE_SEARCH_API_KEY` : fournisseur secondaire optionnel.

Pour une production plus indépendante, déployer le dépôt Miyami avec son `Dockerfile` / `render.yaml`, puis remplacer `MIYAMI_SEARCH_API_URL` par l'URL de cette instance.

## Règles de confiance

Les résultats Miyami ne sont jamais affichés tels quels. L'API Look&Go :

- filtre les résultats sur la liste de marchands autorisés pour Signature / Équilibre / Smart ;
- rejette les domaines inconnus ;
- déduplique les URLs ;
- conserve le marchand correspondant ;
- limite le nombre de résultats demandé par l'interface ;
- indique au client que prix, taille et stock doivent être vérifiés chez le marchand.

Le fournisseur de recherche n'est donc jamais autorisé à injecter un marchand non référencé dans le Look-Book.
