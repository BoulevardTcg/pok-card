import { useState } from 'react';
import styles from './ContactPage.module.css';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export function ContactPage() {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Simulation d'envoi (remplacez par votre vraie API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Ici vous pourriez appeler votre API backend
      // const response = await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // })
      
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      
      // Reset du statut après 5 secondes
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* En-tête */}
        <div className={styles.header}>
          <h1 className={styles.title}>Contactez-nous</h1>
          <div className={styles.divider}></div>
          <p className={styles.subtitle}>
            Une question ? Un problème ? Une suggestion ? 
            Notre équipe est à votre écoute pour vous accompagner dans votre passion du TCG.
          </p>
        </div>

        <div className={styles.content}>
          {/* Informations de contact */}
          <aside className={styles.info}>
            <h2 className={styles.infoTitle}>Nos coordonnées</h2>
            
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>📧</div>
              <div className={styles.infoContent}>
                <h3 className={styles.infoItemTitle}>Email</h3>
                <p className={styles.infoText}>contact@boulevardtcg.com</p>
                <small className={styles.infoSmall}>Réponse sous 24h</small>
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>🕒</div>
              <div className={styles.infoContent}>
                <h3 className={styles.infoItemTitle}>Horaires</h3>
                <p className={styles.infoText}>Lundi - Vendredi : 9h - 18h</p>
                <small className={styles.infoSmall}>Samedi : 10h - 16h</small>
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>🌍</div>
              <div className={styles.infoContent}>
                <h3 className={styles.infoItemTitle}>Support</h3>
                <p className={styles.infoText}>Support multilingue</p>
                <small className={styles.infoSmall}>Français, Anglais, Espagnol</small>
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>💬</div>
              <div className={styles.infoContent}>
                <h3 className={styles.infoItemTitle}>Chat en direct</h3>
                <p className={styles.infoText}>Disponible 24h/24</p>
                <small className={styles.infoSmall}>Via notre application</small>
              </div>
            </div>
          </aside>

          {/* Formulaire de contact */}
          <main className={styles.formContainer}>
            <h2 className={styles.formTitle}>Envoyez-nous un message</h2>
            
            {submitStatus === 'success' && (
              <div className={styles.successMessage}>
                ✅ Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.
              </div>
            )}

            {submitStatus === 'error' && (
              <div className={styles.errorMessage}>
                ❌ Erreur lors de l'envoi. Veuillez réessayer ou nous contacter directement.
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.label}>Nom complet *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Votre nom complet"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.label}>Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="votre@email.com"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="subject" className={styles.label}>Sujet *</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="Objet de votre message"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="message" className={styles.label}>Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="Décrivez votre demande en détail..."
                  className={styles.textarea}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.submitButton}
              >
                {isSubmitting ? (
                  <>
                    <span className={styles.spinner}></span>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    📤 Envoyer le message
                  </>
                )}
              </button>
            </form>
          </main>
        </div>

        {/* FAQ rapide */}
        <div className={styles.faq}>
          <h2 className={styles.faqTitle}>Questions fréquentes</h2>
          <div className={styles.faqGrid}>
            <div className={styles.faqItem}>
              <h3 className={styles.faqItemTitle}>Comment fonctionne le système d'échanges ?</h3>
              <p className={styles.faqItemText}>
                Vous pouvez proposer vos cartes en échange et rechercher des cartes spécifiques. 
                Notre plateforme facilite les échanges entre collectionneurs.
              </p>
            </div>
            
            <div className={styles.faqItem}>
              <h3 className={styles.faqItemTitle}>Comment participer aux concours ?</h3>
              <p className={styles.faqItemText}>
                Rendez-vous sur la page Concours pour voir les événements en cours et acheter 
                vos tickets de participation.
              </p>
            </div>
            
            <div className={styles.faqItem}>
              <h3 className={styles.faqItemTitle}>Livraison gratuite à partir de quel montant ?</h3>
              <p className={styles.faqItemText}>
                La livraison est gratuite dès 50€ d'achat en France métropolitaine.
              </p>
            </div>
            
            <div className={styles.faqItem}>
              <h3 className={styles.faqItemTitle}>Comment devenir vendeur sur la plateforme ?</h3>
              <p className={styles.faqItemText}>
                Contactez-nous via ce formulaire en précisant votre projet. Nous étudierons 
                votre demande et vous accompagnerons dans votre démarche.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
