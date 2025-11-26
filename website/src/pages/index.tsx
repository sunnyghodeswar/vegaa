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
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          ⚡ {siteConfig.title}
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

function FeatureSection() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className="col col--4">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🚀</div>
              <h3>Lightning Fast</h3>
              <p>
                Built on Fastify's core, Vegaa delivers exceptional performance 
                while maintaining a clean, minimal API.
              </p>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>✨</div>
              <h3>Zero Boilerplate</h3>
              <p>
                No more `req.params.id` or `res.json()`. Just declare what you need, 
                and Vegaa handles the rest.
              </p>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔗</div>
              <h3>Express Compatible</h3>
              <p>
                Use existing Express middleware seamlessly while keeping Vegaa's 
                clean, context-based API.
              </p>
            </div>
          </div>
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
            to="/docs/examples">
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
        <h2 className={styles.sectionTitle}>Quick Start</h2>
        <CodeBlock language="bash">
{`npm install vegaa`}
        </CodeBlock>
        <CodeBlock language="js">
{`import { vegaa, route } from 'vegaa'

route('/ping').get(() => ({ message: 'pong' }))

await vegaa.startVegaaServer()`}
        </CodeBlock>
        <div className={styles.ctaSection}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started">
            Read Full Guide →
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
        <FeatureSection />
        <CodeExample />
        <QuickStart />
      </main>
    </Layout>
  );
}
