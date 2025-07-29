# Update Storefront Translations

## Instructions

This guide helps you translate English strings in theme locale JSON files into multiple languages for storefront-facing content.

## Usage

1. Create the translation data structure
2. Run the translation script

## Step 1: Create Translation Data Structure

You must translate English strings in a JSON object into multiple languages.
Use the following structure to create the file `scripts/translation-data.json`:

```json
{
  "sourceStructure": {
    "actions": {
      "add": "Add",
      "add_to_cart": "Add to cart"
    },
    "blocks": {
      "contact_form": {
        "name": "Name",
        "email": "Email"
      }
    }
  },
  "wordTranslations": {}
}
```

Inside the `wordTranslations` key, match the structure in `sourceStructure`, but add a translation for each language.

## Getting Language Codes

You can use the following command to get the list of language codes:

```bash
ls locales/*.json | grep -v schema | grep -v en.default.json | sed 's|locales/||g' | sed 's|\.json||g'
```

## Constraints

- Match the sourceStructure in the wordTranslations
- Have each leaf key's value be an object that includes translations for each of the languages
- Do not read any other files
- Only add translations for the keys in sourceStructure
- Never add any other keys

## Step 2: Run the Translation Script

After creating the `scripts/translation-data.json` file, run:

```bash
node scripts/update-translations.js
```

This will update all locale translation files with the new translations.

## Example

For a `sourceStructure` with:

```json
{
  "actions": {
    "add": "Add"
  }
}
```

The `wordTranslations` would look like:

```json
{
  "actions": {
    "add": {
      "fr": "Ajouter",
      "es": "Añadir",
      "de": "Hinzufügen"
      // ... other languages
    }
  }
}
```

## Tips

- Use CMD+SHIFT+V to paste the JSON structure into cursor as plain text
- The script will automatically delete the `translation-data.json` file after completion
- This is for storefront translations (customer-facing text), not schema translations
