# Queenbee, TP 1 : Lire les mesures sans bloquer

## Membres du Groupe

- D'ALMEIDA Abdoul Fadel
- SY EL-Housseine
- MAMAH-DJEDJE Faryd

## Objectif

Mesurer ce que subit un autre utilisateur pendant l'import d'un fichier de mesures (format NDJSON), d'abord en lecture bloquante (`readFileSync`), puis en flux (`createReadStream` + `readline`).

## Lancement

Depuis la racine du projet :

```bash
# Générer le fichier de 30 jours (144 000 lignes)
node scripts/generate-measures.js SN-CASA 2026-10-31 30

# Terminal 1 : serveur avec le fichier de 30 jours
node --watch tp/tp1-lecture/serveur-depart.js data/mesures-SN-CASA-2026-10-31_30j.ndjson

# Terminal 2 : sondes
node tp/tp1-lecture/sonde.js bloquant
node tp/tp1-lecture/sonde.js flux
```

Pour le fichier d'une journée, relancer le serveur sans argument :

```bash
node --watch tp/tp1-lecture/serveur-depart.js
```

## Contrôle

Les deux routes renvoient les mêmes valeurs :

| Fichier  | Mesures | Poids moyen (kg) |
|----------|---------|------------------|
| 1 jour   | 4 800   | 37,87            |
| 30 jours | 144 000 | 38,74            |

## Résultats

| Fichier  | Lecture   | Durée de l'import (ms) | Pire temps de /ping (ms) |
|----------|-----------|------------------------|--------------------------|
| 1 jour   | bloquante | 11                     | 4                        |
| 1 jour   | en flux   | 21                     | 5                        |
| 30 jours | bloquante | 321                    | 312                      |
| 30 jours | en flux   | 306                    | 4                        |

Les durées dépendent du poste utilisé.

## Questions

### 1. Pourquoi /ping attend-il pendant l'import bloquant ?

Node.js exécute le JavaScript dans un seul thread. `readFileSync`, le découpage en lignes et les 144 000 `JSON.parse` s'enchaînent sans jamais rendre la main à la boucle d'événements. La requête `/ping` reste donc en file d'attente jusqu'à la fin de l'import : 312 ms d'attente pour 321 ms d'import.

### 2. La lecture en flux est-elle plus rapide ? Sinon, qu'apporte-t-elle ?

Non : 306 ms contre 321 ms sur 30 jours, et elle est même plus lente sur 1 jour (21 ms contre 11 ms), car le découpage en morceaux a un petit coût. Elle apporte la réactivité : la boucle d'événements reprend la main entre deux morceaux, donc `/ping` est servi pendant l'import (4 ms au pire). Elle évite aussi de charger tout le fichier en mémoire.

### 3. Pourquoi l'effet est-il presque invisible avec le fichier d'une journée ?

Avec 4 800 lignes, l'import bloquant ne dure que 11 ms : le blocage est trop court pour être perçu, et le pire `/ping` est de 4 ms, comme en flux. L'effet n'apparaît que lorsque le travail synchrone devient assez long pour retarder les autres requêtes.





# Queenbee, TP 2 : Premières routes en mémoire

## Groupe

- D'ALMEIDA Abdoul Fadel
- SY EL-Housseine
- MAMAH-DJEDJE Faryd

## Objectif

Une API Express qui répond à ses premières requêtes HTTP sur quelques ruches gardées dans un tableau JavaScript. Pas de base de données : les données sont perdues à l'arrêt du serveur.

## Lancement

```bash
npm install
npm run dev
```

Le serveur écoute sur `http://localhost:3000`. Le script `dev` lance `node --watch`, qui redémarre le serveur à chaque enregistrement.

## Structure

```
src/
├── server.js                 démarre le serveur (port 3000)
├── app.js                    application Express : intergiciels et routes
├── middleware/requestLogger.js
├── data/hives.js             ruches et mesures en mémoire
└── routes/hives.js           routes /api/hives
collection/
└── queenbee.http             requêtes de test (extension REST Client)
```

## Routes

| Route | Comportement | Codes |
|-------|--------------|-------|
| `GET /health` | Répond `{ "status": "ok" }` | 200 |
| `GET /api/hives` | Toutes les ruches ; avec `?site_id=SN-CASA`, seulement celles de ce site | 200 |
| `GET /api/hives/:id` | La ruche demandée | 200 ; 404 si elle n'existe pas |
| `POST /api/hives/:id/measures` | Enregistre la mesure et la renvoie | 201 ; 400 si `timestamp` ou `weight_kg` manque ; 404 si la ruche n'existe pas |

Règles du `POST` :

- Seuls `timestamp` et `weight_kg` sont obligatoires.
- Si la trame contient un `hive_id`, il doit être celui du chemin, sinon 400.
- Le `timestamp` de la trame est conservé tel quel : c'est l'instant où le capteur a pris la mesure, pas celui où le serveur l'a reçue.

## Journalisation

Nous avons écrit un intergiciel `requestLogger` (`res.on("finish", …)` et `req.originalUrl`), puis essayé `morgan("dev")`.

| | `requestLogger` | `morgan("dev")` |
|---|---|---|
| Exemple | `2026-11-19T13:20:24.021Z POST /api/hives/SN-CASA-001/measures 201 147.3 ms` | `POST /api/hives/SN-CASA-001/measures 201 147.331 ms - 257` |
| Date | oui (ISO 8601) | non |
| Statut | en texte simple | coloré selon le code |
| Taille de la réponse | non | oui (`- 257`) |

**Choix : `requestLogger`.** Il contient tout ce que demande le sujet (date, méthode, URL complète, statut, durée) et la date permet de relire un journal après coup. morgan est plus pratique à lire en direct grâce aux couleurs, mais il n'affiche pas la date. Nous n'en gardons qu'un seul, sinon chaque requête apparaîtrait deux fois.

## Vérifications

- [x] `GET /api/hives?site_id=SN-CASA` ne renvoie que des ruches de SN-CASA
- [x] `GET /api/hives/XX-NOPE-999` renvoie 404
- [x] Une mesure créée renvoie 201, pas 200
- [x] Chaque requête apparaît une seule fois dans le journal

## Collection de requêtes

`collection/queenbee.http` contient 10 requêtes, une par route, cas d'erreur compris (ruche inconnue, mesure sans `timestamp`, mesure sans `weight_kg`, `hive_id` différent du chemin). Elle s'utilise avec l'extension VS Code REST Client. Aucun jeton ni mot de passe.