import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          <img
            src="/vegaa/img/rocket-icon.png"
            alt="Vegaa Rocket"
            style={{
              height: '60px',
              width: '60px',
              marginRight: '15px',
              verticalAlign: 'middle',
              display: 'inline-block'
            }}
          />
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <p className="hero__description">
          Build fast APIs with zero boilerplate. Automatic parameter injection,
          Express middleware compatibility, and pure developer joy.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started">
            Get Started →
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            href="https://github.com/sunnyghodeswar/vegaa"
            style={{marginLeft: '1rem'}}>
            View on GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function KeyFeatures() {
  return (
    <section className={styles.keyFeatures}>
      <div className="container">
        <h2 className={styles.sectionTitle}>
          <span style={{marginRight: '8px'}}>✨</span>
          Key Features
        </h2>
        <div className="row">
          <div className="col col--6">
            <ul style={{listStyle: 'none', padding: 0}}>
              <li style={{marginBottom: '1rem', display: 'flex', alignItems: 'flex-start'}}>
                <span style={{marginRight: '12px', fontSize: '1.2rem'}}>🔒</span>
                <div>
                  <strong>Automatic Parameter Injection</strong>
                  <p style={{margin: '4px 0 0 0', opacity: 0.8}}>No more `req.params.id`—just declare what you need</p>
                </div>
              </li>
              <li style={{marginBottom: '1rem', display: 'flex', alignItems: 'flex-start'}}>
                <span style={{marginRight: '12px', fontSize: '1.2rem'}}>📊</span>
                <div>
                  <strong>Built-in Middleware System</strong>
                  <p style={{margin: '4px 0 0 0', opacity: 0.8}}>Global and route-specific middleware support</p>
                </div>
              </li>
              <li style={{marginBottom: '1rem', display: 'flex', alignItems: 'flex-start'}}>
                <span style={{marginRight: '12px', fontSize: '1.2rem'}}>🔗</span>
                <div>
                  <strong>Express Middleware Compatibility</strong>
                  <p style={{margin: '4px 0 0 0', opacity: 0.8}}>Use existing Express middleware seamlessly</p>
                </div>
              </li>
              <li style={{marginBottom: '1rem', display: 'flex', alignItems: 'flex-start'}}>
                <span style={{marginRight: '12px', fontSize: '1.2rem'}}>🌿</span>
                <div>
                  <strong>Zero Dependencies</strong>
                  <p style={{margin: '4px 0 0 0', opacity: 0.8}}>Minimal core with optional plugins</p>
                </div>
              </li>
            </ul>
          </div>
          <div className="col col--6">
            <ul style={{listStyle: 'none', padding: 0}}>
              <li style={{marginBottom: '1rem', display: 'flex', alignItems: 'flex-start'}}>
                <span style={{marginRight: '12px', fontSize: '1.2rem'}}>⚡</span>
                <div>
                  <strong>Lightning Fast</strong>
                  <p style={{margin: '4px 0 0 0', opacity: 0.8}}>Built on Fastify's core for maximum performance</p>
                </div>
              </li>
              <li style={{marginBottom: '1rem', display: 'flex', alignItems: 'flex-start'}}>
                <span style={{marginRight: '12px', fontSize: '1.2rem'}}>🛠️</span>
                <div>
                  <strong>Built-in Plugins</strong>
                  <p style={{margin: '4px 0 0 0', opacity: 0.8}}>CORS, JSON, Body Parser, Static Files, HTTP Client</p>
                </div>
              </li>
              <li style={{marginBottom: '1rem', display: 'flex', alignItems: 'flex-start'}}>
                <span style={{marginRight: '12px', fontSize: '1.2rem'}}>📦</span>
                <div>
                  <strong>Response Helpers</strong>
                  <p style={{margin: '4px 0 0 0', opacity: 0.8}}>HTML, text, and JSON response utilities</p>
                </div>
              </li>
              <li style={{marginBottom: '1rem', display: 'flex', alignItems: 'flex-start'}}>
                <span style={{marginRight: '12px', fontSize: '1.2rem'}}>🔒</span>
                <div>
                  <strong>Production-Ready</strong>
                  <p style={{margin: '4px 0 0 0', opacity: 0.8}}>Cluster mode support for multi-core scaling</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div className={styles.ctaSection} style={{marginTop: '2rem'}}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started">
            Try It Live →
          </Link>
        </div>
      </div>
    </section>
  );
}

function CodeExample() {
  return (
    <section className={styles.codeExample}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Write Less, Do More</h2>
        <div className="row">
          <div className="col col--6">
            <h3>Traditional Express</h3>
            <CodeBlock language="js">
{`app.get('/user/:id', (req, res) => {
  const user = req.user
  const id = req.params.id
  res.json({ user, id })
})`}
            </CodeBlock>
          </div>
          <div className="col col--6">
            <h3>With Vegaa</h3>
            <CodeBlock language="js">
{`route('/user/:id').get((user, id) => ({
  user, id
}))`}
            </CodeBlock>
          </div>
        </div>
        <div className={styles.ctaSection}>
          <Link
            className="button button--primary button--lg"
            to="/docs/examples/basic">
            Explore Examples →
          </Link>
        </div>
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section className={styles.quickStart}>
      <div className="container">
        <h2 className={styles.sectionTitle}>
          <span style={{marginRight: '8px'}}>🚀</span>
          Quick Start
        </h2>
        <CodeBlock language="bash">
{`npm install vegaa`}
        </CodeBlock>
        <CodeBlock language="js">
{`import { vegaa, route } from 'vegaa'

route('/ping').get(() => ({ message: 'pong' }))

await vegaa.startVegaaServer()
// Server running on http://localhost:4000`}
        </CodeBlock>
        <div className={styles.ctaSection}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/examples/basic"
            style={{marginRight: '1rem'}}>
            Try Interactive Examples →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - ${siteConfig.tagline}`}
      description="A lightning-fast, zero-boilerplate Node.js framework focused on speed, scalability, and pure developer joy.">
      <HomepageHeader />
      <main>
        <QuickStart />
        <KeyFeatures />
        <CodeExample />
      </main>
    </Layout>
  );
}
