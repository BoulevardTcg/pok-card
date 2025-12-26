import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatedSection } from './components/AnimatedSection';
import { AnimatedGrid } from './components/AnimatedGrid';

interface Contest {
  id: string;
  title: string;
  description: string;
  prize: string;
  prizeImage: string;
  startDate: string;
  endDate: string;
  ticketPrice: number;
  maxTickets: number;
  soldTickets: number;
  status: 'upcoming' | 'active' | 'ended';
  winner?: string;
  participants: number;
}

export function Concours() {
  const [currentContest, setCurrentContest] = useState<Contest | null>(null);
  const [pastContests, setPastContests] = useState<Contest[]>([]);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);

  // Données simulées pour les concours
  useEffect(() => {
    const mockContests: Contest[] = [
      {
        id: '1',
        title: '🎴 Collection Élite Pokémon',
        description: 'Gagnez une collection complète de cartes Pokémon rares et holographiques !',
        prize: 'Collection Élite Pokémon (50 cartes)',
        prizeImage: '/public/img/ancient.png',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        ticketPrice: 5,
        maxTickets: 1000,
        soldTickets: 847,
        status: 'active',
        participants: 847
      },
      {
        id: '2',
        title: '🌟 Booster Box One Piece',
        description: 'Une boîte complète de boosters One Piece pour les fans de la série !',
        prize: 'Booster Box One Piece (24 boosters)',
        prizeImage: '/public/img/ancient.png',
        startDate: '2024-02-01',
        endDate: '2024-11-30',
        ticketPrice: 3,
        maxTickets: 500,
        soldTickets: 312,
        status: 'active',
        participants: 312
      },
      {
        id: '3',
        title: '🏆 Dragon Ball Super Collection',
        description: 'Collection exclusive Dragon Ball Super avec cartes signées !',
        prize: 'Collection Dragon Ball Super + Autographes',
        prizeImage: '/public/img/ancient.png',
        startDate: '2024-01-15',
        endDate: '2024-10-15',
        ticketPrice: 7,
        maxTickets: 300,
        soldTickets: 300,
        status: 'ended',
        winner: 'Alexandre D.',
        participants: 300
      }
    ];

    setCurrentContest(mockContests.find(c => c.status === 'active') || null);
    setPastContests(mockContests.filter(c => c.status === 'ended'));
  }, []);

  // Compte à rebours pour le concours actuel
  useEffect(() => {
    if (!currentContest) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(currentContest.endDate).getTime();
      const distance = end - now;

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentContest]);

  const handleBuyTicket = (contest: Contest) => {
    setSelectedContest(contest);
    setShowTicketModal(true);
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContest) return;

    setLoading(true);
    
    // Simulation d'achat de ticket
    setTimeout(() => {
      alert(`🎉 Ticket acheté avec succès pour "${selectedContest.title}" !\nBonne chance ! 🍀`);
      setShowTicketModal(false);
      setTicketForm({ name: '', email: '', phone: '' });
      setLoading(false);
      
      // Mettre à jour le nombre de tickets vendus
      if (selectedContest) {
        const updatedContest = { ...selectedContest, soldTickets: selectedContest.soldTickets + 1, participants: selectedContest.participants + 1 };
        setCurrentContest(updatedContest);
      }
    }, 1500);
  };

  const calculateProgress = (contest: Contest) => {
    return (contest.soldTickets / contest.maxTickets) * 100;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      padding: '24px'
    }}>
      {/* Header principal */}
      <AnimatedSection animation="fadeUp" delay={0.1}>
        <div style={{ textAlign: 'center', marginBottom: '48px', padding: '32px 0' }}>
          <h1 style={{ 
            fontSize: '3.5rem', 
            marginBottom: '16px',
            background: 'linear-gradient(45deg, #fde047, #fbbf24)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            🏆 Concours Pokémon
          </h1>
          <p style={{ 
            fontSize: '1.3rem', 
            color: '#94a3b8',
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            Participez à nos concours exclusifs et remportez des collections de cartes rares !
          </p>
        </div>
      </AnimatedSection>

      {/* Concours en cours */}
      {currentContest && (
        <AnimatedSection animation="slideLeft" delay={0.2}>
          <div style={{ 
            background: 'rgba(253, 224, 71, 0.1)',
            border: '2px solid rgba(253, 224, 71, 0.3)',
            borderRadius: '24px',
            padding: '32px',
            marginBottom: '48px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Effet de brillance */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(253, 224, 71, 0.1), transparent)',
              transition: 'left 0.8s ease'
            }} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
              <div>
                <div style={{ 
                  display: 'inline-block',
                  background: 'rgba(253, 224, 71, 0.2)',
                  color: '#fde047',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  marginBottom: '16px'
                }}>
                  🎯 CONCOURS EN COURS
                </div>
                
                <h2 style={{ 
                  fontSize: '2.2rem', 
                  marginBottom: '16px',
                  color: '#fde047'
                }}>
                  {currentContest.title}
                </h2>
                
                <p style={{ 
                  fontSize: '1.1rem', 
                  color: '#e2e8f0',
                  marginBottom: '24px',
                  lineHeight: '1.6'
                }}>
                  {currentContest.description}
                </p>

                {/* Compte à rebours */}
                <div style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  marginBottom: '24px',
                  flexWrap: 'wrap'
                }}>
                  {Object.entries(timeLeft).map(([unit, value]) => (
                    <div key={unit} style={{ 
                      textAlign: 'center',
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '16px',
                      borderRadius: '12px',
                      minWidth: '80px'
                    }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fde047' }}>
                        {value.toString().padStart(2, '0')}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                        {unit === 'days' ? 'Jours' : unit === 'hours' ? 'Heures' : unit === 'minutes' ? 'Minutes' : 'Secondes'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Prix */}
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '20px',
                  borderRadius: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '8px' }}>
                    🎁 Prix à gagner :
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '600', color: '#fde047' }}>
                    {currentContest.prize}
                  </div>
                </div>

                <button
                  onClick={() => handleBuyTicket(currentContest)}
                  style={{
                    background: 'linear-gradient(45deg, #fde047, #fbbf24)',
                    color: '#1e293b',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '16px 32px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 8px 25px rgba(253, 224, 71, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 35px rgba(253, 224, 71, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(253, 224, 71, 0.3)';
                  }}
                >
                  🎫 Acheter un ticket ({currentContest.ticketPrice}€)
                </button>
              </div>

              <div style={{ textAlign: 'center' }}>
                <img 
                  src={currentContest.prizeImage} 
                  alt="Prix" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '300px',
                    borderRadius: '16px',
                    filter: 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.3))'
                  }} 
                />
                
                {/* Progression des tickets */}
                <div style={{ marginTop: '24px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: '8px',
                    fontSize: '0.9rem'
                  }}>
                    <span>Tickets vendus : {currentContest.soldTickets}</span>
                    <span>{currentContest.maxTickets - currentContest.soldTickets} restants</span>
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${calculateProgress(currentContest)}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #fde047, #fbbf24)',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* Statistiques des concours */}
      <AnimatedSection animation="fadeIn" delay={0.3}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          marginBottom: '48px'
        }}>
          <div style={{ 
            textAlign: 'center',
            background: 'rgba(6, 182, 212, 0.1)',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#06b6d4' }}>
              {currentContest ? currentContest.participants : 0}
            </div>
            <div style={{ color: '#94a3b8' }}>Participants actifs</div>
          </div>
          
          <div style={{ 
            textAlign: 'center',
            background: 'rgba(139, 92, 246, 0.1)',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>
              {pastContests.length}
            </div>
            <div style={{ color: '#94a3b8' }}>Concours terminés</div>
          </div>
          
          <div style={{ 
            textAlign: 'center',
            background: 'rgba(34, 197, 94, 0.1)',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#22c55e' }}>
              {pastContests.filter(c => c.winner).length}
            </div>
            <div style={{ color: '#94a3b8' }}>Gagnants</div>
          </div>
        </div>
      </AnimatedSection>

      {/* Historique des concours */}
      <AnimatedSection animation="slideRight" delay={0.4}>
        <h2 style={{ 
          fontSize: '2rem', 
          textAlign: 'center', 
          marginBottom: '32px',
          color: '#fde047'
        }}>
          📚 Historique des concours
        </h2>
        
        <AnimatedGrid className="past-contests" staggerDelay={0.1}>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '24px'
          }}>
            {pastContests.map(contest => (
              <motion.div
                key={contest.id}
                whileHover={{ 
                  scale: 1.02,
                  y: -4,
                  transition: { duration: 0.2 }
                }}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  <img 
                    src={contest.prizeImage} 
                    alt="Prix" 
                    style={{ 
                      width: '60px', 
                      height: '60px',
                      borderRadius: '12px',
                      objectFit: 'cover'
                    }} 
                  />
                  <div>
                    <h3 style={{ 
                      fontSize: '1.2rem', 
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}>
                      {contest.title}
                    </h3>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: '#94a3b8'
                    }}>
                      {formatDate(contest.endDate)}
                    </div>
                  </div>
                </div>
                
                <p style={{ 
                  color: '#e2e8f0',
                  marginBottom: '16px',
                  lineHeight: '1.5'
                }}>
                  {contest.description}
                </p>
                
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '4px' }}>
                    🎁 Prix gagné :
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                    {contest.prize}
                  </div>
                </div>
                
                {contest.winner && (
                  <div style={{ 
                    background: 'rgba(253, 224, 71, 0.1)',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    border: '1px solid rgba(253, 224, 71, 0.3)'
                  }}>
                    <div style={{ fontSize: '0.9rem', color: '#fde047', marginBottom: '4px' }}>
                      🏆 Gagnant
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                      {contest.winner}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </AnimatedGrid>
      </AnimatedSection>

      {/* Modal d'achat de ticket */}
      {showTicketModal && selectedContest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '24px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              border: '2px solid rgba(253, 224, 71, 0.3)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowTicketModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ×
            </button>
            
            <h3 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '16px',
              color: '#fde047',
              textAlign: 'center'
            }}>
              🎫 Acheter un ticket
            </h3>
            
            <div style={{ 
              background: 'rgba(253, 224, 71, 0.1)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                {selectedContest.title}
              </div>
              <div style={{ color: '#fde047', fontWeight: '600' }}>
                Prix : {selectedContest.ticketPrice}€
              </div>
        </div>
            
            <form onSubmit={handleTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="text"
                placeholder="Votre nom complet"
                value={ticketForm.name}
                onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
              required
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
              
            <input
              type="email"
                placeholder="Votre email"
                value={ticketForm.email}
                onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
              required
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
              
              <input
                type="tel"
                placeholder="Votre téléphone (optionnel)"
                value={ticketForm.phone}
                onChange={(e) => setTicketForm({ ...ticketForm, phone: e.target.value })}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
              
              <button
              type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(45deg, #fde047, #fbbf24)',
                  color: '#1e293b',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '16px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? (
                  <>
                    <svg style={{ display: 'inline-block', width: '16px', height: '16px', marginRight: '8px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                    Traitement...
                  </>
                ) : (
                  `💳 Payer ${selectedContest.ticketPrice}€`
                )}
              </button>
          </form>
          </motion.div>
        </div>
        )}
    </div>
  );
} 