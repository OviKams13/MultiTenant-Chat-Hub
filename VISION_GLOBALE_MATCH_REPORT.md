# Évaluation de correspondance – « Vision globale du projet »

## Portée analysée
- Branche analysée : `work`.
- Référence `main` : **indisponible localement** (aucune branche locale/remotes `main` résoluble dans ce dépôt).
- Donc l’évaluation ci-dessous compare la vision au **code actuel de la branche `work`**.

## Score global (estimation)
- **Correspondance globale : 84%**.

## Détail par axe

### 1) Vision produit multi-tenant (chatbots par propriétaire, isolation par owner/domain)
- **Match élevé (~90%)**.
- Le backend implémente bien : propriétaires, chatbots, unicité du domaine, ownership côté services, CRUD admin-scopé, blocs statiques/dynamiques, tags, endpoints browse user read-only.
- Le frontend et les routes backend montrent une architecture générique (non limitée à un seul cas métier).

### 2) Stack backend et organisation
- **Match partiel à fort (~80%)**.
- Match : Node.js, Express, TypeScript, Sequelize, JWT, MySQL visé, .env, structure modulaire (`routes/controllers/services/models/validations/middlewares/interfaces/types/tests`).
- Écart : la vision mentionne **Jest + Supertest**, alors que le script de test backend utilise surtout `node --test` (pas un setup Jest/Supertest standard déclaré dans `package.json`).
- Swagger/OpenAPI : présent via un spec exporté, mais pas encore branché sur une route docs active.

### 3) Schéma de données (roles/users/chatbots/bb_entities/static+dynamic/tags)
- **Match élevé (~88%)**.
- Les modèles clés existent et respectent globalement la vision : `roles`, `users`, `chatbots`, `bb_entities`, `bb_contacts`, `bb_schedules`, `bb_block_type_definitions`, `chatbot_items`, `tags`, `chatbot_item_tags`.
- Contrat hybride statique/dynamique (`entity_type`/`type_id`/`data`) effectivement implémenté côté services.
- Écart mineur : certaines contraintes SQL explicites (ex. CHECK détaillés) ne sont pas visibles comme contraintes fortes directement au niveau modèles.

### 4) Features API admin (auth/chatbots/static blocks/block types/dynamic instances/item tags)
- **Match très élevé (~95%)**.
- Les routes attendues sont présentes et protégées (`requireAuth`, `requireRole`) : auth, CRUD chatbots, contact/schedules, block types dynamiques, instances dynamiques, item tags, browse user read-only.
- La validation côté services est bien alignée avec le besoin (notamment blocs dynamiques).

### 5) Runtime end-user « domain + question -> retrieval -> IA réponse »
- **Match faible à moyen (~45%)**.
- L’objectif pipeline est bien cohérent avec la structure existante (domain, tags, entités, données contextuelles).
- **Mais** il n’y a pas, dans l’état actuel, d’endpoint runtime public de chat type `/api/v1/chat...` qui orchestre complètement ce flux IA (OpenAI/Gemini + classification + réponse).

### 6) Frontend / intégration globale plateforme
- **Match moyen (~70%)**.
- Le frontend existe et consomme des APIs backend.
- Mais on voit aussi une intégration Supabase dans le frontend ; ce n’est pas contradictoire avec la vision, mais ce n’est pas explicitement dans la stack backend décrite.

## Verdict court demandé
- **Oui, la vision “match” globalement avec le projet actuel, à ~84%.**
- Le principal manque pour arriver proche de 100% est la **feature runtime chat public complète** (domain -> query_tags -> retrieval -> IA -> answer) exposée côté backend.
