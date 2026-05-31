import { Link } from 'react-router-dom';
import { Seo } from './components/Seo';

export function NotFoundPage() {
  return (
    <>
      <Seo title="Page introuvable (404)" noindex description="La page demandée n'existe pas." />
      <section
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '1rem',
          padding: '4rem 1.5rem',
        }}
      >
        <p style={{ fontSize: '4rem', fontWeight: 700, margin: 0, opacity: 0.6 }}>404</p>
        <h1 style={{ margin: 0 }}>Cette page n'existe pas</h1>
        <p style={{ maxWidth: 480, opacity: 0.8 }}>
          Le lien est peut-être erroné ou la page a été déplacée. Retournez à l'accueil ou explorez
          la boutique.
        </p>
        <div
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Link to="/" style={ctaStyle}>
            Retour à l'accueil
          </Link>
          <Link to="/produits" style={{ ...ctaStyle, opacity: 0.85 }}>
            Voir la boutique
          </Link>
        </div>
      </section>
    </>
  );
}

const ctaStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  borderRadius: 8,
  background: 'var(--color-accent-primary, #d4af37)',
  color: '#0a0a0a',
  textDecoration: 'none',
  fontWeight: 600,
};
