# 🎴 PokéVinted — Marketplace Pokémon Multi-NoSQL

> **Projet NoSQL — ENSIIE S3**  
> Une marketplace de cartes Pokémon haute performance inspirée de *Vinted* et *Cardmarket*, architecturée selon les principes du **Domain-Driven Design (DDD)** et orchestrée sous **Docker Compose**.  
> Persistance conjointe et cohérente sur **MongoDB**, **Elasticsearch** et **Redis**, avec supervision temps-réel via **Grafana**.

---

## 🌟 Fonctionnalités Clés

1. **Marketplace Moderne & Réactif (Style Vinted)** :
   * Consultation du catalogue officiel avec **images officielles HD** (*151, Flammes Obsidiennes, Écarlate et Violet, Faille Paradoxe*).
   * **Effet 3D Holographique interactif** au survol des cartes (inclinaison tilt et reflet spéculaire dynamique).
   * **Top 5 Tendances en Direct (Redis ZSET)** : classement temps réel des **annonces** les plus consultées, mis à jour à chaque consultation (`ZINCRBY` / `ZREVRANGE` sur `listings:trending_views`). Une annonce vendue ou supprimée est automatiquement retirée du classement (`ZREM`).
   * **Gestion de Sessions & Favoris (Redis)** :
     * Bascule instantanée de compte dresseur (Sacha, Ondine, Prof. Chen) avec session persistée en cache Redis (`TTL 24h`).
     * Favoris gérés par **annonce** via des ensembles Redis Sets (`SADD` / `SREM` / `SMEMBERS`).
   * **Indicateur de Benchmark de Latence** : affichage en direct du gain de performance (`⚡ Cache Redis HIT : 0.4 ms` vs `🔍 Elasticsearch : 12 ms`).
   * Recherche instantanée tolérante aux fautes de frappe (*fuzzy search*) avec filtres par série, état d'usure et tri par prix.

2. **Formulaire de Vente & Double Persistance (Consigne Enseignant)** :
   * Formulaire complet de publication d'annonce (choix de carte, état, prix, description, pseudo vendeur).
   * Lors de la soumission, la donnée est persistée instantanément dans :
     * 🟢 **MongoDB** : Source de vérité principale (Document Store JSON).
     * 🔵 **Elasticsearch** : Indexation immédiate pour recherche plein-texte et agrégations.
     * 🔴 **Redis** : Compteurs atomiques, flux FIFO des nouveautés et invalidation du cache.

