# Update Schema Translations

## Instructions

This guide helps you translate English strings in theme schema JSON files into multiple languages.

## Usage

1. Create the translation data structure
2. Run the translation script with the schema flag

## Step 1: Create Translation Data Structure

You must translate English strings in a JSON object into multiple languages.
Use the following structure to create the file `scripts/translation-data.json`:

```json
{
  "sourceStructure": {
    "categories": {
      "banners": "Banners",
      "decorative": "Decorative",
      "storytelling": "Storytelling"
    },
    "content": {
      "advanced": "Advanced",
      "some_key": {
        "child_key_1": "Child key 1"
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
ls locales/*.schema.json | grep -v en.default.schema.json | sed 's|locales/||g' | sed 's|\.schema\.json||g'
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
node scripts/update-translations.js --schema
```

This will update all schema translation files with the new translations.

## Example

For a `sourceStructure` with:

```json
{
  "categories": {
    "banners": "Banners"
  }
}
```

The `wordTranslations` would look like:

```json
{
  "categories": {
    "banners": {
      "fr": "Bannières",
      "es": "Banners",
      "de": "Banner"
      // ... other languages
    }
  }
}
```

## Tips

- Use CMD+SHIFT+V to paste the JSON structure into cursor as plain text
- The script will automatically delete the `translation-data.json` file after completion
