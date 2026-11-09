export default function FeatureCard({ number, title, description, icon, tone }) {
  return (
    <article className="feature-card">
      <div className={`feature-icon ${tone}`} aria-hidden="true">{icon}</div>
      <div className="feature-card-bottom">
        <div className="feature-number">{number} <span>—</span> MADE FOR REAL QUESTIONS</div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="feature-arrow" aria-hidden="true">↗</span>
    </article>
  );
}
