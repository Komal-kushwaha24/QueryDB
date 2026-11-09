const steps = [
  { number: '01', title: 'Connect your schema', detail: 'Give QueryDB context about your PostgreSQL tables and relationships.' },
  { number: '02', title: 'Ask like a human', detail: 'Describe what you need in plain English. QueryDB finds the right context.' },
  { number: '03', title: 'Review your answer', detail: 'See the generated SQL and results together, with safety checks along the way.' },
];

export default function HowItWorks() {
  return (
    <section className="workflow-section" id="how-it-works">
      <div className="workflow-inner section-wrap">
        <div className="workflow-heading">
          <p className="eyebrow">THREE STEPS. NO DETOURS.</p>
          <h2>Curiosity in.<br /><span>Clarity out.</span></h2>
          <p>Made to keep your train of thought moving. QueryDB takes care of the translation.</p>
          <a className="text-link" href="#demo">Try an example <span aria-hidden="true">↗</span></a>
        </div>
        <div className="steps-list">
          {steps.map((step) => (
            <article className="workflow-step" key={step.number}>
              <div className="step-number">{step.number}</div>
              <div className="step-copy"><h3>{step.title}</h3><p>{step.detail}</p></div>
              <span className="step-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
