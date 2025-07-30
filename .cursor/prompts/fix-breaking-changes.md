# Breaking Changes Fix Command

## Command: Fix Shopify Theme Breaking Changes

### Prerequisites

- `breaking-changes.md` file exists in project root with fix instructions
- Modify files in the `templates/` folder and `config/settings_data.json`
- Use scripts when possible, clean up temporary files afterward

### Step-by-Step Process

1. **Analyze Breaking Changes Documentation**

   - Read the `breaking-changes.md` file to understand what needs to be fixed
   - Identify the specific changes required based on the documentation

   **Look for:**

   - Settings that need to be removed
   - Block types that need to be changed
   - Property values that need to be updated
   - Context changes (e.g., `closest.product` vs explicit settings)

2. **Create Adaptable Fix Script Template**
   Create `scripts/fix-breaking-changes.js` and customize the `applyFixes` function based on breaking-changes.md:

   ```javascript
   #!/usr/bin/env node
   const fs = require('fs');
   const path = require('path');
   const templatesDir = './templates';
   const configFile = './config/settings_data.json';

   // ========================================
   // CUSTOMIZE THIS SECTION BASED ON breaking-changes.md
   // ========================================
   function applyFixes(obj) {
     if (typeof obj !== 'object' || obj === null) return obj;
     if (Array.isArray(obj)) return obj.map(applyFixes);

     const result = { ...obj };

     // ADD YOUR BREAKING CHANGE FIXES HERE
     // Examples based on common patterns:

     // 1. Remove specific settings (adapt key/value as needed)
     if (result.settings) {
       // Example: Remove closest.product/collection references
       // if (result.settings.product === "{{ closest.product }}") delete result.settings.product;
       // if (result.settings.collection === "{{ closest.collection }}") delete result.settings.collection;
       // Example: Remove deprecated settings
       // delete result.settings.deprecated_setting;
     }

     // 2. Update block types (adapt old/new types as needed)
     // Example: Change block types in specific contexts
     // if (result.type === 'old-block-type') result.type = 'new-block-type';

     // 3. Update setting values (adapt property/old/new values as needed)
     // if (result.settings && result.settings.some_property === 'old-value') {
     //   result.settings.some_property = 'new-value';
     // }

     // 4. Rename properties (adapt old/new property names as needed)
     // if (result.old_property_name) {
     //   result.new_property_name = result.old_property_name;
     //   delete result.old_property_name;
     // }

     // Recursively process nested objects
     for (const key in result) {
       if (typeof result[key] === 'object' && result[key] !== null) {
         result[key] = applyFixes(result[key]);
       }
     }

     return result;
   }
   // ========================================
   // END CUSTOMIZATION SECTION
   // ========================================

   function processTemplateFile(filePath) {
     try {
       console.log(`Processing ${filePath}...`);
       const content = fs.readFileSync(filePath, 'utf8');

       // Preserve comment headers
       const commentMatch = content.match(/^(\/\*[\s\S]*?\*\/)\s*/);
       const comment = commentMatch ? commentMatch[1] : '';
       const jsonContent = commentMatch ? content.slice(commentMatch[0].length) : content;

       // Parse and apply fixes
       const data = JSON.parse(jsonContent);
       const processedData = applyFixes(data);

       // Write back with preserved formatting
       const updatedJsonContent = JSON.stringify(processedData, null, 2);
       const updatedContent = comment ? comment + '\n' + updatedJsonContent : updatedJsonContent;

       fs.writeFileSync(filePath, updatedContent);
       console.log(`✓ Updated ${filePath}`);
     } catch (error) {
       console.error(`Error processing ${filePath}:`, error.message);
     }
   }

   function processConfigFile(filePath) {
     try {
       console.log(`Processing ${filePath}...`);
       const content = fs.readFileSync(filePath, 'utf8');
       const data = JSON.parse(content);
       const processedData = applyFixes(data);

       const updatedContent = JSON.stringify(processedData, null, 2);
       fs.writeFileSync(filePath, updatedContent);
       console.log(`✓ Updated ${filePath}`);
     } catch (error) {
       console.error(`Error processing ${filePath}:`, error.message);
     }
   }

   function main() {
     console.log('🔧 Fixing breaking changes in template files and config...\n');

     // Process template files
     const files = fs.readdirSync(templatesDir);
     const jsonFiles = files.filter((file) => file.endsWith('.json'));

     if (jsonFiles.length > 0) {
       console.log(`Found ${jsonFiles.length} template files to process:\n`);
       jsonFiles.forEach((file) => {
         const filePath = path.join(templatesDir, file);
         processTemplateFile(filePath);
       });
     } else {
       console.log('No JSON template files found.');
     }

     // Process config file
     if (fs.existsSync(configFile)) {
       console.log(`\nProcessing config file: ${configFile}`);
       processConfigFile(configFile);
     } else {
       console.log(`\nConfig file not found: ${configFile}`);
     }

     console.log('\n✅ All template files and config have been processed!');
     console.log('Next: Run theme check to verify fixes');
   }

   if (require.main === module) main();
   ```

