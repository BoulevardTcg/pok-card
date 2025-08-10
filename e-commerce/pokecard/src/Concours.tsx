import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './Concours.module.css';
import { buyConcoursTicket } from './api';

export function Concours() {
  const [form, setForm] = useState({ nom: '', email: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { url } = await buyConcoursTicket(form)
      if (url) window.location.href = url
      setSubmitted(true);
    } catch (e) {
      alert('Erreur lors de la création du ticket')
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
      <section className={styles.banner}>
        <h1>Concours mensuel PokéCard</h1>
        <p>Participe au tirage au sort de fin de mois en achetant un ticket à 5 € !</p>
      </section>
      <section className={styles.steps}>
        <h2>Comment ça marche ?</h2>
        <div className={styles.stepsGrid}>
          <div className={styles.step}><span>🎟️</span>Acheter un ticket</div>
          <div className={styles.step}><span>⏳</span>Attendre le tirage</div>
          <div className={styles.step}><span>🏆</span>Gagner un item rare</div>
        </div>
      </section>
      <section className={styles.formSection}>
        <h3>Acheter un ticket</h3>
        {submitted ? (
          <div className={styles.success}>Merci pour ta participation ! Bonne chance 🍀</div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              type="text"
              name="nom"
              placeholder="Nom"
              value={form.nom}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              className={styles.submitBtn}
            >
              Acheter un ticket à 5 €
            </motion.button>
          </form>
        )}
      </section>
    </motion.div>
  );
} 