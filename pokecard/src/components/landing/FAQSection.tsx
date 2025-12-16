/**
 * @deprecated Ce composant est déprécié et n'est plus utilisé dans la landing page.
 * La FAQ sera déplacée vers une page dédiée /faq.
 * Ce fichier peut être supprimé de la landing lors du prochain nettoyage.
 */

import { useState } from 'react';
import styles from './FAQSection.module.css';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Comment garantir l\'authenticité des cartes ?',
      answer: 'Toutes nos cartes sont authentifiées par nos experts avant mise en vente. Nous collaborons avec des laboratoires certifiés et utilisons des outils professionnels de détection. Chaque carte premium est accompagnée d\'un certificat d\'authenticité.',
    },
    {
      question: 'Quels sont les délais de livraison ?',
      answer: 'Les commandes en stock sont expédiées sous 24-48h ouvrées. La livraison standard prend 3-5 jours ouvrés, et nous proposons également des options express. Vous recevrez un suivi détaillé de votre colis dès l\'expédition.',
    },
    {
      question: 'Proposez-vous des garanties sur les cartes ?',
      answer: 'Oui, toutes nos cartes bénéficient d\'une garantie d\'authenticité à vie. En cas de problème, nous offrons un retour gratuit sous 14 jours. Notre engagement est votre satisfaction totale.',
    },
    {
      question: 'Comment fonctionnent les précommandes ?',
      answer: 'Les précommandes vous permettent de réserver les prochaines sorties en avant-première. Un acompte de 30% est requis, le solde étant prélevé à l\'expédition. Vous bénéficiez de prix avantageux et de la priorité sur les stocks limités.',
    },
    {
      question: 'Quels modes de paiement acceptez-vous ?',
      answer: 'Nous acceptons les cartes bancaires (Visa, Mastercard, American Express), PayPal, virements bancaires pour les montants importants, et proposons également un système de paiement en plusieurs fois pour les commandes supérieures à 300€.',
    },
    {
      question: 'Offrez-vous un service de conseil personnalisé ?',
      answer: 'Absolument ! Notre équipe d\'experts est disponible pour vous conseiller dans vos choix, que vous soyez collectionneur débutant ou expert. Contactez-nous par email ou chat pour une consultation personnalisée gratuite.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Questions Fréquentes
          </h2>
          <p className={styles.subtitle}>
            Tout ce que vous devez savoir avant de faire confiance à BoulevardTCG
          </p>
          <div className={styles.divider}></div>
        </div>

        <div className={styles.faqList}>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`${styles.faqItem} ${openIndex === index ? styles.open : ''}`}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className={styles.faqButton}
              >
                <span className={styles.faqQuestion}>
                  {faq.question}
                </span>
                <span className={`${styles.faqIcon} ${openIndex === index ? styles.rotated : ''}`}>
                  ▼
                </span>
              </button>
              
              <div
                className={`${styles.faqAnswer} ${openIndex === index ? styles.visible : ''}`}
              >
                <div className={styles.faqAnswerContent}>
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

