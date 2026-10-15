# Règles de Développement & Architecture PokéVinted (ENSIIE S3 NoSQL)

Bienvenue sur le projet PokéVinted. Tout agent intervenant sur cette base de code doit respecter les directives suivantes.

## 1. Architecture Clean DDD (Domain-Driven Design)
Le backend Python est strictement découpé en 4 couches concentriques :
* `app/domain/` : Entités pures (`Card`, `Listing`, `Order`), Value Objects (`CardCondition`, `ListingStatus`), interfaces de repository abstraites et exceptions de domaine. **Zéro dépendance vers des frameworks ou des bases de données.**
* `app/application/` : Cas d'usage métier (`CreateListingUseCase`, `PurchaseListingUseCase`, `SearchListingsUseCase`, `GetAdminStatsUseCase`, `SeedCatalogUseCase`) et DTOs Pydantic.
* `app/infrastructure/` : Implémentations concrètes des repositories (`MongoListingRepository`, `ElasticSearchRepository`, `RedisCacheRepository`, etc.) et clients NoSQL.
* `app/interfaces/` : Routers FastAPI, gestionnaires d'erreurs HTTP et middlewares.

## 2. Rôles et Frontières des Systèmes NoSQL
Chaque moteur a un rôle précis et justifié :
1. **MongoDB (Source de vérité & Persistance documentaire)** :
   * Stocke les fiches complètes des cartes de référence, des annonces en vente et l'audit immuable des commandes.
   * Assure la consistance documentaire BSON.
2. **Elasticsearch (Moteur de recherche & Analytics Grafana)** :
   * Indexe les annonces en temps réel pour la recherche plein-texte floue (`fuzzy`), autocomplétion (`search_as_you_type`) et filtres multicritères.
   * Sert de datasource native pour les métriques de supervision de vente dans Grafana.
3. **Redis (Compteurs atomiques, Cache & Sessions)** :
   * Sessions utilisateurs et historique des favoris (`Set`).
   * Classement temps réel des cartes tendance via Sorted Sets (`ZSET`).
   * Compteurs atomiques de ventes (`INCRBYFLOAT`, `INCR`).
   * Cache de requêtes avec TTL et statut `HIT`/`MISS`.

## 3. Qualité, Typage et Tests (TDD)
* **Tests unitaires et d'intégration** : `python -m pytest` doit toujours passer à 100 %.
* **Linter** : `python -m ruff check app tests` sans aucun avertissement.
* **Typage strict** : `python -m mypy app` doit retourner 0 erreur.
* **Frontend** : React + Vite avec Vanilla CSS haut de gamme (thème sombre Pokémon/Vinted, effets 3D et holographiques sur les cartes rares).

## 4. Sécurité & Production-Ready
* **Zero Public Exposure** : Aucune base de données ne doit exposer de port sur `0.0.0.0`. Les ports sont strictement réservés à `127.0.0.1` ou cloisonnés dans le réseau Docker interne `pokevinted-internal`.
* **Authentification** : Toujours utiliser des identifiants sécurisés sur MongoDB (`authSource=admin`) et Redis (`--requirepass`).
* **Secrets** : Tous les mots de passe et clés doivent provenir de `.env` (gitignoré). Ne jamais hardcoder de mot de passe dans le code commité.

## 5. Style de Code & Commentaires (Humanizer & Anglais)
* **Commentaires et docstrings en anglais** : Tout le code (commentaires inline, docstrings Python, types, logs et messages de commit) doit être rédigé en anglais technique clair et concis.
* **Skill Humanizer** : Bannir le jargon artificiel ou bavard propre aux IA (pas de "let's dive into", "in this section we will...", ni de fioritures ou répétitions creuses). Écrire comme un développeur humain senior : sobre, direct, factuel.
