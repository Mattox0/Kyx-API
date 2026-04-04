# Ajouter une nouvelle langue

Exemple : ajout de l'espagnol (`es`).

---

## 1. API — `Kyx-BO`

**`src/config/languages.ts`**

```ts
// Avant
export const SUPPORTED_LOCALES = ['fr', 'en'] as const;

// Après
export const SUPPORTED_LOCALES = ['fr', 'en', 'es'] as const;
```

C'est tout côté API. La locale est désormais validée automatiquement partout (détection via `Accept-Language`, filtres `locale_status`, stats).

---

## 2. Admin — `Kyx-ADMIN`

**`src/config/languages.ts`**

```ts
// Avant
export const SUPPORTED_LOCALES = ['fr', 'en'] as const;
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
};

// Après
export const SUPPORTED_LOCALES = ['fr', 'en', 'es'] as const;
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
};
```

Les formulaires (`TranslationFields`) et les badges (`TranslationBadges`) affichent la nouvelle langue automatiquement.

---

## 3. App mobile — `Kyx-APP`

Rien à faire pour l'instant — le système de changement de langue n'est pas encore intégré.

Quand ce sera le cas, mettre à jour le header `Accept-Language` dans `src/lib/api.ts` dynamiquement selon la langue choisie par l'utilisateur.

---

## Résumé

| Projet | Fichier | Changement |
|--------|---------|------------|
| Kyx-BO | `src/config/languages.ts` | Ajouter `'es'` dans `SUPPORTED_LOCALES` |
| Kyx-ADMIN | `src/config/languages.ts` | Ajouter `'es'` dans `SUPPORTED_LOCALES` + label dans `LOCALE_LABELS` |
| Kyx-APP | _(plus tard)_ | Passer la locale choisie dans `Accept-Language` |

Aucune migration de base de données n'est nécessaire — les tables de traduction acceptent n'importe quelle valeur de `locale`.
