import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Vegaa',
  tagline: '⚡ A lightning-fast, zero-boilerplate Node.js framework',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://sunnyghodeswar.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/vegaa/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'sunnyghodeswar', // Usually your GitHub org/user name.
  projectName: 'vegaa', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/sunnyghodeswar/vegaa/tree/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Vegaa',
      logo: {
        alt: 'Vegaa Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://www.npmjs.com/package/vegaa',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/sunnyghodeswar/vegaa',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'API Reference',
              to: '/docs/api-reference',
            },
            {
              label: 'Examples',
              to: '/docs/examples',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'npm Package',
              href: 'https://www.npmjs.com/package/vegaa',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/sunnyghodeswar/vegaa',
            },
            {
              label: 'Issues',
              href: 'https://github.com/sunnyghodeswar/vegaa/issues',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'License',
              href: 'https://github.com/sunnyghodeswar/vegaa/blob/main/LICENSE',
            },
            {
              label: 'Author',
              href: 'https://github.com/sunnyghodeswar',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Vegaa. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
