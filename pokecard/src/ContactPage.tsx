import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MailIcon,
  ClockIcon,
  GlobeIcon,
  MessageIcon,
  SendIcon,
  CheckIcon,
} from './components/icons/Icons';
import styles from './ContactPage.module.css';
import { sendContactMessage } from './api';
import { useAuth } from './authContext';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
  companyWebsite?: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

// Fonction de validation d'email
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export function ContactPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: '',
    companyWebsite: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<FormErrors>({});
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Pré-remplir les champs avec les informations de l'utilisateur connecté
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email || prev.email,
        name: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.username || user.firstName || prev.name,
      }));
    }
  }, [isAuthenticated, user]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Effacer l'erreur du champ modifié
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
    
    // Validation en temps réel pour l'email
    if (name === 'email' && value && !validateEmail(value)) {
      setErrors((prev) => ({
        ...prev,
        email: 'Format d\'email invalide',
      }));
    } else if (name === 'email' && validateEmail(value)) {
      setErrors((prev) => ({
        ...prev,
        email: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validation du nom
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Le nom doit contenir au moins 2 caractères';
    }

    // Validation de l'email (obligatoire)
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!validateEmail(formData.email.trim())) {
      newErrors.email = 'Format d\'email invalide';
    }

    // Validation du sujet
    if (!formData.subject.trim()) {
      newErrors.subject = 'Le sujet est requis';
    } else if (formData.subject.trim().length < 2) {
      newErrors.subject = 'Le sujet doit contenir au moins 2 caractères';
    }

    // Validation du message
    if (!formData.message.trim()) {
      newErrors.message = 'Le message est requis';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Le message doit contenir au moins 10 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setErrors({});

    // Vérifier que l'utilisateur est connecté
    if (!isAuthenticated) {
      setErrorMessage('Vous devez être connecté pour envoyer un message. Redirection vers la page de connexion...');
      setTimeout(() => {
        navigate('/login', { state: { from: '/contact' } });
      }, 2000);
      return;
    }

    // Validation côté front
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await sendContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        companyWebsite: formData.companyWebsite,
      });

      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '', companyWebsite: '' });
      setErrors({});

      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error: any) {
      console.error(error);
      
      // Gérer les erreurs de validation du backend
      if (error?.response?.data?.code === 'VALIDATION_ERROR' && error?.response?.data?.details) {
        const backendErrors: FormErrors = {};
        error.response.data.details.forEach((detail: any) => {
          if (detail.path && detail.msg) {
            backendErrors[detail.path as keyof FormErrors] = detail.msg;
          }
        });
        setErrors(backendErrors);
        setErrorMessage('Veuillez corriger les erreurs dans le formulaire');
      } else {
        setErrorMessage(error?.response?.data?.error || 'Erreur lors de l\'envoi. Veuillez réessayer.');
        setSubmitStatus('error');
      }
      
      setTimeout(() => {
        setSubmitStatus('idle');
        setErrorMessage('');
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.overline}>Contact</span>
          <h1 className={styles.title}>
            Une question ?<br />
            Nous sommes là pour vous aider.
          </h1>
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

            {!isAuthenticated && (
              <div className={`${styles.statusMessage} ${styles.warning}`}>
                <span>
                  Vous devez être connecté pour envoyer un message de contact.{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login', { state: { from: '/contact' } })}
                    className={styles.linkButton}
                  >
                    Se connecter
                  </button>
                </span>
              </div>
            )}

            {submitStatus === 'success' && (
              <div className={styles.statusMessage}>
                <CheckIcon size={16} strokeWidth={2} />
                <span>
                  Message envoyé avec succès. Nous vous répondrons dans les plus brefs délais.
                </span>
              </div>
            )}

            {(submitStatus === 'error' || errorMessage) && (
              <div className={`${styles.statusMessage} ${styles.error}`}>
                <span>
                  {errorMessage || 'Erreur lors de l\'envoi. Veuillez réessayer ou nous contacter directement.'}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div
                style={{
                  position: 'absolute',
                  left: '-10000px',
                  top: 'auto',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                }}
                aria-hidden="true"
              >
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
                  <label htmlFor="name" className={styles.label}>
                    Nom complet <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Votre nom complet"
                    className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  {errors.name && (
                    <span id="name-error" className={styles.errorMessage} role="alert">
                      {errors.name}
                    </span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.label}>
                    Email <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="votre@email.com"
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    aria-required="true"
                  />
                  {errors.email && (
                    <span id="email-error" className={styles.errorMessage} role="alert">
                      {errors.email}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="subject" className={styles.label}>
                  Sujet <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="Objet de votre message"
                  className={`${styles.input} ${errors.subject ? styles.inputError : ''}`}
                  aria-invalid={!!errors.subject}
                  aria-describedby={errors.subject ? 'subject-error' : undefined}
                />
                {errors.subject && (
                  <span id="subject-error" className={styles.errorMessage} role="alert">
                    {errors.subject}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="message" className={styles.label}>
                  Message <span className={styles.required}>*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="Décrivez votre demande en détail..."
                  className={`${styles.textarea} ${errors.message ? styles.textareaError : ''}`}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? 'message-error' : undefined}
                />
                {errors.message && (
                  <span id="message-error" className={styles.errorMessage} role="alert">
                    {errors.message}
                  </span>
                )}
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !isAuthenticated} 
                className={styles.submitButton}
                title={!isAuthenticated ? 'Vous devez être connecté pour envoyer un message' : undefined}
              >
                {isSubmitting ? (
                  <>
                    <span className={styles.spinner}></span>
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <span>{!isAuthenticated ? 'Connexion requise' : 'Envoyer le message'}</span>
                    {isAuthenticated && <SendIcon size={18} strokeWidth={1.5} />}
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
                Rendez-vous sur la page Concours pour voir les événements en cours et acheter vos
                tickets de participation.
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
                Contactez-nous via ce formulaire en précisant votre projet. Nous étudierons votre
                demande et vous accompagnerons dans votre démarche.
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
