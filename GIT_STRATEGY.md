# Stratégie Git & Conventions d'Ingénierie — NIAWLOU (Max It)

Ce guide définit les standards d'ingénierie logicielle et la stratégie Git applicables à l'ensemble de l'équipe durant le hackathon Max It Week et la phase de production.

---

## 1. Modèle de Branches (GitFlow Adapté)

Nous adoptons un modèle à double branche principale avec branches éphémères de fonctionnalités :

- **`main`** : Branche de production / démo jury. Elle ne reçoit que des fusions testées et stables, accompagnées d'un tag sémantique (ex: `v1.0.0-hackathon`).
- **`develop`** : Branche d'intégration continue. Les développeurs y fusionnent leurs travaux validés.
- **`feature/<nom-court>`** : Branche de fonctionnalité (ex: `feature/auth-jwt`, `feature/om-webhook`, `feature/order-lifecycle`).
- **`fix/<anomalie>`** : Branche de correction de bug (ex: `fix/payment-race-condition`).
- **`docs/<sujet>`** : Branche dédiée à la documentation et aux spécifications Swagger.

### Cycle de vie d'une fonctionnalité :
```bash
# 1. Se placer sur develop à jour
git checkout develop
git pull origin develop

# 2. Créer sa branche de travail
git checkout -b feature/order-management

# 3. Travailler et faire des commits atomiques selon Conventional Commits
git commit -m "feat(order): add measurement snapshot validation"

# 4. Rebaser sur develop avant fusion
git checkout develop
git pull origin develop
git checkout feature/order-management
git rebase develop

# 5. Fusionner proprement dans develop (via Pull Request ou fast-forward contrôlé)
git checkout develop
git merge --no-ff feature/order-management -m "chore(merge): integrate feature/order-management into develop"
```

---

## 2. Norme des Messages de Commit (Conventional Commits v1.0.0)

Chaque commit doit respecter strictement la syntaxe :
```text
<type>(<scope optionnel>): <description courte et impérative en minuscules>

[corps optionnel expliquant le 'pourquoi' et les impacts]

[pied de page optionnel, ex: BREAKING CHANGE ou Closes #12]
```

### Types autorisés :
| Type | Usage | Exemple |
| :--- | :--- | :--- |
| **`feat`** | Ajout d'une nouvelle fonctionnalité utilisateur ou API | `feat(payment): implement Orange Money advance verification webhook` |
| **`fix`** | Correction d'un bug ou d'une anomalie | `fix(order): prevent quotation acceptance if tailor status inactive` |
| **`docs`** | Modification de documentation ou spécification Swagger | `docs(swagger): document delivery mode DTO and schemas` |
| **`style`** | Formatage, points-virgules, indentation (sans impact logique) | `style(lint): format controllers with prettier` |
| **`refactor`**| Refonte de code sans changement de comportement | `refactor(domain): isolate Money value object from database entity` |
| **`test`** | Ajout ou correction de tests unitaires ou d'intégration | `test(order): add test suite for confection step transitions` |
| **`chore`** | Tâches de build, dépendances, configuration tooling | `chore(husky): configure commit-msg validation hook` |

---

## 3. Périmètres Recommandés (`scopes`)

- `auth` : Authentification, JWT, gestion des rôles (Client, Couturier, Admin)
- `order` : Gestion du cycle de vie des commandes et devis
- `payment` : Passerelle Orange Money, acomptes, soldes, webhooks
- `tailor` : Gestion du profil atelier, catalogue et modèles
- `measurement` : Carnet de mesures et instantané figé de commande
- `dispute` : Gestion des réclamations sous 48h et médiation
- `swagger` : Schémas et documentation interactive OpenAPI
- `db` : Schéma Prisma, migrations, scripts de seed

---

## 4. Outils de Contrôle de Qualité Automatisés

- **Commitlint** : Intercepte les commits et rejette tout message ne respectant pas la convention.
- **Husky** : Gère les hooks Git locaux (`pre-commit`, `commit-msg`).
- **Lint-staged & Prettier** : Formate automatiquement les fichiers modifiés avant commit.
