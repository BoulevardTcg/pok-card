import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LegalPage.module.css';
import FooterPremium from '../../components/landing/FooterPremium';

export function MentionsLegalesPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.legalPage}>
      <div className={styles.container}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← Retour
        </button>

        <article className={styles.content}>
          <header className={styles.header}>
            <h1>Mentions Légales</h1>
            <p className={styles.lastUpdate}>
              Dernière mise à jour :{' '}
              {new Date().toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </header>

          {/* Éditeur du site */}
          <section className={styles.section}>
            <h2>1. Éditeur du site</h2>
            <div className={styles.infoBox}>
              <p>
                <strong>Nom commercial :</strong> Boulevard TCG
              </p>
              <p>
                <strong>Raison sociale :</strong> [À COMPLÉTER]
              </p>
              <p>
                <strong>Forme juridique :</strong> [À COMPLÉTER - SAS / SARL / Auto-entrepreneur]
              </p>
              <p>
                <strong>Capital social :</strong> [À COMPLÉTER] €
              </p>
              <p>
                <strong>Siège social :</strong> [À COMPLÉTER - Adresse complète]
              </p>
              <p>
                <strong>RCS :</strong> [À COMPLÉTER - Ville + numéro]
              </p>
              <p>
                <strong>SIRET :</strong> [À COMPLÉTER]
              </p>
              <p>
                <strong>N° TVA intracommunautaire :</strong> [À COMPLÉTER ou "Non applicable"]
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className={styles.section}>
            <h2>2. Contact</h2>
            <div className={styles.infoBox}>
              <p>
                <strong>Email :</strong> contact@boulevardtcg.com
              </p>
              <p>
                <strong>Téléphone :</strong> [À COMPLÉTER]
              </p>
              <p>
                <strong>Adresse postale :</strong> [À COMPLÉTER]
              </p>
            </div>
          </section>

          {/* Directeur de publication */}
          <section className={styles.section}>
            <h2>3. Directeur de la publication</h2>
            <p>Le directeur de la publication du site boulevardtcg.com est :</p>
            <div className={styles.infoBox}>
              <p>
                <strong>Nom :</strong> [À COMPLÉTER - Nom et prénom]
              </p>
              <p>
                <strong>Qualité :</strong> [À COMPLÉTER - Gérant / Président / etc.]
              </p>
            </div>
          </section>

          {/* Hébergeur */}
          <section className={styles.section}>
            <h2>4. Hébergeur du site</h2>
            <div className={styles.infoBox}>
              <p>
                <strong>Nom :</strong> Railway Corp.
              </p>
              <p>
                <strong>Adresse :</strong> 548 Market St, PMB 68956, San Francisco, CA 94104, USA
              </p>
              <p>
                <strong>Site web :</strong>{' '}
                <a href="https://railway.app" target="_blank" rel="noopener noreferrer">
                  https://railway.app
                </a>
              </p>
            </div>
          </section>

          {/* Activité */}
          <section className={styles.section}>
            <h2>5. Activité</h2>
            <p>
              Boulevard TCG est une boutique en ligne spécialisée dans la vente de produits de
              Trading Card Games (TCG), notamment :
            </p>
            <ul>
              <li>Produits scellés (boosters, displays, ETB, coffrets)</li>
              <li>Cartes à l'unité (singles)</li>
              <li>Accessoires de jeu et de protection</li>
              <li>Produits en précommande</li>
            </ul>
            <p>
              L'activité est exercée conformément à la réglementation française applicable au
              commerce électronique.
            </p>
          </section>

          {/* Propriété intellectuelle */}
          <section className={styles.section}>
            <h2>6. Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu du site boulevardtcg.com (textes, images, graphismes, logo,
              icônes, sons, logiciels, etc.) est la propriété exclusive de Boulevard TCG ou de ses
              partenaires et est protégé par les lois françaises et internationales relatives à la
              propriété intellectuelle.
            </p>
            <p>
              Toute reproduction, représentation, modification, publication, adaptation de tout ou
              partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est
              interdite, sauf autorisation écrite préalable de Boulevard TCG.
            </p>
            <h3>Marques tierces</h3>
            <p>Les marques suivantes sont la propriété de leurs détenteurs respectifs :</p>
            <ul>
              <li>
                <strong>Pokémon</strong> : The Pokémon Company International
              </li>
              <li>
                <strong>One Piece Card Game</strong> : Bandai
              </li>
              <li>
                <strong>Yu-Gi-Oh!</strong> : Konami
              </li>
              <li>
                <strong>Magic: The Gathering</strong> : Wizards of the Coast / Hasbro
              </li>
            </ul>
            <p>
              Boulevard TCG agit en qualité de revendeur indépendant et n'est affilié à aucun de ces
              éditeurs.
            </p>
          </section>

          {/* Données personnelles */}
          <section className={styles.section}>
            <h2>7. Données personnelles</h2>
            <p>
              Les informations relatives au traitement de vos données personnelles sont détaillées
              dans notre{' '}
              <button onClick={() => navigate('/confidentialite')} className={styles.inlineLink}>
                Politique de Confidentialité
              </button>
              .
            </p>
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi
              Informatique et Libertés, vous disposez de droits sur vos données personnelles que
              vous pouvez exercer en nous contactant.
            </p>
          </section>

          {/* Cookies */}
          <section className={styles.section}>
            <h2>8. Cookies</h2>
            <p>
              Le site boulevardtcg.com utilise des cookies pour améliorer votre expérience de
              navigation. Pour en savoir plus sur l'utilisation des cookies et gérer vos
              préférences, consultez notre{' '}
              <button onClick={() => navigate('/confidentialite')} className={styles.inlineLink}>
                Politique de Confidentialité
              </button>
              .
            </p>
          </section>

          {/* Conditions d'utilisation */}
          <section className={styles.section}>
            <h2>9. Conditions d'utilisation du site</h2>
            <p>
              L'utilisation du site boulevardtcg.com implique l'acceptation pleine et entière des
              conditions générales d'utilisation décrites ci-dessous.
            </p>
            <h3>Accès au site</h3>
            <p>
              Le site est accessible gratuitement à tout utilisateur disposant d'un accès à
              Internet. Tous les frais liés à l'accès au site (matériel, logiciels, connexion
              Internet, etc.) sont à la charge de l'utilisateur.
            </p>
            <h3>Contenu du site</h3>
            <p>
              Boulevard TCG s'efforce de fournir des informations aussi précises que possible.
              Toutefois, il ne pourra être tenu responsable des omissions, des inexactitudes et des
              carences dans la mise à jour, qu'elles soient de son fait ou du fait des tiers
              partenaires qui lui fournissent ces informations.
            </p>
          </section>

          {/* Limitation de responsabilité */}
          <section className={styles.section}>
            <h2>10. Limitation de responsabilité</h2>
            <p>
              Boulevard TCG ne pourra être tenu responsable des dommages directs ou indirects causés
              au matériel de l'utilisateur lors de l'accès au site, résultant soit de l'utilisation
              d'un matériel ne répondant pas aux spécifications techniques requises, soit de
              l'apparition d'un bug ou d'une incompatibilité.
            </p>
            <p>
              Boulevard TCG ne pourra également être tenu responsable des dommages indirects
              consécutifs à l'utilisation du site.
            </p>
          </section>

          {/* Liens hypertextes */}
          <section className={styles.section}>
            <h2>11. Liens hypertextes</h2>
            <p>
              Le site boulevardtcg.com peut contenir des liens hypertextes vers d'autres sites.
              Cependant, Boulevard TCG n'a pas la possibilité de vérifier le contenu des sites ainsi
              visités, et n'assumera en conséquence aucune responsabilité de ce fait.
            </p>
          </section>

          {/* Droit applicable */}
          <section className={styles.section}>
            <h2>12. Droit applicable</h2>
            <p>
              Les présentes mentions légales sont régies par le droit français. En cas de litige et
              à défaut de résolution amiable, les tribunaux français seront seuls compétents.
            </p>
          </section>

          {/* Crédits */}
          <section className={styles.section}>
            <h2>13. Crédits</h2>
            <p>
              <strong>Conception et développement :</strong> Boulevard TCG
            </p>
            <p>
              <strong>Images produits :</strong> The Pokémon Company, Bandai, Konami, Wizards of the
              Coast (utilisées à des fins commerciales dans le cadre de la revente autorisée)
            </p>
          </section>
        </article>
      </div>
      <FooterPremium />
    </div>
  );
}

export default MentionsLegalesPage;
