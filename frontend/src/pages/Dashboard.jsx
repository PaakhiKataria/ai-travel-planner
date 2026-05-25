import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import TripCard from '../components/TripCard'

export default function Dashboard() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trip?')) return
    try {
      await api.delete(`/trips/${id}`)
      setTrips(trips.filter((t) => t.id !== id))
    } catch (err) {
      alert('Failed to delete trip')
    }
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
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
          <div style={styles.grid}>
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f7f8fc' },
  container: { maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  title: { margin: 0, fontSize: '28px', fontWeight: 'bold' },
  subtitle: { margin: '4px 0 0', color: '#666' },
  newBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '15px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  center: { textAlign: 'center', color: '#666', marginTop: '60px' },
  empty: {
    textAlign: 'center',
    marginTop: '80px',
    color: '#666',
  },
  emptyIcon: { fontSize: '64px', marginBottom: '16px' },
}