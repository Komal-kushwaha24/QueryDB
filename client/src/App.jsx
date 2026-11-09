import SiteHeader from './components/site-header.jsx';
import ProductDemo from './components/product-demo.jsx';
import FeatureCard from './components/feature-card.jsx';
import HowItWorks from './components/how-it-works.jsx';
import SiteFooter from './components/site-footer.jsx';

const features = [
  {
    number: '01',
    title: 'Ask in plain English',
    description: 'Turn everyday questions into useful answers. No SQL fluency required to get started.',
    icon: '✳',
    tone: 'mint',
  },
  {
    number: '02',
    title: 'Grounded in your schema',
    description: 'QueryDB uses your tables and relationships as context, so generated queries know your data.',
    icon: '⌘',
    tone: 'lavender',
  },
  {
    number: '03',
    title: 'Built with guardrails',
    description: 'Validate generated SQL and keep exploration read-only before anything reaches your database.',
    icon: '↗',
    tone: 'peach',
  },
];

export default function App() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero section-wrap" id="top">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> YOUR DATA, WITHOUT THE DETOUR</div>
            <h1>Have a question?<br /><span>Just query it.</span></h1>
            <p className="hero-description">
              Explore your PostgreSQL database with plain English. QueryDB turns the questions you already have into clear, schema-aware answers.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#demo">Try the live preview <span aria-hidden="true">↘</span></a>
              <a className="button button-secondary" href="https://github.com/Komal-kushwaha24/QueryDB" target="_blank" rel="noreferrer">Explore the project <span aria-hidden="true">↗</span></a>
            </div>
            <div className="hero-note"><span className="note-check" aria-hidden="true">✓</span> Open source project <span className="note-divider" /> Built for PostgreSQL</div>
          </div>
          <div className="hero-visual" id="demo">
            <div className="visual-caption"><span>MEET YOUR NEW QUERY WORKFLOW</span><span className="caption-line" /></div>
            <ProductDemo />
            <div className="float-note"><span className="float-spark" aria-hidden="true">✳</span><span><strong>From question</strong><br />to query, in a moment.</span></div>
          </div>
          <a className="scroll-cue" href="#features"><span className="scroll-line" /> SCROLL TO EXPLORE</a>
        </section>

        <section className="feature-section section-wrap" id="features">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LESS GUESSING. MORE GETTING.</p>
              <h2>Your data speaks.<br /><span>Now you can ask.</span></h2>
            </div>
            <p className="section-intro">A thoughtful path from a question in your head to an answer you can use—without the SQL rabbit hole.</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => <FeatureCard key={feature.number} {...feature} />)}
          </div>
        </section>

        <HowItWorks />

        <section className="closing-section section-wrap" id="get-started">
          <div className="closing-card">
            <div className="closing-orbit orbit-one" />
            <div className="closing-orbit orbit-two" />
            <div className="closing-content">
              <p className="eyebrow">A BETTER WAY TO EXPLORE</p>
              <h2>Go from “I wonder…”<br />to <span>“there it is.”</span></h2>
              <p>QueryDB is an open-source project in progress. Take a look at the code and follow along as it grows.</p>
              <a className="button button-light" href="https://github.com/Komal-kushwaha24/QueryDB" target="_blank" rel="noreferrer">Explore QueryDB on GitHub <span aria-hidden="true">↗</span></a>
            </div>
            <div className="closing-mark" aria-hidden="true"><span>Q</span><i /><i /><i /></div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
