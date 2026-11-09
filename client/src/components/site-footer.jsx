export default function SiteFooter() {
  return (
    <footer className="site-footer section-wrap">
      <a className="brand footer-brand" href="#top" aria-label="QueryDB home">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
        <span>Query<span className="brand-db">DB</span></span>
      </a>
      <p>Good questions deserve good answers.</p>
      <div className="footer-meta"><span>© 2024 QueryDB</span><a href="https://github.com/Komal-kushwaha24/QueryDB" target="_blank" rel="noreferrer">Open source on GitHub <span aria-hidden="true">↗</span></a><a href="#top">Back to top ↑</a></div>
    </footer>
  );
}
