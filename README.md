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