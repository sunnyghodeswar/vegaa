# Documentation Website Setup

## Overview

The Vegaa documentation website is built with Docusaurus and includes:

- ✅ Beautiful landing page with hero section
- ✅ Comprehensive documentation for all features
- ✅ All examples with Stackblitz integration
- ✅ GitHub Actions CI/CD for automatic deployment
- ✅ Responsive design with dark mode support

## Structure

```
website/
├── docs/                    # Documentation pages
│   ├── getting-started.md
│   ├── core-concepts/       # Core concepts documentation
│   ├── features/            # Feature documentation
│   ├── examples/            # Example pages (MDX with Stackblitz)
│   └── api-reference.md
├── src/
│   ├── pages/               # Custom pages (landing page)
│   ├── components/          # React components (StackblitzButton)
│   └── css/                 # Custom styles
├── static/                  # Static assets
└── docusaurus.config.ts     # Docusaurus configuration

.github/workflows/
└── deploy-docs.yml          # GitHub Actions CI/CD
```

## Features

### Landing Page

- Hero section with gradient background
- Feature cards highlighting key benefits
- Code comparison (Express vs Vegaa)
- Quick start section
- Call-to-action buttons

### Documentation

- Getting Started guide
- Core Concepts (Routes, Parameter Injection, Middleware, Context)
- Features (Express Compatibility, Plugins, Response Helpers, HTTP Client, Cluster Mode)
- Examples with Stackblitz integration
- Complete API Reference

### Stackblitz Integration

All examples include "Open in Stackblitz" buttons that:
- Link directly to the example file in the GitHub repo
- Open in Stackblitz for live editing
- Allow users to try examples without local setup

### CI/CD

GitHub Actions workflow:
- Triggers on pushes to `main` branch
- Only runs when `website/` files change
- Builds the site
- Deploys to GitHub Pages automatically

## Local Development

```bash
cd website
npm install
npm start
```

Visit `http://localhost:3000`

## Deployment

### Automatic (Recommended)

Push changes to `main` branch - GitHub Actions handles deployment.

### Manual

```bash
cd website
npm run build
npm run deploy
```

## Configuration

### GitHub Pages Setup

1. Go to repository Settings → Pages
2. Source: GitHub Actions
3. The workflow will deploy automatically

### Base URL

The site is configured for GitHub Pages at:
- URL: `https://sunnyghodeswar.github.io`
- Base URL: `/vegaa/`

If deploying elsewhere, update `docusaurus.config.ts`:

```ts
url: 'https://your-domain.com',
baseUrl: '/',
```

## Customization

### Colors

Edit `src/css/custom.css` to change the color scheme.

### Logo

Replace `static/img/logo.svg` with your logo.

### Favicon

Replace `static/img/favicon.ico` with your favicon.

## Stackblitz Links

Stackblitz links use this format:
```
https://stackblitz.com/github/sunnyghodeswar/vegaa/tree/main?file=examples/basic.js
```

To update the base URL, edit `src/components/StackblitzButton.tsx`.

## Adding New Documentation

1. Create a new `.md` or `.mdx` file in `docs/`
2. Add it to `sidebars.ts` for navigation
3. Use MDX for interactive components (like Stackblitz buttons)

## Troubleshooting

### Build Fails

- Check Node.js version (requires >= 20)
- Clear cache: `npm run clear`
- Delete `node_modules` and reinstall

### GitHub Pages Not Updating

- Check GitHub Actions workflow status
- Verify Pages settings (Source: GitHub Actions)
- Check `baseUrl` in `docusaurus.config.ts`

### Stackblitz Links Not Working

- Verify the file path exists in the repo
- Check the GitHub username in `StackblitzButton.tsx`
- Ensure the file is in the `main` branch

