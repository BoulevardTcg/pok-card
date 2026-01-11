import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LegalPage.module.css';
import FooterPremium from '../../components/landing/FooterPremium';

export function ConfidentialitePage() {
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
            <h1>Politique de Confidentialité</h1>
            <p className={styles.lastUpdate}>
              Dernière mise à jour :{' '}
              {new Date().toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </header>

          {/* Introduction */}
          <section className={styles.section}>
            <h2>1. Introduction</h2>
            <p>
              Boulevard TCG (ci-après « nous », « notre », « nos ») s'engage à protéger la vie
              privée des utilisateurs de son site boulevardtcg.com (ci-après « le Site »).
            </p>
            <p>
              La présente Politique de Confidentialité décrit comment nous collectons, utilisons,
              stockons et protégeons vos données personnelles conformément au Règlement Général sur
              la Protection des Données (RGPD - Règlement UE 2016/679) et à la loi française
              Informatique et Libertés.
            </p>
          </section>

          {/* Responsable du traitement */}
          <section className={styles.section}>
            <h2>2. Responsable du traitement</h2>
            <div className={styles.infoBox}>
              <p>SAS BoulevardTcg</p>
              <p>6 Rue Talma, 94400 Vitry-sur-Seine</p>
              <p>Email : contact@boulevardtcg.com</p>
            </div>
          </section>

          {/* Données collectées */}
          <section className={styles.section}>
            <h2>3. Données personnelles collectées</h2>
            <p>Nous collectons les données personnelles suivantes :</p>

            <h3>3.1 Données d'identification</h3>
            <ul>
              <li>Nom et prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone (optionnel)</li>
              <li>Adresse postale de livraison et facturation</li>
            </ul>

            <h3>3.2 Données de compte</h3>
            <ul>
              <li>Nom d'utilisateur</li>
              <li>Mot de passe (stocké sous forme chiffrée)</li>
              <li>Historique des commandes</li>
              <li>Préférences de communication</li>
            </ul>

            <h3>3.3 Données de transaction</h3>
            <ul>
              <li>Détails des commandes</li>
              <li>
                Informations de paiement (traitées par Stripe, nous n'avons pas accès aux numéros de
                carte complets)
              </li>
              <li>Adresses de livraison</li>
            </ul>

            <h3>3.4 Données de navigation</h3>
            <ul>
              <li>Adresse IP</li>
              <li>Type de navigateur</li>
              <li>Pages visitées</li>
              <li>Données de cookies (voir section 8)</li>
            </ul>
          </section>

          {/* Finalités */}
          <section className={styles.section}>
            <h2>4. Finalités du traitement</h2>
            <p>Vos données personnelles sont collectées pour les finalités suivantes :</p>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Finalité</th>
                  <th>Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Gestion de votre compte client</td>
                  <td>Exécution du contrat</td>
                </tr>
                <tr>
                  <td>Traitement et suivi des commandes</td>
                  <td>Exécution du contrat</td>
                </tr>
                <tr>
                  <td>Livraison des produits</td>
                  <td>Exécution du contrat</td>
                </tr>
                <tr>
                  <td>Gestion des paiements</td>
                  <td>Exécution du contrat</td>
                </tr>
                <tr>
                  <td>Service après-vente et réclamations</td>
                  <td>Exécution du contrat</td>
                </tr>
                <tr>
                  <td>Envoi de newsletters et offres commerciales</td>
                  <td>Consentement</td>
                </tr>
                <tr>
                  <td>Amélioration du site et de nos services</td>
                  <td>Intérêt légitime</td>
                </tr>
                <tr>
                  <td>Prévention de la fraude</td>
                  <td>Intérêt légitime</td>
                </tr>
                <tr>
                  <td>Respect des obligations légales</td>
                  <td>Obligation légale</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Durée de conservation */}
          <section className={styles.section}>
            <h2>5. Durée de conservation</h2>
            <p>
              Vos données personnelles sont conservées pendant une durée limitée, déterminée en
              fonction de la finalité du traitement :
            </p>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Type de données</th>
                  <th>Durée de conservation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Données de compte client</td>
                  <td>3 ans après la dernière activité</td>
                </tr>
                <tr>
                  <td>Données de commandes</td>
                  <td>10 ans (obligations comptables)</td>
                </tr>
                <tr>
                  <td>Données de paiement</td>
                  <td>13 mois (contestations)</td>
                </tr>
                <tr>
                  <td>Données de navigation (logs)</td>
                  <td>1 an</td>
                </tr>
                <tr>
                  <td>Cookies</td>
                  <td>13 mois maximum</td>
                </tr>
              </tbody>
            </table>

            <p>À l'expiration de ces délais, vos données sont supprimées ou anonymisées.</p>
          </section>

          {/* Destinataires */}
          <section className={styles.section}>
            <h2>6. Destinataires des données</h2>
            <p>Vos données personnelles peuvent être transmises aux destinataires suivants :</p>

            <h3>6.1 Services internes</h3>
            <ul>
              <li>Service commercial (gestion des commandes)</li>
              <li>Service logistique (préparation et expédition)</li>
              <li>Service client (support et SAV)</li>
            </ul>

            <h3>6.2 Sous-traitants</h3>
            <ul>
              <li>
                <strong>Stripe</strong> : traitement des paiements (certifié PCI-DSS)
              </li>
              <li>
                <strong>Railway</strong> : hébergement du site
              </li>
              <li>
                <strong>Transporteurs</strong> : La Poste (Colissimo), Mondial Relay, Chronopost
                pour la livraison
              </li>
              <li>
                <strong>Brevo/Mailjet</strong> : envoi d'emails transactionnels et marketing
              </li>
            </ul>

            <h3>6.3 Transferts hors UE</h3>
            <p>
              Certains de nos sous-traitants peuvent être situés hors de l'Union Européenne
              (États-Unis notamment). Dans ce cas, nous nous assurons que des garanties appropriées
              sont en place (clauses contractuelles types de la Commission Européenne, certification
              Data Privacy Framework).
            </p>
          </section>

          {/* Vos droits */}
          <section className={styles.section}>
            <h2>7. Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :
            </p>

            <ul>
              <li>
                <strong>Droit d'accès :</strong> obtenir la confirmation que vos données sont
                traitées et en recevoir une copie
              </li>
              <li>
                <strong>Droit de rectification :</strong> corriger vos données inexactes ou
                incomplètes
              </li>
              <li>
                <strong>Droit à l'effacement :</strong> demander la suppression de vos données («
                droit à l'oubli »)
              </li>
              <li>
                <strong>Droit à la limitation :</strong> limiter le traitement de vos données dans
                certains cas
              </li>
              <li>
                <strong>Droit à la portabilité :</strong> recevoir vos données dans un format
                structuré et les transférer à un autre responsable
              </li>
              <li>
                <strong>Droit d'opposition :</strong> vous opposer au traitement de vos données,
                notamment à des fins de prospection commerciale
              </li>
              <li>
                <strong>Droit de retirer votre consentement :</strong> à tout moment, pour les
                traitements basés sur le consentement
              </li>
            </ul>

            <h3>Comment exercer vos droits ?</h3>
            <p>
              Envoyez votre demande à <strong>contact@boulevardtcg.com</strong> ou depuis votre
              espace client. Nous répondons sous 1 mois.
            </p>

            <h3>Réclamation auprès de la CNIL</h3>
            <p>
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
              réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL)
              :
            </p>
            <div className={styles.infoBox}>
              <p>
                <strong>CNIL</strong>
              </p>
              <p>3 Place de Fontenoy, TSA 80715</p>
              <p>75334 Paris Cedex 07</p>
              <p>
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
                  www.cnil.fr
                </a>
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section className={styles.section}>
            <h2>8. Cookies et traceurs</h2>

            <h3>8.1 Qu'est-ce qu'un cookie ?</h3>
            <p>
              Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur,
              smartphone, tablette) lors de votre visite sur notre site. Il permet de stocker des
              informations relatives à votre navigation.
            </p>

            <h3>8.2 Types de cookies utilisés</h3>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Finalité</th>
                  <th>Durée</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Cookies essentiels</td>
                  <td>Fonctionnement du site (panier, authentification)</td>
                  <td>Session</td>
                </tr>
                <tr>
                  <td>Cookies de préférences</td>
                  <td>Mémorisation de vos choix (thème, langue)</td>
                  <td>1 an</td>
                </tr>
                <tr>
                  <td>Cookies analytiques</td>
                  <td>Mesure d'audience (si consentement)</td>
                  <td>13 mois</td>
                </tr>
                <tr>
                  <td>Cookies marketing</td>
                  <td>Publicité ciblée (si consentement)</td>
                  <td>13 mois</td>
                </tr>
              </tbody>
            </table>

            <h3>8.3 Gestion des cookies</h3>
            <p>
              Lors de votre première visite, un bandeau vous permet d'accepter ou de refuser les
              cookies non essentiels. Vous pouvez modifier vos préférences à tout moment :
            </p>
            <ul>
              <li>Via le lien "Gérer les cookies" en bas de page</li>
              <li>Via les paramètres de votre navigateur</li>
            </ul>
            <p>
              Le refus des cookies essentiels peut empêcher le bon fonctionnement du site
              (impossibilité de passer commande, par exemple).
            </p>
          </section>

          {/* Sécurité */}
          <section className={styles.section}>
            <h2>9. Sécurité des données</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
              protéger vos données personnelles contre la destruction, la perte, l'altération, la
              divulgation ou l'accès non autorisé :
            </p>
            <ul>
              <li>Chiffrement des données en transit (HTTPS/TLS)</li>
              <li>Chiffrement des mots de passe (bcrypt)</li>
              <li>Authentification sécurisée (tokens JWT)</li>
              <li>Protection contre les attaques courantes (XSS, CSRF, injection SQL)</li>
              <li>Accès restreint aux données personnelles</li>
              <li>Sauvegardes régulières</li>
              <li>Paiements sécurisés via Stripe (certifié PCI-DSS)</li>
            </ul>
          </section>

          {/* Mineurs */}
          <section className={styles.section}>
            <h2>10. Données des mineurs</h2>
            <p>
              Notre site n'est pas destiné aux enfants de moins de 16 ans. Nous ne collectons pas
              sciemment de données personnelles auprès de mineurs de moins de 16 ans. Si vous êtes
              parent ou tuteur et que vous apprenez que votre enfant nous a fourni des données
              personnelles, veuillez nous contacter.
            </p>
          </section>

          {/* Modifications */}
          <section className={styles.section}>
            <h2>11. Modifications de la politique</h2>
            <p>
              Nous pouvons être amenés à modifier la présente Politique de Confidentialité afin de
              nous conformer aux évolutions légales ou à l'évolution de nos services.
            </p>
            <p>
              En cas de modification substantielle, nous vous en informerons par email ou via une
              notification sur le site. Nous vous invitons à consulter régulièrement cette page.
            </p>
            <p>
              <strong>Date de dernière mise à jour :</strong> [À COMPLÉTER]
            </p>
            <p>
              <strong>Version :</strong> 1.0
            </p>
          </section>

          {/* Contact */}
          <section className={styles.section}>
            <h2>12. Contact</h2>
            <p>
              Pour toute question concernant cette Politique de Confidentialité ou l'exercice de vos
              droits, vous pouvez nous contacter :
            </p>
            <div className={styles.infoBox}>
              <p>Email : contact@boulevardtcg.com (objet : [RGPD])</p>
            </div>
          </section>
        </article>
      </div>
      <FooterPremium />
    </div>
  );
}

export default ConfidentialitePage;
