import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY

export default function TripCard({ trip, onDelete }) {
  const navigate = useNavigate()
  const [bgImage, setBgImage] = useState(null)

  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        const query = trip.destination.split(',')[0]
        const res = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
          {
            headers: {
              Authorization: PEXELS_API_KEY,
            },
          }
        )
        const data = await res.json()
        if (data.photos && data.photos.length > 0) {
          setBgImage(data.photos[0].src.large)
        }
      } catch {
        setBgImage(null)
      }
    }
    fetchPhoto()
  }, [trip.destination])

  return (
    <div style={styles.card}>

      {/* Background Image */}
      <div
        style={{
          ...styles.cardBg,
          backgroundImage: bgImage
            ? `url(${bgImage})`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div style={styles.cardOverlay} />
        <div style={styles.cardTop}>
          <h3 style={styles.destination}>{trip.destination}</h3>
          <p style={styles.meta}>{trip.num_days} days · {trip.budget} budget</p>
        </div>
      </div>

      {/* Card Body */}
      <div style={styles.cardBody}>
        <p style={styles.interests}>🎯 {trip.interests}</p>

        {trip.itinerary?.total_estimated_cost && (
          <p style={styles.cost}>
            💰 Estimated: <strong>{trip.itinerary.total_estimated_cost}</strong>
          </p>
        )}

        <p style={styles.date}>
          📅 {new Date(trip.created_at).toLocaleDateString()}
        </p>

        <div style={styles.actions}>
          <button
            style={styles.viewBtn}
            onClick={() => navigate(`/trips/${trip.id}`)}
          >
            View Itinerary
          </button>
          <button
            style={styles.deleteBtn}
            onClick={() => onDelete(trip.id)}
          >
            Delete
          </button>
        </div>
      </div>

    </div>
  )
}

const styles = {
  card: {
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    background: 'white',
    transition: 'transform 0.2s',
  },
  cardBg: {
    height: '160px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '16px',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6))',
  },
  cardTop: {
    position: 'relative',
    zIndex: 1,
  },
  destination: {
    margin: '0 0 4px',
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  },
  meta: {
    margin: 0,
    color: 'rgba(255,255,255,0.9)',
    fontSize: '13px',
  },
  cardBody: {
    padding: '16px',
  },
  interests: { color: '#555', fontSize: '13px', marginBottom: '6px' },
  cost: { color: '#555', fontSize: '13px', marginBottom: '6px' },
  date: { color: '#999', fontSize: '12px', marginBottom: '14px' },
  actions: { display: 'flex', gap: '10px' },
  viewBtn: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  deleteBtn: {
    padding: '10px 16px',
    background: 'transparent',
    color: '#e53e3e',
    border: '1px solid #e53e3e',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
}