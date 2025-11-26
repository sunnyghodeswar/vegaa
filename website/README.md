# Vegaa Documentation Website

This is the documentation website for Vegaa, built with [Docusaurus](https://docusaurus.io/).

## Development

```bash
cd website
npm install
npm start
```

This starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
cd website
npm run build
```

This generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

The site is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the `main` branch.

Manual deployment:

```bash
cd website
npm run deploy
```

## Structure

- `docs/` - Documentation pages
- `src/pages/` - Custom pages (landing page)
- `src/components/` - React components
- `static/` - Static assets
