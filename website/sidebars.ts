import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    'getting-started',
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'core-concepts/overview',
        'core-concepts/routes',
        'core-concepts/parameter-injection',
        'core-concepts/middleware',
        'core-concepts/context',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/express-compatibility',
        'features/plugins',
        'features/response-helpers',
        'features/http-client',
        'features/cluster-mode',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/basic',
        'examples/crud',
        'examples/middleware',
        'examples/express-middleware',
        'examples/response-helpers',
        'examples/http-client',
      ],
    },
    'api-reference',
  ],
};

export default sidebars;
