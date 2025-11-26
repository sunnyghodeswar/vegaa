# Add Rocket Icon

## Quick Setup

To add your rocket icon to the documentation site:

1. **Place your rocket icon file here:**
   ```
   website/static/img/rocket-icon.png
   ```

2. **Recommended formats and sizes:**
   - **PNG**: 200x200px or larger (for logo)
   - **SVG**: Best for scalable logo (recommended)
   - **ICO**: 16x16, 32x32, 48x48 (for favicon)

3. **After adding the file, update these files:**

   **`website/docusaurus.config.ts`:**
   ```typescript
   favicon: 'img/rocket-icon.png',
   
   logo: {
     src: 'img/rocket-icon.png',
     srcDark: 'img/rocket-icon.png',
   },
   
   image: 'img/rocket-icon.png',
   ```

4. **Rebuild the site:**
   ```bash
   cd website
   npm run build
   ```

## Current Status

Currently using fallback files:
- Favicon: `favicon.ico` (default Docusaurus favicon)
- Logo: `logo.svg` (default Docusaurus logo)

Once you add `rocket-icon.png`, update the config and rebuild!