3. **Customize the Fix Script**
   Based on your `breaking-changes.md` analysis, uncomment and modify the relevant fix patterns in the `applyFixes` function.

   **Common Fix Patterns:**

   - **Settings Removal**: `if (result.settings.key === 'value') delete result.settings.key;`
   - **Block Type Changes**: `if (result.type === 'old-type') result.type = 'new-type';`
   - **Value Updates**: `if (result.settings.prop === 'old') result.settings.prop = 'new';`
   - **Property Renaming**: `result.newName = result.oldName; delete result.oldName;`

4. **Execute Fix Script**

   ```bash
   node fix-breaking-changes.js
   ```

5. **Verify Fixes**

   ```bash
   shopify theme check --fail-level error
   ```

6. **Review and Iterate**
   If theme check still shows errors:

   - Analyze remaining issues
   - Update the `applyFixes` function
   - Re-run the script
   - Verify again

7. **Handle Issues Outside Templates and Config**
   If theme check still fails after template and config fixes, some issues may require changes outside the `templates/` folder and `config/settings_data.json`.

   **STOP HERE** and:

   - Run theme check again to capture remaining errors
   - Analyze which files outside `templates/` and `config/` need changes
   - Identify what specific changes are required

   **Create a summary report:**

   - List which files outside `templates/` and `config/` need changes
   - Document what specific changes are required
   - Note that these fixes require manual intervention
   - Examples of files that might need fixes:
     - `sections/*.liquid`
     - `blocks/*.liquid`
     - `snippets/*.liquid`
     - `assets/*.js` or `assets/*.css`
     - Schema files in `schemas/`

   **Report format:**

   🚫 BREAKING CHANGES REQUIRING MANUAL FIXES OUTSIDE TEMPLATES/ AND CONFIG/

   The following issues cannot be resolved by modifying templates/ and config/ only:

   1. [File path] - [Description of required change]
   2. [File path] - [Description of required change]

   These require manual review and fixes in non-template and non-config files.

8. **Clean Up**

   ```bash
   rm scripts/fix-breaking-changes.js
   # Keep remaining-issues.txt if there are unresolved issues
   ```

### Expected Outcome

- All breaking changes in template files and config are fixed
- Theme check passes with no errors
- Template files and config follow new architecture requirements
- Temporary files are cleaned up

### Framework Benefits

- **Adaptable**: Easily customizable for any breaking change type
- **Reusable**: Same process works for future releases
- **Safe**: Preserves JSON formatting and comment headers
- **Comprehensive**: Handles nested objects and arrays recursively
- **Targeted**: Modifies both templates and config as required

### Notes for Future Use

1. **Always start** by thoroughly reading `breaking-changes.md`
2. **Identify patterns** in the breaking changes (settings removal, type changes, etc.)
3. **Use the template** and customize the `applyFixes` function accordingly
4. **Test incrementally** - run theme check after each fix type
5. **Document your fixes** in the script comments for future reference
