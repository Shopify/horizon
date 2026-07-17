# The empresas (B2B) page

**Date:** 2026-07-17
**Status:** Approved design, pending implementation plan
**Scope:** A new `empresas` page — marketing content plus a quote-request form.

## Problem

The `f8618baa` prototype specifies an Empreses (B2B) screen — wireframes `1k` (mobile blocks) and
`1l` (desktop variant). The theme has no such page. Businesses looking for event catering, corporate
gifts, wholesale or team building have nowhere to land and no way to ask for a quote.

The page is a **marketing page with a lead form**. It is not Shopify B2B commerce: no company
profiles, no wholesale price lists, no net terms, no B2B accounts. Nothing on it is transactional —
per the prototype brief, "Empreses = quote", never cart.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Page type | Marketing page + lead form | Confirmed scope. Keeps this to one spec. |
| Lead delivery | Shopify's `{% form 'contact' %}` → store email | No app, no CRM, no third party. Accepts custom fields. |
| Component style | Custom Liquid blocks wired into the theme | Purpose-built blocks that register as theme blocks, so they stay merchant-editable. |
| Granularity | Small block family + JSON template | Blocks are reusable on the Ocasions/Lots pages, which need near-identical quote forms. |
| Contact field | Split into email (required) + phone (optional) | The wireframe's combined field cannot work. See below. |
| Credibility band | Built, but empty by default | No fabricated social proof ships. See below. |
| Input styling | Horizon's inputs, brand tokens | Consistent with the contact page; no new CSS. Gives up the ruled-line motif. |
| Copy location | Schema defaults, not `locales/` | Bespoke bilingual store copy must stay merchant-editable. |

## Two problems the wireframe leaves open

### The combined "Contacto" field cannot work

Wireframes `1k`/`1l` draw a single `Contacto` field hinting "email o teléfono". Shopify's contact
form delivers the enquiry by email and uses `contact[email]` as the reply-to; a phone number there
fails validation, and a lead that arrives with no email address cannot be answered.

**Resolution:** split into `Email` (required, validated) and `Teléfono` (optional). This departs
from the drawn field count but preserves its intent — reach me, and let me ask for a call.

### The credibility band has no real data

The wireframe annotates the band as "client logos [need permissions], event photos, numbers [real
data or omit]", and its copy is literally `[n] eventos servidos` / `[n] cookies / semana`. Inventing
figures or showing client logos without permission is a liability on a page whose entire job is
persuading businesses to trust the bakery.

**Resolution:** build the band as editable blocks, but ship no unverified content in it. Nothing
false goes live; Miona populates it from the theme editor once she has cleared logos and real
figures.

Precisely what ships:

- **Client logos:** zero blocks. The slot exists; the merchant adds `image` blocks when permissions
  are cleared.
- **`[n] eventos servidos`, `[n] cookies / semana`:** zero blocks. These need real data.
- **`24h respuesta`:** ships as one populated `b2b-figure`. This claim is exempt because it is a
  promise the store controls, not third-party data, and it is already repeated in the hero and under
  the submit button — omitting it here alone would be inconsistent.

So the band renders with exactly one figure on install, and grows as the merchant fills it.

## Architecture

A custom page template composed of Horizon's generic `section.liquid` wrappers, filled with three
purpose-built B2B blocks. Nothing forks Horizon; the blocks slot into its existing block system, so
the theme editor treats them like any other block and upstream merges stay clean.

```
templates/page.empresas.json
  section "hero"         → native hero + text + button      "Mionas per a empreses"
  section "ofertes"      → 4× b2b-offer-card                Qué hacemos

  section "pressupost"   content_direction: row             Credibilidad + cómo
                         vertical_on_mobile: true             trabajamos + formulari
    ├ group (column)     → native image × 0 (logos)
    │                      + 1× b2b-figure ("24h respuesta")
    │                      + 3× b2b-figure (process steps)
    └ b2b-quote-form                                        Formulari de pressupost

  section "contacte"     → native text + button (secondary) phone / WhatsApp / email

blocks/b2b-offer-card.liquid
blocks/b2b-figure.liquid
blocks/b2b-quote-form.liquid
```

### The two-column zone is one section, not three

`1l` puts the form **beside** the credibility and process content: B2B visitors convert on the first
screen-and-a-half, so there must be no long scroll to the form. Three separate stacked sections
cannot express that — sections stack vertically, so desktop would silently render in mobile order and
the layout rationale would be lost.

Credibility, process and form are therefore **one** section, using settings that already exist on
`sections/section.liquid`:

- `content_direction: row` — side by side on desktop (`1l`).
- `vertical_on_mobile: true` (the default) — stacks to credibility → process → form on mobile,
  which is exactly `1k`'s order.

A `group` block (itself `content_direction: column`) holds the left-hand column. This keeps the
"no new CSS" promise honest; three stacked sections would force custom CSS to claw them back
side-by-side.

`sections/hero.liquid` accepts `text` and `button` blocks and is only disabled in header groups, so
it works unmodified on a page template.

### The hero anchor

The hero CTA scroll-jumps to the form rather than loading a page. Horizon's `button` block exposes
`link` as a Shopify `url` setting, which does not reliably accept a bare `#pressupost` fragment. Use
the page-relative form: **`/pages/empresas#pressupost`**. `url` settings accept relative paths, the
merchant can still edit it, and it depends only on the `empresas` handle already required at handoff.