3. **Synergie JSON MongoDB + Elasticsearch & Dashboards Grafana** :
   * **Pipeline Document JSON fluide** : le schéma JSON flexible de MongoDB est directement indexé par Elasticsearch sans transformation complexe ni jointure SQL lourde.
   * **Agrégations analytiques natives** : Elasticsearch calcule à la volée le prix moyen par extension, la distribution par état et les ratios actifs/vendus.
   * **Supervision Grafana (Port 3001)** : deux dashboards auto-provisionnés (datasources + dashboards par fichiers dans `grafana/provisioning/`, rien à configurer à la main).
     * **« PokéVinted — Analytics NoSQL & Elasticsearch »** — 5 panneaux orientés marché, rafraîchis toutes les 5 s et entièrement calculés par les agrégations Elasticsearch : GMV (chiffre d'affaires réalisé), annonces vendues, prix moyen global, carte la plus chère en vente, et ventes vs nouvelles annonces dans le temps.
     * **« PokéVinted — État des conteneurs »** — supervision temps-réel de la santé du stack **sans Prometheus ni conteneur supplémentaire** : une sonde dans le backend ping MongoDB / Elasticsearch / Redis / API toutes les 15 s et indexe le résultat (statut UP/DOWN + latence) dans l'index Elasticsearch `pokevinted_health`. Le dashboard affiche l'état UP/DOWN de chaque service, l'historique de disponibilité, la latence de ping et un journal des relevés. *Limite assumée : on mesure la joignabilité applicative des services (pas le CPU/RAM par conteneur) ; si Elasticsearch tombe, la sonde ne peut plus écrire — le trou dans la courbe signale alors lui-même l'indisponibilité d'ES.*

---

## 🏗️ Architecture & Synergie des 3 Systèmes NoSQL

```mermaid
flowchart LR
    subgraph Client
        React[Frontend React / Vite<br>:3000]
    end

    subgraph Backend
        API[FastAPI Clean DDD<br>:8000]
    end

    subgraph Stockage NoSQL
        Mongo[(MongoDB 7<br>:27017)]
        ES[(Elasticsearch 8<br>:9200)]
        Redis[(Redis 7<br>:6379)]
    end

    subgraph Observabilité
        Grafana[Grafana Dashboard<br>:3001]
    end

    React -->|REST API| API
    API -->|Document Store & Historique| Mongo
    API -->|Recherche plein-texte floue| ES
    API -->|Compteurs atomiques & Cache| Redis
    ES -.->|Data Source| Grafana
```

| Moteur NoSQL | Type | Rôle Métier |
| :--- | :--- | :--- |
| **MongoDB** | Document Store | **Source de vérité** : stocke le catalogue des cartes officielles, les fiches complètes des annonces et l'historique immuable des commandes. |
| **Elasticsearch** | Search Engine | **Recherche textuelle** : indexe les annonces avec analyseurs de texte, recherche floue (*fuzzy match* sur les noms de Pokémon et illustrateurs) et facettes. |
| **Redis** | In-Memory Key-Value | **Haute performance** : compteurs atomiques (`INCR`, `INCRBYFLOAT`), liste FIFO des dernières annonces (`LPUSH`), et suivi de popularité (*Sorted Sets*). |

---

## 🚀 Démarrage Rapide (En une seule commande)

### Prérequis
* [Docker](https://docs.docker.com/get-docker/) et [Docker Compose](https://docs.docker.com/compose/) installés.

### Lancer le projet
```bash
# 1. Clone repository
git clone <URL_DU_REPO_GITHUB>
cd PROJET_NO_SQL_ENSIIE_S3

# 2. Start full orchestration
docker compose up --build
```

> ℹ️ **Aucune configuration requise** : le `docker-compose.yml` embarque des valeurs par défaut sûres, donc `docker compose up` fonctionne immédiatement après le clone, sans créer de `.env`. Pour la production (VPS), copiez `.env.example` vers `.env` et personnalisez les mots de passe — ils écraseront alors les valeurs par défaut.

Au démarrage, un script d'amorçage (**seed**) peuple automatiquement le catalogue avec les cartes de référence et des annonces de départ (indexées en masse dans Elasticsearch via une requête *bulk*).

### Points d'accès de l'application
| Service | URL | Identifiants |
| :--- | :--- | :--- |
| **Marketplace (Frontend)** | `http://localhost:3000` | Accès libre |
| **Documentation API (Swagger)** | `http://localhost:8000/docs` | Accès libre |
| **Elasticsearch** | `http://localhost:9200` | Sans mot de passe |
| **Grafana** | `http://localhost:3001` | `admin` / `ChangeMe_Grafana_Admin_Password!` (défaut, surchargeable via `.env`) |

---

## 🔒 Sécurité & Architecture Production-Ready

Ce projet intègre les meilleures pratiques de sécurité DevOps pour éliminer les risques de fuite de données :

1. **Cloisonnement Réseau (Zero Public Exposure)** :
   * Les bases de données (**MongoDB**, **Redis**, **Elasticsearch**) ne sont **JAMAIS** exposées sur `0.0.0.0` (Internet public).
   * Les ports sont strictement bindés sur `127.0.0.1` (loopback hôte) pour l'inspection locale ou isolés dans le réseau Docker interne `pokevinted-internal`.
   * Un attaquant ou scanner de vulnérabilités (Shodan, Censys) ne peut pas sonder ou attaquer les bases depuis l'extérieur.
2. **Authentification Obligatoire (Anti-Ransomware)** :
   * **MongoDB** est verrouillé avec `admin_pokevinted` et un mot de passe fort via `authSource=admin`.
   * **Redis** est protégé avec `--requirepass` pour empêcher l'exécution de commandes non autorisées.
3. **Protection des Secrets & Logs** :
   * Aucun secret en dur dans le code git : les variables proviennent de `.env` (dans `.gitignore`).
   * `.env.example` sert de modèle pour le déploiement.
   * Les URIs de connexion sont masquées dans les logs applicatifs (`******`) pour éviter les fuites via `docker logs`.
4. **Contrôle des Ressources (Anti-OOM)** :
   * Des limites de mémoire (`mem_limit`) sont assignées à chaque conteneur pour garantir la stabilité sur un VPS restreint (2 à 4 Go RAM).

---

## 🎓 Guide d'Évaluation pour l'Enseignant (Soutenance)

Pour constater en direct la persistance multi-systèmes lors de la saisie d'un formulaire :

### Étape 1 : Publier une annonce sur l'interface
1. Ouvrez `http://localhost:3000`.
2. Cliquez sur **« Vendre une carte »** en haut à droite.
3. Remplissez le formulaire :
   * Choisissez par exemple **Dracaufeu ex (Illustration Spéciale)**.
   * Fixez un prix (ex : `150`).
   * Renseignez votre pseudo (ex : `Professeur_NoSQL`).
   * Cliquez sur **« Publier l'annonce sur PokéVinted »**.

---

### Étape 2 : Vérification dans les terminaux

Ouvrez **3 terminaux distincts** pour interroger chacun des 3 systèmes (utilisez les mots de passe définis dans votre `.env`, ou copiez-les directement en un clic depuis l'onglet **Admin Dashboard** du site) :

#### Terminal 1 — Constat de persistance dans **MongoDB**
```bash
docker exec -it pokevinted-mongodb mongosh -u admin_pokevinted -p ChangeMe_P0k3V1nt3d_M0ng0_P@ssw0rd! --authenticationDatabase admin pokevinted --eval "db.listings.find({seller_name: 'Professeur_NoSQL'}).pretty()"
```
> 👉 *L'annonce complète apparaît sous forme de document JSON BSON structuré.*

#### Terminal 2 — Constat d'indexation dans **Elasticsearch**
```bash
curl -s "http://localhost:9200/pokevinted_listings/_search?q=Professeur_NoSQL" | jq '.hits.hits[]._source | {id, card_name, price, seller_name, status}'
```
*(ou directement depuis le conteneur backend)* :
```bash
docker exec -it pokevinted-backend curl -s "http://elasticsearch:9200/pokevinted_listings/_search?q=Professeur_NoSQL"
```
> 👉 *Le document a été indexé en temps réel et est immédiatement requêtable.*

#### Terminal 3 — Constat des compteurs dans **Redis**
```bash
docker exec -it pokevinted-redis redis-cli -a ChangeMe_P0k3V1nt3d_R3d1s_T0k3n! MGET stats:active_listings stats:total_listings_created
```
```bash
# Check newly added cards in recent feed
docker exec -it pokevinted-redis redis-cli -a ChangeMe_P0k3V1nt3d_R3d1s_T0k3n! LRANGE listings:recent_ids 0 2
```
> 👉 *Les compteurs atomiques ont été incrémentés et l'ID de l'annonce est en tête de file.*

```bash
# Top 5 des annonces les plus consultées (Sorted Set temps réel)
docker exec -it pokevinted-redis redis-cli -a ChangeMe_P0k3V1nt3d_R3d1s_T0k3n! ZREVRANGE listings:trending_views 0 4 WITHSCORES
```
> 👉 *Le classement de popularité est tenu par un Redis Sorted Set, trié par nombre de consultations.*

---

## ⚠️ Limites Connues & Évolutions

* **Double écriture non atomique** : une publication d'annonce écrit séquentiellement dans MongoDB, puis Elasticsearch, puis Redis. Il n'existe **pas de transaction distribuée** couvrant les trois systèmes.
  * **Choix assumé** : **MongoDB est la source de vérité**. Elasticsearch et Redis sont des vues dérivées (recherche, cache, compteurs). Le classement de tendances filtre d'ailleurs à la lecture les annonces absentes ou vendues, pour ne jamais exposer un état incohérent avec Mongo.
  * **Conséquence** : en cas de panne temporaire d'Elasticsearch ou de Redis au moment de l'écriture, l'index de recherche ou les compteurs peuvent diverger de Mongo.
* **Pistes d'évolution** :
  * **Change streams MongoDB** pour propager automatiquement les écritures vers Elasticsearch (nécessite un *replica set* Mongo).
  * **[Monstache](https://github.com/rwynn/monstache)** : synchronisation continue MongoDB → Elasticsearch en side-car.
  * Un endpoint de **réindexation** reconstruisant l'index Elasticsearch à partir de MongoDB (*bulk*) pour réparer toute divergence.

---

## 🧪 Tests Automatisés (TDD)

L'application suit une rigoureuse méthodologie TDD (Domain & Use Cases isolés + intégration API).

Pour exécuter les tests :
```bash
cd backend
python -m pytest tests -v
```

---

## 🌐 Déploiement sur Serveur Cloud (VPS)

Pour déployer sur un VPS (OVH, Hetzner, DigitalOcean, AWS EC2, etc.) :

1. Se connecter en SSH à votre machine distante :
   ```bash
   ssh root@<IP_DU_SERVEUR>
   ```
2. Installer Docker et Docker Compose :
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Cloner et configurer l'environnement :
   ```bash
   git clone <URL_DU_REPO_GITHUB>
   cd PROJET_NO_SQL_ENSIIE_S3
   cp .env.example .env
   # Optional: customize production passwords in .env
   ```
4. Démarrer les conteneurs :
   ```bash
   docker compose up -d --build
   ```
5. L'application est immédiatement accessible publiquement sur `http://<IP_DU_SERVEUR>:3000`.

> 🌍 **Instance de démonstration déployée** : `http://<À_COMPLÉTER_APRÈS_DÉPLOIEMENT>`

---

## 👥 Équipe Projet
* **Membres** : Maxence Tournaud · Tony UY
* **Formation** : ENSIIE — Semestre S3
* **Module** : Bases de Données NoSQL