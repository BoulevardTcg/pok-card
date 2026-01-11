import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LegalPage.module.css';
import FooterPremium from '../../components/landing/FooterPremium';

export function CGVPage() {
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
            <h1>Conditions Générales de Vente</h1>
            <p className={styles.lastUpdate}>
              Dernière mise à jour :{' '}
              {new Date().toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </header>

          {/* Sommaire */}
          <nav className={styles.toc}>
            <h2>Sommaire</h2>
            <ol>
              <li>
                <a href="#preambule">Préambule et définitions</a>
              </li>
              <li>
                <a href="#champ">Champ d'application</a>
              </li>
              <li>
                <a href="#vendeur">Identification du vendeur</a>
              </li>
              <li>
                <a href="#produits">Produits</a>
              </li>
              <li>
                <a href="#prix">Prix</a>
              </li>
              <li>
                <a href="#commande">Commande</a>
              </li>
              <li>
                <a href="#paiement">Paiement</a>
              </li>
              <li>
                <a href="#livraison">Livraison</a>
              </li>
              <li>
                <a href="#retractation">Droit de rétractation</a>
              </li>
              <li>
                <a href="#retours">Retours et remboursements</a>
              </li>
              <li>
                <a href="#garanties">Garanties légales</a>
              </li>
              <li>
                <a href="#sav">Service client</a>
              </li>
              <li>
                <a href="#mediation">Médiation</a>
              </li>
              <li>
                <a href="#responsabilite">Responsabilité</a>
              </li>
              <li>
                <a href="#donnees">Données personnelles</a>
              </li>
              <li>
                <a href="#propriete">Propriété intellectuelle</a>
              </li>
              <li>
                <a href="#modification">Modification des CGV</a>
              </li>
              <li>
                <a href="#droit">Droit applicable</a>
              </li>
            </ol>
          </nav>

          {/* Résumé des points clés */}
          <section className={styles.keyPoints}>
            <h2>📋 Résumé des points clés</h2>
            <ul>
              <li>
                ✅ <strong>Délai de rétractation :</strong> 14 jours à compter de la réception
              </li>
              <li>
                ✅ <strong>Produits scellés ouverts :</strong> Retour accepté avec décote selon
                l'état
              </li>
              <li>
                ✅ <strong>Cartes à l'unité (singles) :</strong> État indiqué (NM/EX/LP/MP), photos
                disponibles
              </li>
              <li>
                ✅ <strong>Boosters/produits aléatoires :</strong> Aucune garantie sur le contenu
              </li>
              <li>
                ✅ <strong>Précommandes :</strong> Date estimée, possibilité d'annulation gratuite
              </li>
              <li>
                ✅ <strong>Livraison :</strong> France métropolitaine sous 2-5 jours ouvrés
              </li>
              <li>
                ✅ <strong>Paiement sécurisé :</strong> CB via Stripe (3D Secure)
              </li>
              <li>
                ✅ <strong>Garantie légale :</strong> 2 ans conformité + vices cachés
              </li>
              <li>
                ✅ <strong>SAV :</strong> contact@boulevardtcg.com
              </li>
              <li>
                ✅ <strong>Médiation :</strong> Gratuite en cas de litige non résolu
              </li>
            </ul>
          </section>

          {/* Article 1 - Préambule */}
          <section id="preambule" className={styles.section}>
            <h2>Article 1 – Préambule et définitions</h2>

            <h3>1.1 Objet</h3>
            <p>
              Les présentes Conditions Générales de Vente (ci-après « CGV ») régissent les relations
              contractuelles entre la société BOULEVARD TCG (ci-après « le Vendeur ») et toute
              personne physique ou morale effectuant un achat sur le site boulevardtcg.com (ci-après
              « le Client »).
            </p>

            <h3>1.2 Définitions</h3>
            <ul>
              <li>
                <strong>« Site »</strong> : le site internet accessible à l'adresse boulevardtcg.com
              </li>
              <li>
                <strong>« Produits »</strong> : l'ensemble des articles proposés à la vente sur le
                Site
              </li>
              <li>
                <strong>« Produits scellés »</strong> : boosters, displays, ETB, coffrets dont
                l'emballage d'origine n'a pas été ouvert
              </li>
              <li>
                <strong>« Singles »</strong> : cartes à l'unité vendues hors de leur emballage
                d'origine
              </li>
              <li>
                <strong>« Précommande »</strong> : commande d'un produit non encore disponible en
                stock
              </li>
              <li>
                <strong>« Client »</strong> : toute personne passant commande sur le Site
              </li>
              <li>
                <strong>« Consommateur »</strong> : Client personne physique agissant à des fins non
                professionnelles
              </li>
            </ul>
          </section>

          {/* Article 2 - Champ d'application */}
          <section id="champ" className={styles.section}>
            <h2>Article 2 – Champ d'application</h2>

            <h3>2.1 Acceptation des CGV</h3>
            <p>
              Toute commande passée sur le Site implique l'acceptation sans réserve des présentes
              CGV. Le Client reconnaît avoir pris connaissance des CGV avant de passer commande et
              les accepte en cochant la case prévue à cet effet lors du processus de commande.
            </p>

            <h3>2.2 Opposabilité</h3>
            <p>
              Les CGV applicables sont celles en vigueur au jour de la commande. Le Vendeur se
              réserve le droit de modifier les CGV à tout moment. Les modifications ne
              s'appliqueront pas aux commandes déjà validées.
            </p>

            <h3>2.3 Capacité juridique</h3>
            <p>
              Pour passer commande, le Client doit être majeur et avoir la capacité juridique de
              contracter. Les mineurs doivent obtenir l'autorisation de leur représentant légal.
            </p>
          </section>

          {/* Article 3 - Identification du vendeur */}
          <section id="vendeur" className={styles.section}>
            <h2>Article 3 – Identification du vendeur</h2>

            <div className={styles.infoBox}>
              <p>
                <strong>Raison sociale :</strong> [À COMPLÉTER - BOULEVARD TCG]
              </p>
              <p>
                <strong>Forme juridique :</strong> [À COMPLÉTER - SAS/SARL/Auto-entrepreneur]
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
                <strong>N° TVA intracommunautaire :</strong> [À COMPLÉTER ou "Non assujetti"]
              </p>
              <p>
                <strong>Email :</strong> contact@boulevardtcg.com
              </p>
              <p>
                <strong>Téléphone :</strong> [À COMPLÉTER]
              </p>
              <p>
                <strong>Horaires SAV :</strong> Du lundi au vendredi, 9h-18h
              </p>
              <p>
                <strong>Directeur de la publication :</strong> [À COMPLÉTER]
              </p>
            </div>

            <div className={styles.infoBox}>
              <p>
                <strong>Hébergeur du site :</strong>
              </p>
              <p>Railway Corp.</p>
              <p>548 Market St, PMB 68956</p>
              <p>San Francisco, CA 94104, USA</p>
              <p>https://railway.app</p>
            </div>
          </section>

          {/* Article 4 - Produits */}
          <section id="produits" className={styles.section}>
            <h2>Article 4 – Produits</h2>

            <h3>4.1 Descriptions et photos</h3>
            <p>
              Les produits proposés à la vente sont décrits avec la plus grande exactitude possible.
              Toutefois, les photos présentées sur le Site ne sont pas contractuelles et peuvent
              différer légèrement du produit réel (couleurs, reflets, etc.). En cas d'erreur
              manifeste sur le prix ou la description d'un produit, le Vendeur se réserve le droit
              d'annuler la commande.
            </p>

            <h3>4.2 Disponibilité</h3>
            <p>
              Les produits sont proposés dans la limite des stocks disponibles. En cas
              d'indisponibilité après commande, le Client sera informé dans les meilleurs délais et
              pourra choisir entre un remboursement intégral ou un avoir.
            </p>

            <h3>4.3 Spécificités des produits TCG</h3>

            <h4>4.3.1 Produits scellés</h4>
            <p>
              Les produits scellés (boosters, displays, ETB, coffrets) sont vendus avec leur
              emballage d'origine intact.{' '}
              <strong>
                L'ouverture du blister ou de l'emballage par le Client rend impossible le retour
                pour simple rétractation
              </strong>
              , sauf défaut de conformité avéré. En cas de retour d'un produit scellé ouvert, une
              décote sera appliquée selon l'état du produit.
            </p>

            <h4>4.3.2 Cartes à l'unité (Singles)</h4>
            <p>
              Les cartes à l'unité sont vendues selon un système de grading indiquant leur état :
            </p>
            <ul>
              <li>
                <strong>NM (Near Mint)</strong> : État quasi neuf, défauts minimes imperceptibles
              </li>
              <li>
                <strong>EX (Excellent)</strong> : Légères traces d'usure visibles de près
              </li>
              <li>
                <strong>LP (Lightly Played)</strong> : Usure visible, traces de jeu modérées
              </li>
              <li>
                <strong>MP (Moderately Played)</strong> : Usure marquée, pliures légères possibles
              </li>
              <li>
                <strong>HP (Heavily Played)</strong> : Usure importante, cartes de collection
                uniquement
              </li>
            </ul>
            <p>
              Des photos détaillées sont disponibles sur demande. Une tolérance raisonnable est
              admise dans l'appréciation de l'état. L'authenticité des cartes est garantie par le
              Vendeur.
            </p>

            <h4>4.3.3 Produits aléatoires</h4>
            <p>
              Les boosters, mystery boxes et autres produits à contenu aléatoire ne font l'objet
              d'aucune garantie quant à leur contenu. Le Client reconnaît que l'achat de tels
              produits comporte un aléa inhérent et qu'aucune réclamation ne sera recevable
              concernant le contenu obtenu.
            </p>

            <h4>4.3.4 Cartes gradées</h4>
            <p>
              Les cartes gradées sont vendues avec leur certification d'origine (PSA, CGC, BGS,
              etc.). La note attribuée par l'organisme de certification fait foi. Le Vendeur ne peut
              être tenu responsable de la notation attribuée par ces organismes tiers.
            </p>
          </section>

          {/* Article 5 - Prix */}
          <section id="prix" className={styles.section}>
            <h2>Article 5 – Prix</h2>

            <h3>5.1 Prix de vente</h3>
            <p>
              Les prix sont indiqués en euros, toutes taxes comprises (TTC). Les frais de livraison
              ne sont pas inclus et sont indiqués séparément avant validation de la commande.
            </p>

            <h3>5.2 Modification des prix</h3>
            <p>
              Le Vendeur se réserve le droit de modifier ses prix à tout moment. Les produits sont
              facturés sur la base des tarifs en vigueur au moment de la validation de la commande.
            </p>

            <h3>5.3 Promotions et codes de réduction</h3>
            <p>
              Les codes promotionnels sont soumis à conditions (durée de validité, montant minimum,
              produits éligibles). Ils ne sont pas cumulables sauf mention contraire. Un code
              utilisé de manière frauduleuse pourra entraîner l'annulation de la commande.
            </p>

            <h3>5.4 Erreur de prix</h3>
            <p>
              En cas d'erreur manifeste de prix (prix dérisoire, erreur de virgule), le Vendeur se
              réserve le droit d'annuler la commande et de procéder au remboursement intégral du
              Client.
            </p>
          </section>

          {/* Article 6 - Commande */}
          <section id="commande" className={styles.section}>
            <h2>Article 6 – Commande</h2>

            <h3>6.1 Processus de commande</h3>
            <p>Le Client suit les étapes suivantes :</p>
            <ol>
              <li>Sélection des produits et ajout au panier</li>
              <li>Vérification du panier</li>
              <li>Identification ou création de compte</li>
              <li>Choix du mode de livraison</li>
              <li>Choix du mode de paiement</li>
              <li>Vérification récapitulative et acceptation des CGV</li>
              <li>Validation et paiement</li>
              <li>Confirmation par email</li>
            </ol>

            <h3>6.2 Confirmation de commande</h3>
            <p>
              Un email de confirmation récapitulant la commande est envoyé au Client après
              validation du paiement. Cet email constitue la preuve de la transaction. Le Client est
              invité à conserver cet email et/ou à l'imprimer.
            </p>

            <h3>6.3 Précommandes</h3>
            <div className={styles.warningBox}>
              <h4>⚠️ Conditions spécifiques aux précommandes</h4>
              <ul>
                <li>
                  <strong>Date de sortie estimée :</strong> La date indiquée est fournie par
                  l'éditeur et peut être modifiée
                </li>
                <li>
                  <strong>Retards :</strong> En cas de retard de l'éditeur, le Client sera informé
                  par email. Aucune indemnité ne sera due
                </li>
                <li>
                  <strong>Allocations :</strong> Certains produits sont soumis à allocation par
                  l'éditeur. En cas de réduction d'allocation, les commandes seront honorées par
                  ordre chronologique
                </li>
                <li>
                  <strong>Paiement :</strong> Le paiement est effectué à la commande. En cas
                  d'annulation, le remboursement intervient sous 14 jours
                </li>
                <li>
                  <strong>Annulation :</strong> Le Client peut annuler sa précommande sans frais
                  jusqu'à l'expédition du produit
                </li>
              </ul>
            </div>

            <h3>6.4 Modification/Annulation</h3>
            <p>
              Le Client peut modifier ou annuler sa commande en contactant le service client avant
              expédition. Après expédition, seul le droit de rétractation est applicable.
            </p>
          </section>

          {/* Article 7 - Paiement */}
          <section id="paiement" className={styles.section}>
            <h2>Article 7 – Paiement</h2>

            <h3>7.1 Moyens de paiement acceptés</h3>
            <ul>
              <li>Carte bancaire (Visa, Mastercard, American Express) via Stripe</li>
              <li>Apple Pay / Google Pay</li>
            </ul>

            <h3>7.2 Sécurité des paiements</h3>
            <p>
              Les paiements sont sécurisés par Stripe, prestataire certifié PCI-DSS. Le protocole 3D
              Secure (3DS) est activé pour renforcer la sécurité des transactions. Le Vendeur n'a
              jamais accès aux coordonnées bancaires complètes du Client.
            </p>

            <h3>7.3 Contrôle anti-fraude</h3>
            <p>
              Le Vendeur se réserve le droit de procéder à des vérifications en cas de suspicion de
              fraude. En cas de doute, des justificatifs pourront être demandés. Le refus de fournir
              ces justificatifs pourra entraîner l'annulation de la commande.
            </p>

            <h3>7.4 Défaut de paiement</h3>
            <p>
              En cas de refus du paiement par l'établissement bancaire, la commande est
              automatiquement annulée et le Client en est informé par email.
            </p>
          </section>

          {/* Article 8 - Livraison */}
          <section id="livraison" className={styles.section}>
            <h2>Article 8 – Livraison</h2>

            <h3>8.1 Zones de livraison</h3>
            <p>Le Vendeur livre actuellement :</p>
            <ul>
              <li>France métropolitaine</li>
              <li>DOM-TOM (frais et délais spécifiques)</li>
              <li>Union Européenne</li>
            </ul>

            <h3>8.2 Modes de livraison</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mode</th>
                  <th>Délai indicatif</th>
                  <th>Tarif</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Colissimo Domicile</td>
                  <td>2-4 jours ouvrés</td>
                  <td>À partir de 4,90 €</td>
                </tr>
                <tr>
                  <td>Mondial Relay</td>
                  <td>3-5 jours ouvrés</td>
                  <td>À partir de 3,90 €</td>
                </tr>
                <tr>
                  <td>Chronopost Express</td>
                  <td>24-48h</td>
                  <td>À partir de 9,90 €</td>
                </tr>
              </tbody>
            </table>
            <p>
              <strong>Franco de port :</strong> Livraison gratuite en France métropolitaine à partir
              de 50 € d'achat (hors précommandes).
            </p>

            <h3>8.3 Délais</h3>
            <p>
              Les délais indiqués sont des estimations et commencent à courir à compter de
              l'expédition. Conformément à l'article L. 216-1 du Code de la consommation, en
              l'absence de date de livraison convenue, le Vendeur livre le bien dans un délai
              maximal de 30 jours.
            </p>

            <h3>8.4 Transfert des risques</h3>
            <p>
              Le transfert des risques au Client s'effectue au moment de la livraison effective,
              c'est-à-dire lors de la prise de possession physique du colis.
            </p>

            <h3>8.5 Colis endommagé ou manquant</h3>
            <p>En cas de colis visiblement endommagé à la réception, le Client doit :</p>
            <ol>
              <li>Émettre des réserves écrites détaillées auprès du transporteur</li>
              <li>Photographier le colis et son contenu</li>
              <li>Contacter le service client sous 48h avec les photos</li>
            </ol>
            <p>
              En cas de colis non reçu, le Client doit contacter le service client dans les 14 jours
              suivant la date d'expédition.
            </p>
          </section>

          {/* Article 9 - Droit de rétractation */}
          <section id="retractation" className={styles.section}>
            <h2>Article 9 – Droit de rétractation</h2>

            <h3>9.1 Principe</h3>
            <p>
              Conformément aux articles L. 221-18 et suivants du Code de la consommation, le Client
              consommateur dispose d'un délai de <strong>14 jours calendaires</strong> à compter de
              la réception du produit pour exercer son droit de rétractation, sans avoir à justifier
              de motifs ni à payer de pénalités.
            </p>

            <h3>9.2 Modalités d'exercice</h3>
            <p>Pour exercer son droit de rétractation, le Client peut :</p>
            <ul>
              <li>Utiliser le formulaire de rétractation disponible en annexe</li>
              <li>Envoyer un email à contact@boulevardtcg.com</li>
              <li>
                Utiliser la fonctionnalité de rétractation depuis son espace client sur le Site
              </li>
            </ul>
            <p>
              Un accusé de réception sera envoyé au Client confirmant la prise en compte de sa
              demande.
            </p>

            <h3>9.3 Retour des produits</h3>
            <p>
              Le Client dispose de 14 jours à compter de la notification de rétractation pour
              retourner les produits à l'adresse suivante :
            </p>
            <div className={styles.infoBox}>
              <p>
                <strong>Adresse de retour :</strong>
              </p>
              <p>BOULEVARD TCG - Service Retours</p>
              <p>[À COMPLÉTER - Adresse complète]</p>
            </div>
            <p>
              Les frais de retour sont à la charge du Client, sauf en cas de produit défectueux ou
              non conforme.
            </p>

            <h3>9.4 État des produits retournés</h3>
            <p>
              Les produits doivent être retournés dans leur état d'origine, complets, avec tous
              accessoires, notices et emballages d'origine. La responsabilité du Client est engagée
              en cas de dépréciation du produit résultant de manipulations autres que celles
              nécessaires pour établir la nature et les caractéristiques du produit.
            </p>

            <div className={styles.warningBox}>
              <h4>⚠️ Cas particulier des produits scellés TCG</h4>
              <p>
                L'ouverture d'un produit scellé (booster, display, coffret) constitue une
                manipulation allant au-delà de ce qui est nécessaire pour vérifier la nature du
                produit. Dans ce cas :
              </p>
              <ul>
                <li>Le droit de rétractation reste applicable</li>
                <li>
                  Une décote sera appliquée au remboursement, proportionnelle à la dépréciation
                </li>
                <li>La décote peut atteindre 100% si le produit ne peut être revendu</li>
              </ul>
            </div>

            <h3>9.5 Remboursement</h3>
            <p>
              Le remboursement intervient dans un délai de 14 jours à compter de la réception des
              produits retournés ou de la preuve d'expédition, selon ce qui survient en premier. Le
              remboursement est effectué via le même moyen de paiement que celui utilisé pour la
              commande initiale.
            </p>

            <h3>9.6 Exceptions au droit de rétractation</h3>
            <p>
              Conformément à l'article L. 221-28 du Code de la consommation, le droit de
              rétractation ne peut être exercé pour :
            </p>
            <ul>
              <li>
                Les produits confectionnés selon les spécifications du Client ou personnalisés
              </li>
              <li>
                Les produits qui ont été descellés par le Client après la livraison et qui ne
                peuvent être renvoyés pour des raisons d'hygiène ou de protection de la santé
              </li>
            </ul>
          </section>

          {/* Article 10 - Retours et remboursements */}
          <section id="retours" className={styles.section}>
            <h2>Article 10 – Retours et remboursements (hors rétractation)</h2>

            <h3>10.1 Produit défectueux ou non conforme</h3>
            <p>
              En cas de réception d'un produit défectueux, endommagé ou non conforme à la commande,
              le Client doit contacter le service client sous 14 jours avec :
            </p>
            <ul>
              <li>Le numéro de commande</li>
              <li>Des photos du produit et de l'emballage</li>
              <li>Une description du problème</li>
            </ul>
            <p>
              Le Vendeur procèdera à l'échange ou au remboursement après vérification. Les frais de
              retour seront pris en charge par le Vendeur.
            </p>

            <h3>10.2 Erreur de commande</h3>
            <p>
              En cas d'erreur du Vendeur (produit différent de celui commandé), le Client sera
              intégralement remboursé ou le bon produit sera envoyé sans frais supplémentaires.
            </p>

            <h3>10.3 Procédure de retour</h3>
            <ol>
              <li>Contacter le service client pour obtenir un numéro de retour</li>
              <li>Emballer soigneusement le produit dans son emballage d'origine</li>
              <li>Joindre le bon de retour fourni par le service client</li>
              <li>Expédier le colis en suivi à l'adresse indiquée</li>
              <li>Conserver la preuve d'envoi</li>
            </ol>
          </section>

          {/* Article 11 - Garanties légales */}
          <section id="garanties" className={styles.section}>
            <h2>Article 11 – Garanties légales</h2>

            <h3>11.1 Garantie légale de conformité</h3>
            <div className={styles.legalQuote}>
              <p>
                <strong>Articles L. 217-4 à L. 217-14 du Code de la consommation</strong>
              </p>
              <p>
                Le vendeur livre un bien conforme au contrat et répond des défauts de conformité
                existant lors de la délivrance. Il répond également des défauts de conformité
                résultant de l'emballage, des instructions de montage ou de l'installation lorsque
                celle-ci a été mise à sa charge.
              </p>
              <p>
                Le consommateur dispose d'un délai de <strong>2 ans</strong> à compter de la
                délivrance du bien pour obtenir la mise en œuvre de la garantie légale de
                conformité.
              </p>
              <p>
                Durant ce délai, le consommateur n'est tenu d'établir que l'existence du défaut de
                conformité et non la date d'apparition de celui-ci.
              </p>
            </div>

            <h3>11.2 Garantie des vices cachés</h3>
            <div className={styles.legalQuote}>
              <p>
                <strong>Articles 1641 à 1649 du Code civil</strong>
              </p>
              <p>
                Le vendeur est tenu de la garantie à raison des défauts cachés de la chose vendue
                qui la rendent impropre à l'usage auquel on la destine, ou qui diminuent tellement
                cet usage que l'acheteur ne l'aurait pas acquise, ou n'en aurait donné qu'un moindre
                prix, s'il les avait connus.
              </p>
              <p>
                L'action résultant des vices rédhibitoires doit être intentée par l'acquéreur dans
                un délai de <strong>2 ans</strong> à compter de la découverte du vice.
              </p>
            </div>

            <h3>11.3 Mise en œuvre des garanties</h3>
            <p>
              Pour faire valoir ces garanties, le Client doit contacter le service client en
              fournissant la preuve d'achat et une description du défaut constaté.
            </p>
          </section>

          {/* Article 12 - Service client */}
          <section id="sav" className={styles.section}>
            <h2>Article 12 – Service client et réclamations</h2>

            <h3>12.1 Contact</h3>
            <div className={styles.infoBox}>
              <p>
                <strong>Email :</strong> contact@boulevardtcg.com
              </p>
              <p>
                <strong>Téléphone :</strong> [À COMPLÉTER]
              </p>
              <p>
                <strong>Horaires :</strong> Du lundi au vendredi, 9h-18h
              </p>
              <p>
                <strong>Délai de réponse :</strong> 48h ouvrées maximum
              </p>
            </div>

            <h3>12.2 Traitement des réclamations</h3>
            <p>
              Toute réclamation doit être adressée par email ou via le formulaire de contact. Le
              service client s'engage à accuser réception de la réclamation sous 48h et à apporter
              une réponse dans un délai de 10 jours ouvrés.
            </p>

            <h3>12.3 Recours préalable obligatoire</h3>
            <p>
              Avant tout recours à la médiation ou aux tribunaux, le Client s'engage à tenter de
              résoudre le litige à l'amiable en contactant le service client.
            </p>
          </section>

          {/* Article 13 - Médiation */}
          <section id="mediation" className={styles.section}>
            <h2>Article 13 – Médiation de la consommation</h2>

            <h3>13.1 Principe</h3>
            <p>
              Conformément aux articles L. 612-1 et suivants du Code de la consommation, en cas de
              litige non résolu avec le service client, le Client consommateur peut recourir
              gratuitement à un médiateur de la consommation.
            </p>

            <h3>13.2 Coordonnées du médiateur</h3>
            <div className={styles.infoBox}>
              <p>
                <strong>Médiateur :</strong> [À COMPLÉTER - Nom du médiateur]
              </p>
              <p>
                <strong>Adresse :</strong> [À COMPLÉTER]
              </p>
              <p>
                <strong>Site web :</strong> [À COMPLÉTER]
              </p>
              <p>
                <strong>Email :</strong> [À COMPLÉTER]
              </p>
            </div>

            <h3>13.3 Plateforme européenne de règlement en ligne des litiges</h3>
            <p>
              Le Client peut également recourir à la plateforme de Règlement en Ligne des Litiges
              (RLL) mise en place par la Commission Européenne :
            </p>
            <p>
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
          </section>

          {/* Article 14 - Responsabilité */}
          <section id="responsabilite" className={styles.section}>
            <h2>Article 14 – Responsabilité et force majeure</h2>

            <h3>14.1 Responsabilité du Vendeur</h3>
            <p>
              Le Vendeur ne saurait être tenu responsable des dommages indirects subis par le Client
              à l'occasion de l'utilisation du Site ou des produits achetés. La responsabilité du
              Vendeur ne saurait excéder le montant de la commande concernée.
            </p>

            <h3>14.2 Force majeure</h3>
            <p>
              Le Vendeur ne pourra être tenu responsable de l'inexécution de ses obligations en cas
              de force majeure telle que définie par l'article 1218 du Code civil (événement
              échappant au contrôle du débiteur, qui ne pouvait être raisonnablement prévu et dont
              les effets ne peuvent être évités par des mesures appropriées).
            </p>
            <p>
              Sont notamment considérés comme cas de force majeure : catastrophes naturelles,
              pandémies, grèves, guerres, décisions gouvernementales, rupture d'approvisionnement de
              l'éditeur.
            </p>
          </section>

          {/* Article 15 - Données personnelles */}
          <section id="donnees" className={styles.section}>
            <h2>Article 15 – Données personnelles</h2>
            <p>
              Le traitement des données personnelles est détaillé dans notre{' '}
              <button onClick={() => navigate('/confidentialite')} className={styles.inlineLink}>
                Politique de Confidentialité
              </button>
              .
            </p>
            <p>
              Conformément au RGPD, le Client dispose d'un droit d'accès, de rectification,
              d'effacement, de portabilité de ses données, ainsi que d'un droit d'opposition et de
              limitation du traitement.
            </p>
          </section>

          {/* Article 16 - Propriété intellectuelle */}
          <section id="propriete" className={styles.section}>
            <h2>Article 16 – Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments du Site (textes, images, logos, graphismes, etc.) sont la
              propriété exclusive du Vendeur ou de ses partenaires. Toute reproduction,
              représentation ou exploitation non autorisée est interdite.
            </p>
            <p>
              Les marques Pokémon, One Piece, Yu-Gi-Oh!, Magic: The Gathering, etc. sont la
              propriété de leurs détenteurs respectifs. Le Vendeur agit en qualité de revendeur
              agréé ou de distributeur.
            </p>
          </section>

          {/* Article 17 - Modification des CGV */}
          <section id="modification" className={styles.section}>
            <h2>Article 17 – Modification des CGV</h2>
            <p>
              Le Vendeur se réserve le droit de modifier les présentes CGV à tout moment. Les CGV
              applicables sont celles en vigueur à la date de la commande. Les modifications
              n'affectent pas les commandes déjà validées.
            </p>
            <p>
              <strong>Date de dernière mise à jour :</strong> [À COMPLÉTER]
            </p>
            <p>
              <strong>Version :</strong> 1.0
            </p>
          </section>

          {/* Article 18 - Droit applicable */}
          <section id="droit" className={styles.section}>
            <h2>Article 18 – Droit applicable et juridiction compétente</h2>
            <p>
              Les présentes CGV sont soumises au droit français. En cas de litige, une solution
              amiable sera recherchée avant toute action judiciaire.
            </p>
            <p>
              Pour les consommateurs, conformément aux règles de protection, les tribunaux
              compétents sont ceux du lieu de résidence du consommateur ou du lieu du siège social
              du Vendeur, au choix du consommateur.
            </p>
          </section>

          {/* Annexes */}
          <section className={styles.annexes}>
            <h2>Annexes</h2>

            {/* Formulaire de rétractation */}
            <div className={styles.annexe} id="formulaire-retractation">
              <h3>Annexe 1 : Formulaire de rétractation</h3>
              <div className={styles.formTemplate}>
                <p>
                  <em>
                    (À compléter et renvoyer uniquement si vous souhaitez vous rétracter du contrat)
                  </em>
                </p>
                <hr />
                <p>À l'attention de :</p>
                <p>
                  <strong>BOULEVARD TCG</strong>
                </p>
                <p>[Adresse complète]</p>
                <p>Email : contact@boulevardtcg.com</p>
                <hr />
                <p>
                  Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation
                  du contrat portant sur la vente du bien (*)/pour la prestation de services (*)
                  ci-dessous :
                </p>
                <p>Commandé le (*) / reçu le (*) : ________________</p>
                <p>Numéro de commande : ________________</p>
                <p>Nom du (des) consommateur(s) : ________________</p>
                <p>Adresse du (des) consommateur(s) : ________________</p>
                <p>Date : ________________</p>
                <p>
                  Signature du (des) consommateur(s) (uniquement en cas de notification sur papier)
                  :
                </p>
                <p>
                  <em>(*) Rayez la mention inutile.</em>
                </p>
              </div>
            </div>

            {/* Modèle email rétractation */}
            <div className={styles.annexe} id="email-retractation">
              <h3>Annexe 2 : Modèle d'email de rétractation</h3>
              <div className={styles.emailTemplate}>
                <p>
                  <strong>Objet :</strong> Demande de rétractation - Commande n°[NUMÉRO]
                </p>
                <hr />
                <p>Madame, Monsieur,</p>
                <p>
                  Je soussigné(e) [NOM PRÉNOM], vous informe par la présente de ma décision de me
                  rétracter du contrat de vente portant sur la commande n°[NUMÉRO] passée le [DATE]
                  et reçue le [DATE].
                </p>
                <p>
                  Conformément à l'article L. 221-18 du Code de la consommation, je vous prie de
                  bien vouloir procéder au remboursement du montant de [MONTANT] €.
                </p>
                <p>Je vous retourne le(s) produit(s) concerné(s) par [MODE D'ENVOI].</p>
                <p>
                  Dans l'attente de votre confirmation, je vous prie d'agréer, Madame, Monsieur,
                  l'expression de mes salutations distinguées.
                </p>
                <p>[NOM PRÉNOM]</p>
                <p>[ADRESSE]</p>
                <p>[EMAIL]</p>
                <p>[TÉLÉPHONE]</p>
              </div>
            </div>

            {/* Procédure SAV */}
            <div className={styles.annexe} id="procedure-sav">
              <h3>Annexe 3 : Procédure SAV</h3>
              <div className={styles.procedure}>
                <h4>Étape 1 : Contact initial</h4>
                <p>Envoyez un email à contact@boulevardtcg.com avec :</p>
                <ul>
                  <li>Votre numéro de commande</li>
                  <li>La description du problème</li>
                  <li>Des photos si pertinent</li>
                </ul>

                <h4>Étape 2 : Analyse</h4>
                <p>
                  Notre équipe analyse votre demande sous 48h ouvrées et vous propose une solution.
                </p>

                <h4>Étape 3 : Résolution</h4>
                <p>Selon le cas :</p>
                <ul>
                  <li>
                    <strong>Échange :</strong> Nous vous envoyons un bon de retour prépayé et
                    expédions le nouveau produit
                  </li>
                  <li>
                    <strong>Remboursement :</strong> Après réception et vérification du retour,
                    remboursement sous 14 jours
                  </li>
                  <li>
                    <strong>Avoir :</strong> Un avoir du montant concerné est crédité sur votre
                    compte client
                  </li>
                </ul>

                <h4>Délais de traitement</h4>
                <ul>
                  <li>Réponse initiale : 48h ouvrées</li>
                  <li>Traitement du dossier : 5-10 jours ouvrés</li>
                  <li>Remboursement : 14 jours maximum après réception du retour</li>
                </ul>
              </div>
            </div>
          </section>
        </article>
      </div>
      <FooterPremium />
    </div>
  );
}

export default CGVPage;
