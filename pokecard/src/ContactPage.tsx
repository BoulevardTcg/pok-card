import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { MailIcon, ClockIcon, GlobeIcon, MessageIcon, SendIcon, CheckIcon } from './components/icons/Icons';
import styles from './ContactPage.module.css';
import { sendContactMessage } from './api';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
  companyWebsite?: string;
}

export function ContactPage() {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: '',
    companyWebsite: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await sendContactMessage({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        companyWebsite: formData.companyWebsite,
      })
      
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '', companyWebsite: '' });
      
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error: any) {
      console.error(error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.overline}>Contact</span>
          <h1 className={styles.title}>Une question ?<br />Nous sommes là pour vous aider.</h1>
          <p className={styles.subtitle}>
            Notre équipe est à votre écoute pour vous accompagner dans votre passion du TCG.
          </p>
        </header>

        <div className={styles.content}>
          <aside className={styles.contactInfo}>
            <h2 className={styles.infoTitle}>Nos coordonnées</h2>
            
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <MailIcon size={20} strokeWidth={1.5} />
                </div>
                <div className={styles.infoContent}>
                  <h3 className={styles.infoItemTitle}>Email</h3>
                  <p className={styles.infoText}>Via le formulaire ci-contre</p>
                  <small className={styles.infoSmall}>Réponse sous 24h (ouvrés)</small>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <ClockIcon size={20} strokeWidth={1.5} />
                </div>
                <div className={styles.infoContent}>
                  <h3 className={styles.infoItemTitle}>Horaires</h3>
                  <p className={styles.infoText}>Lundi - Vendredi : 9h - 18h</p>
                  <small className={styles.infoSmall}>Samedi : 10h - 16h</small>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <GlobeIcon size={20} strokeWidth={1.5} />
                </div>
                <div className={styles.infoContent}>
                  <h3 className={styles.infoItemTitle}>Support</h3>
                  <p className={styles.infoText}>Support multilingue</p>
                  <small className={styles.infoSmall}>Français, Anglais, Espagnol</small>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <MessageIcon size={20} strokeWidth={1.5} />
                </div>
                <div className={styles.infoContent}>
                  <h3 className={styles.infoItemTitle}>Chat en direct</h3>
                  <p className={styles.infoText}>Disponible 24h/24</p>
                  <small className={styles.infoSmall}>Via notre application</small>
                </div>
              </div>
            </div>
          </aside>

          {/* Formulaire de contact */}
          <main className={styles.formSection}>
            <h2 className={styles.formTitle}>Envoyez-nous un message</h2>
            
            {submitStatus === 'success' && (
              <div className={styles.statusMessage}>
                <CheckIcon size={16} strokeWidth={2} />
                <span>Message envoyé avec succès. Nous vous répondrons dans les plus brefs délais.</span>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className={`${styles.statusMessage} ${styles.error}`}>
                <span>Erreur lors de l'envoi. Veuillez réessayer ou nous contacter directement.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
                <label htmlFor="companyWebsite">Website</label>
                <input
                  type="text"
                  id="companyWebsite"
                  name="companyWebsite"
                  value=""
                  readOnly
                  tabIndex={-1}
                  autoComplete="new-password"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.label}>Nom complet</label>
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
                  <label htmlFor="email" className={styles.label}>Email</label>
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
                <label htmlFor="subject" className={styles.label}>Sujet</label>
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
                <label htmlFor="message" className={styles.label}>Message</label>
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
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Envoyer le message</span>
                    <SendIcon size={18} strokeWidth={1.5} />
                  </>
                )}
              </button>
            </form>
          </main>
        </div>

        <section className={styles.faqSection}>
          <h2 className={styles.faqTitle}>Questions fréquentes</h2>
          <div className={styles.faqGrid}>
            <article className={styles.faqItem}>
              <h3 className={styles.faqItemTitle}>Comment fonctionne le système d'échanges ?</h3>
              <p className={styles.faqItemText}>
                Vous pouvez proposer vos cartes en échange et rechercher des cartes spécifiques. 
                Notre plateforme facilite les échanges entre collectionneurs.
              </p>
            </article>
            
            <article className={styles.faqItem}>
              <h3 className={styles.faqItemTitle}>Comment participer aux concours ?</h3>
              <p className={styles.faqItemText}>
                Rendez-vous sur la page Concours pour voir les événements en cours et acheter 
                vos tickets de participation.
              </p>
            </article>
            
            <article className={styles.faqItem}>
              <h3 className={styles.faqItemTitle}>Livraison gratuite à partir de quel montant ?</h3>
              <p className={styles.faqItemText}>
                La livraison est gratuite dès 50€ d'achat en France métropolitaine.
              </p>
            </article>
            
            <article className={styles.faqItem}>
              <h3 className={styles.faqItemTitle}>Comment devenir vendeur sur la plateforme ?</h3>
              <p className={styles.faqItemText}>
                Contactez-nous via ce formulaire en précisant votre projet. Nous étudierons 
                votre demande et vous accompagnerons dans votre démarche.
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
