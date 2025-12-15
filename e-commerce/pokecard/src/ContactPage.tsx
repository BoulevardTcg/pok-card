import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { AnimatedSection } from './components/AnimatedSection'
import './ContactPage.css'

interface ContactForm {
  name: string
  email: string
  subject: string
  message: string
}

export function ContactPage() {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Simulation d'envoi (remplacez par votre vraie API)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Ici vous pourriez appeler votre API backend
      // const response = await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // })
      
      setSubmitStatus('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
      
      // Reset du statut après 5 secondes
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } catch (error) {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="contact-container">
      {/* Effet de fond avec gradients */}
      <div className="contact-bg-effects">
        <div className="bg-gradient-1"></div>
        <div className="bg-gradient-2"></div>
        <div className="bg-gradient-3"></div>
      </div>

      <div className="contact-content">
        {/* En-tête */}
        <AnimatedSection animation="fadeUp" delay={0.1}>
          <div className="contact-header">
            <h1>Contactez-nous</h1>
            <p>Une question ? Un problème ? Une suggestion ? N'hésitez pas à nous contacter !</p>
          </div>
        </AnimatedSection>

        <div className="contact-main">
          {/* Informations de contact */}
          <AnimatedSection animation="slideLeft" delay={0.2}>
            <div className="contact-info">
              <h2>Nos coordonnées</h2>
              
              <div className="info-item">
                <div className="info-icon">📧</div>
                <div className="info-content">
                  <h3>Email</h3>
                  <p>contact@boulevardtcg.com</p>
                  <small>Réponse sous 24h</small>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">🕒</div>
                <div className="info-content">
                  <h3>Horaires</h3>
                  <p>Lundi - Vendredi : 9h - 18h</p>
                  <small>Samedi : 10h - 16h</small>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">🌍</div>
                <div className="info-content">
                  <h3>Support</h3>
                  <p>Support multilingue</p>
                  <small>Français, Anglais, Espagnol</small>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">💬</div>
                <div className="info-content">
                  <h3>Chat en direct</h3>
                  <p>Disponible 24h/24</p>
                  <small>Via notre application</small>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Formulaire de contact */}
          <AnimatedSection animation="slideRight" delay={0.3}>
            <div className="contact-form-container">
              <h2>Envoyez-nous un message</h2>
              
              {submitStatus === 'success' && (
                <motion.div 
                  className="success-message"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  ✅ Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.
                </motion.div>
              )}

              {submitStatus === 'error' && (
                <motion.div 
                  className="error-message"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  ❌ Erreur lors de l'envoi. Veuillez réessayer ou nous contacter directement.
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Nom complet *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Votre nom complet"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="votre@email.com"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Sujet *</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="Objet de votre message"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    placeholder="Décrivez votre demande en détail..."
                    className="form-textarea"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="submit-button"
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading-spinner"></span>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      📤 Envoyer le message
                    </>
                  )}
                </button>
              </form>
            </div>
          </AnimatedSection>
        </div>

        {/* FAQ rapide */}
        <AnimatedSection animation="fadeUp" delay={0.4}>
          <div className="contact-faq">
            <h2>Questions fréquentes</h2>
            <div className="faq-grid">
              <div className="faq-item">
                <h3>Comment fonctionne le système d'échanges ?</h3>
                <p>Vous pouvez proposer vos cartes en échange et rechercher des cartes spécifiques. Notre plateforme facilite les échanges entre collectionneurs.</p>
              </div>
              
              <div className="faq-item">
                <h3>Comment participer aux concours ?</h3>
                <p>Rendez-vous sur la page Concours pour voir les événements en cours et acheter vos tickets de participation.</p>
              </div>
              
              <div className="faq-item">
                <h3>Livraison gratuite à partir de quel montant ?</h3>
                <p>La livraison est gratuite dès 50€ d'achat en France métropolitaine.</p>
              </div>
              
              <div className="faq-item">
                <h3>Comment devenir vendeur sur la plateforme ?</h3>
                <p>Contactez-nous via ce formulaire en précisant votre projet. Nous étudierons votre demande et vous accompagnerons dans votre démarche.</p>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
