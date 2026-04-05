# Kyx — Backend

API et serveur temps réel de l'application Kyx.

Interface administrateur (Next.js) : https://github.com/Mattox0/KYX-ADMIN

Application mobile (Expo) : https://github.com/Mattox0/Kyx-App

---

## Le projet

Ce backend expose l'API REST et le serveur WebSocket utilisés par l'application mobile et l'interface admin. Il gère les utilisateurs, les questions, les parties en ligne et les sessions de jeu en temps réel.

---

## Stack technique

| Domaine | Technologie |
|---|---|
| Framework | NestJS v11 |
| Langage | TypeScript |
| Base de données | PostgreSQL + TypeORM |
| Cache / Sessions | Redis + ioredis |
| Temps réel | Socket.IO |
| Auth | Better Auth |

---

## Modules

- **Jeux** — Vérité ou Défi, Je n'ai jamais, Préfères-tu
- **Modes** — catégories de questions gérées depuis l'admin (classique, adulte…)
- **Parties en ligne** — sessions Redis avec code à 6 caractères, lobby WebSocket
- **Utilisateurs** — profil, avatar, code ami
- **Amis** — demandes d'amis, liste
- **Signalements** — remontée de contenu inapproprié
- **Suggestions** — propositions de nouvelles questions
- **Admin** — gestion du contenu avec des comptes administrateurs séparés

---

## Développement

### Prérequis

- Node.js >= 20
- Docker

### Installation

```bash
cp .env.example .env   # Renseigner les variables d'environnement
docker compose up -d   # Lancer PostgreSQL et Redis
npm install
npm run auth:migrate   # Appliquer les migrations Better Auth
npm run start:dev      # Démarrer en mode watch
```

### Variables d'environnement

```
POSTGRES_HOST
POSTGRES_PORT
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DATABASE
POSTGRES_SSL

REDIS_PORT
REDIS_PASSWORD

PORT
```

---

## WebSocket

Namespace : `/game` — transport WebSocket uniquement.

**Connexion**

```js
const socket = io('/game', {
  auth: { token: '<session_token>' },
  query: { code: '<code_partie>' }
})
```

**Événements client → serveur**

| Événement | Description |
|---|---|
| `startGame` | Démarrer la partie (hôte uniquement) |
| `nextQuestion` | Passer à la question suivante (hôte) |
| `submitAnswer` | Envoyer une réponse `{ answer }` |
| `kickUser` | Expulser un joueur `{ userId }` (hôte) |

**Événements serveur → client**

| Événement | Description |
|---|---|
| `players` | Liste des joueurs connectés |
| `status` | Statut de la partie (`waiting`, `in_progress`…) |
| `game` | Données de la partie |
| `currentQuestion` | Question en cours |
| `answersCount` | Nombre de réponses reçues |
| `results` | Résultats quand tous ont répondu |
| `gameOver` | Fin de partie |
| `kicked` | Le joueur a été expulsé |
| `error` | Message d'erreur |

---

## Mise en production

```bash
npm run build
npm run start:prod
```

- **Google** — ajouter l'URL de callback dans la console Google Cloud
- **Apple** — [configuration Better Auth](https://www.better-auth.com/docs/authentication/apple)

Pour appliquer les migrations manuellement :

```bash
psql postgresql://<user>:<password>@<host>:5432/<database> -f better-auth_migrations/<fichier>.sql
```

## Traduire les questions avec Deepl : 

`npx tsx scripts/translate-questions.ts`