The contact section's button renders **secondary**, so the hero's quote CTA remains the page's single
primary action.

### Why three blocks and not four

`b2b-figure` covers both the credibility stats and the "cómo trabajamos" steps. They read as two
zones but are structurally one component — a short lead token plus a caption (`24h` + `respuesta`;
`1` + `Cuéntanos qué necesitas`). Two block types with identical markup would be duplication for no
gain.

### The blocks

**`b2b-offer-card`** — image, heading, body, optional link. Four instances: Esdeveniments i càtering,
Regals d'empresa, Oficines i wholesale, Team building. The team-building card links to the existing
Cursos line rather than inventing a product (`1k` annotation 2).

**`b2b-figure`** — figure text plus caption. Used for stats and process steps.

The credibility band's client logos need no new block: Horizon's native `image` block already does
image-with-link. The band is therefore native `image` blocks plus `b2b-figure` stats.

**`b2b-quote-form`** — the only non-trivial component. Detailed below.

## The quote form

One block, one `{% form 'contact' %}`. The form cannot be decomposed into per-field blocks: `{% form %}`
must wrap every input.

| Field | Name | Type | Required |
| --- | --- | --- | --- |
| Què necessites? | `contact[Servicio]` | select | yes |
| Empresa | `contact[Empresa]` | text | yes |
| Email | `contact[email]` | email | yes |
| Teléfono | `contact[phone]` | tel | no |
| Fecha / volumen | `contact[Fecha y volumen]` | text | no |

Submit: `Demanar pressupost`. Beneath it: `Respuesta en 24h laborables`.

**Field naming is load-bearing.** Shopify emails every `contact[*]` pair to the store and prints the
raw key as the label. `contact[Empresa]` arrives as a readable "Empresa" line; `contact[body_2]`
would not. Keys are human-worded for whoever reads the lead.

**Routing.** The select carries the four pipelines — Esdeveniments i càtering, Regals d'empresa,
Subscripció / wholesale, Team building — behind a `Selecciona…` placeholder. Its value lands in the
notification email and Miona filters on it: one form, four pipelines (`1k` annotation 4). No CRM, no
app, no tagging integration.

**Visible labels.** Horizon's `contact-form.liquid` hides labels (`visually-hidden`) and relies on
placeholders. This form uses visible labels: the prototype brief lists "form labels always visible"
as a non-negotiable, and placeholder-only labels vanish on first keystroke — worse on a form asking
for volumes and dates.

**Anchor.** The form takes a stable `id="pressupost"`. The hero's single primary CTA scroll-jumps to
it, satisfying "exactly one primary CTA per screen" with no extra page load.

**Out of scope:** pre-filling the dropdown from URL parameters. Nothing in the wireframe needs it.

## Styling

The blocks consume existing design-system tokens via `{% stylesheet %}`, the convention
`contact-form.liquid` already uses. `assets/design-tokens.css` is loaded and preloaded in
`snippets/stylesheets.liquid`, and `design-system-bridge` renders at `layout/theme.liquid:32` after
`theme-styles-variables`, so every token is live at `:root` on every page.

- Cards: `--card-base-radius`, `--card-base-background`, `--card-base-border-color`, `--card-base-shadow`
- Inputs: `--color-input-*`, as elsewhere in the theme
- Buttons: already pill-shaped and brand-aligned through the bridge
- Type: the bridged presets

**No new bridge, no new tokens, no page-specific stylesheet.**

## Error handling

Mirrors `contact-form.liquid`:

- A `form_id` check so errors surface only on this form.
- `form.errors` → error banner with `autofocus` and `tabindex="-1"`.
- `form.posted_successfully?` → success state, same focus treatment, carrying the 24h promise. No
  dead end.
- Email validated client-side (`required`) and by Shopify server-side. The select rejects the
  `Selecciona…` placeholder.

## Verification

A Shopify theme has no test framework. "Done" means `shopify theme check` passes and a manual pass
on `shopify theme dev` confirms:

1. Empty submit → select, Empresa and Email all error.
2. Invalid email → error, form does not post.
3. Valid submit → success state; the lead email arrives with readable `Empresa` / `Servicio` labels.
4. Hero CTA scrolls to the form (does not reload the page).
5. Mobile stacks in `1k` order; desktop renders form-beside-credibility per `1l`.
6. Theme editor: blocks add, remove and reorder; the credibility band shows only `24h respuesta`,
   with no logos and no invented counts.
7. Only one primary button on the page; the contact fallback reads as secondary.

## Handoff

The template does not ship the page. Three merchant actions in Shopify admin:

1. Create a page with handle **`empresas`**.
2. Assign it the **empresas** template.
3. Add **"Empresas"** to the main menu.

Without these the page exists in the theme but is unreachable.

## Out of scope

Shopify B2B commerce (company profiles, price lists, net terms). Real client logos and figures
(merchant-supplied later). CRM or marketing-app integration. Migrating the contact page to the
design system's ruled-line inputs. The Ocasions and Lots de Nadal pages, which have similar quote
forms and should reuse `b2b-quote-form` in a later pass.
