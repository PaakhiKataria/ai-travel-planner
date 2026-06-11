import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import TripCard from '../components/TripCard'

export default function Dashboard() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchTrips()
  }, [])

  const fetchTrips = async () => {
    try {
      const res = await api.get('/trips/')
      setTrips(res.data)
    } catch (err) {
      console.error('Failed to fetch trips', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true)
    setShowSuggestions(true)
    try {
      const res = await api.get('/trips/suggestions/ai')
      setSuggestions(res.data.suggestions || [])
    } catch {
      setSuggestions([])
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trip?')) return
    try {
      await api.delete(`/trips/${id}`)
      setTrips(trips.filter((t) => t.id !== id))
    } catch (err) {
      alert('Failed to delete trip')
    }
  }

  const budgetColors = {
    budget: { bg: '#E1F5EE', color: '#085041' },
    moderate: { bg: '#E6F1FB', color: '#0C447C' },
    luxury: { bg: '#EEEDFE', color: '#3C3489' },
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Trips</h1>
            <p style={styles.subtitle}>Your AI-generated travel itineraries</p>
          </div>
          <button style={styles.newBtn} onClick={() => navigate('/create')}>
            + Plan New Trip
          </button>
        </div>

        {loading ? (
          <p style={styles.center}>Loading your trips...</p>
        ) : trips.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyIcon}>🗺️</p>
            <h2>No trips yet!</h2>
            <p>Plan your first AI-powered trip</p>
            <button style={styles.newBtn} onClick={() => navigate('/create')}>
              + Plan Your First Trip
            </button>
          </div>
        ) : (
          <>
            {/* Trips Grid */}
            <div style={styles.grid}>
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
              ))}
            </div>

            {/* AI Suggestions */}
            {trips.length >= 2 && (
              <div style={styles.suggestionsSection}>
                <div style={styles.suggestionsHeader}>
                  <div>
                    <h2 style={styles.suggestionsTitle}>🤖 AI Trip Suggestions</h2>
                    <p style={styles.suggestionsSubtitle}>
                      Based on your travel history
                    </p>
                  </div>
                  <button
                    style={styles.suggestBtn}
                    onClick={fetchSuggestions}
                    disabled={suggestionsLoading}
                  >
                    {suggestionsLoading ? '⏳ Analyzing...' : showSuggestions ? '🔄 Refresh' : '✨ Get Suggestions'}
                  </button>
                </div>

                {suggestionsLoading && (
                  <div style={styles.loadingBox}>
                    <p style={styles.loadingIcon}>🤖</p>
                    <p>Analyzing your travel preferences...</p>
                  </div>
                )}

                {!suggestionsLoading && showSuggestions && suggestions.length > 0 && (
                  <div style={styles.suggestionsGrid}>
                    {suggestions.map((s, i) => (
                      <div key={i} style={styles.suggestionCard}>
                        <div style={styles.suggestionTop}>
                          <h3 style={styles.suggestionDest}>🌍 {s.destination}</h3>
                          <span style={{
                            ...styles.budgetBadge,
                            background: budgetColors[s.estimated_budget]?.bg || '#f0f0ff',
                            color: budgetColors[s.estimated_budget]?.color || '#667eea',
                          }}>
                            {s.estimated_budget === 'budget' ? '💰 Budget' :
                              s.estimated_budget === 'moderate' ? '💳 Moderate' : '💎 Luxury'}
                          </span>
                        </div>
                        <p style={styles.suggestionReason}>{s.reason}</p>
                        <div style={styles.suggestionMeta}>
                          <span style={styles.bestTime}>🗓️ Best time: {s.best_time}</span>
                        </div>
                        {s.highlights && (
                          <div style={styles.highlights}>
                            {s.highlights.map((h, j) => (
                              <span key={j} style={styles.highlight}>✓ {h}</span>
                            ))}
                          </div>
                        )}
                        <button
                          style={styles.planBtn}
                          onClick={() => navigate(`/create?destination=${encodeURIComponent(s.destination)}`)}
                        >
                          Plan This Trip →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f7f8fc' },
  container: { maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '32px',
  },
  title: { margin: 0, fontSize: '28px', fontWeight: 'bold' },
  subtitle: { margin: '4px 0 0', color: '#666' },
  newBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', border: 'none', borderRadius: '8px',
    cursor: 'pointer', fontWeight: 'bold', fontSize: '15px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  center: { textAlign: 'center', color: '#666', marginTop: '60px' },
  empty: { textAlign: 'center', marginTop: '80px', color: '#666' },
  emptyIcon: { fontSize: '64px', marginBottom: '16px' },
  suggestionsSection: {
    marginTop: '48px',
    background: 'white',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  suggestionsHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
  },
  suggestionsTitle: { margin: 0, fontSize: '20px', fontWeight: 'bold' },
  suggestionsSubtitle: { margin: '4px 0 0', color: '#888', fontSize: '14px' },
  suggestBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', border: 'none', borderRadius: '8px',
    cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
  },
  loadingBox: {
    textAlign: 'center', padding: '32px', color: '#666',
  },
  loadingIcon: { fontSize: '40px', marginBottom: '8px' },
  suggestionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  suggestionCard: {
    background: '#f9f9f9', borderRadius: '12px',
    padding: '20px', display: 'flex',
    flexDirection: 'column', gap: '10px',
    border: '1px solid #eee',
  },
  suggestionTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: '8px',
  },
  suggestionDest: { margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333' },
  budgetBadge: {
    fontSize: '11px', padding: '3px 10px',
    borderRadius: '20px', fontWeight: '500',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  suggestionReason: { margin: 0, color: '#666', fontSize: '13px', lineHeight: '1.5' },
  suggestionMeta: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  bestTime: { fontSize: '12px', color: '#888' },
  highlights: { display: 'flex', flexDirection: 'column', gap: '4px' },
  highlight: { fontSize: '12px', color: '#555' },
  planBtn: {
    marginTop: '4px', padding: '10px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', border: 'none', borderRadius: '8px',
    cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
    textAlign: 'center',
  },
}