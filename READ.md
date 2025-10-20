Her er en **kort README** du kan paste direkte i repo’et (uden at nævne butik/brand).

---

# Horizon – fork workflow + Shopify CLI

## Formål

Arbejd på egne tilpasninger uden at publicere, og hold samtidig forken opdateret med Shopify’s ændringer i `Shopify/horizon`.

## Remotes

Forket repo har `origin`. Tilføj (eller bekræft) `upstream` til Shopify:

```bash
git remote -v
# hvis upstream mangler:
git remote add upstream https://github.com/Shopify/horizon.git
```

## Branch-strategi

* `main`: holdes identisk med `upstream/main` (ingen manuelle ændringer her).
* `custom`: alle egne tilpasninger.

Opret `custom`:

```bash
git fetch upstream
git checkout main
git merge --ff-only upstream/main
git push origin main

git checkout -b custom
git push -u origin custom
```

## Opdater med Shopify’s ændringer

Når der kommer nyt i `Shopify/horizon`:

```bash
git fetch upstream
git checkout main
git merge --ff-only upstream/main
git push origin main

git checkout custom
git merge main      # håndter conflicts, commit
git push
```

## Shopify CLI (udvikling uden at publicere)

Log ind og kør lokal preview med hot reload:

```bash
shopify login --store <your-store-url>
shopify theme dev
```

Push som *unpublished* tema (ligger i Theme Library, ikke live):

```bash
shopify theme push --unpublished --theme "Horizon Custom"
```

Opdatér samme *unpublished* tema senere (hurtig sync):

```bash
shopify theme push
```

(Valgfrit) Pull fra et eksisterende *unpublished* theme:

```bash
shopify theme pull --theme <theme-id-eller-navn>
```

## Filhygiejne

Versionér:

```
/assets
/sections
/snippets
/templates
/layout
/config/settings_schema.json
```

Undlad at versionere (miljøspecifik):

```
config/settings_data.json
```

Eksempel `.gitignore`:

```
config/settings_data.json
.DS_Store
.idea/
.vscode/
```

## Lint (valgfrit)

Installer og kør Theme Check for Liquid/JSON:

```bash
gem install theme-check
theme-check .
```

## Hurtig fejlfinder

* **Ser ikke ændringer?** Brug preview-linket fra `shopify theme dev`, eller åbn det *unpublished* tema i Theme Library.
* **Kommer til at publicere?** Brug kun `theme dev` og `theme push --unpublished`. Undgå `theme publish` indtil du er klar.

---
