import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/axios'

export default function ShareTrip() {
  const { share_token } = useParams()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState(0)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetchSharedTrip()
  }, [share_token])

  const fetchSharedTrip = async () => {
    try {
      const res = await api.get(`/trips/share/${share_token}`)
      setTrip(res.data)
    } catch (err) {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.navbar}>✈️ AI Travel Planner</div>
      <p style={styles.center}>Loading trip...</p>
    </div>
  )

  if (notFound) return (
    <div style={styles.page}>
      <div style={styles.navbar}>✈️ AI Travel Planner</div>
      <div style={styles.notFound}>
        <p style={styles.notFoundIcon}>🗺️</p>
        <h2>Trip not found</h2>
        <p>This link may be invalid or expired.</p>
      </div>
    </div>
  )

  const days = trip.itinerary?.days || []
  const hotels = trip.itinerary?.hotels || []

  return (
    <div style={styles.page}>

      {/* Navbar */}
      <div style={styles.navbar}>
        <span style={styles.navLogo}>✈️ AI Travel Planner</span>
        <span style={styles.navBadge}>Shared Itinerary</span>
      </div>

      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>🌍 {trip.destination}</h1>
          <p style={styles.meta}>
            {trip.num_days} days · {trip.budget} budget · {trip.interests}
          </p>
        </div>

        {/* Cost */}
        {trip.itinerary?.total_estimated_cost && (
          <div style={styles.infoBar}>
            <span>💰 Total estimated cost: <strong>{trip.itinerary.total_estimated_cost}</strong></span>
          </div>
        )}

        {/* Tips */}
        {trip.itinerary?.tips && (
          <div style={styles.tipsBox}>
            <h3 style={styles.tipsTitle}>💡 Travel Tips</h3>
            <ul style={styles.tipsList}>
              {trip.itinerary.tips.map((tip, i) => (
                <li key={i} style={styles.tip}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Day tabs */}
        <div style={styles.tabs}>
          {days.map((day, i) => (
            <button
              key={i}
              style={{
                ...styles.tab,
                ...(activeDay === i ? styles.tabActive : {})
              }}
              onClick={() => setActiveDay(i)}
            >
              Day {day.day}
            </button>
          ))}
        </div>

        {/* Places */}
        {days[activeDay] && (
          <div>
            <h2 style={styles.dayTitle}>{days[activeDay].title}</h2>
            <div style={styles.places}>
              {days[activeDay].places.map((place, i) => (
                <div key={i} style={styles.placeCard}>
                  <div style={styles.placeTime}>{place.time}</div>
                  <div style={styles.placeInfo}>
                    <h3 style={styles.placeName}>{place.name}</h3>
                    <p style={styles.placeDesc}>{place.description}</p>
                    <div style={styles.placeMeta}>
                      <span style={styles.placeCost}>💰 {place.estimated_cost}</span>
                      <a
                        href={`https://www.google.com/maps/search/${encodeURIComponent(place.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.mapsLink}
                      >
                        📍 View on Maps
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hotels */}
        {hotels.length > 0 && (
          <div style={styles.hotelsSection}>
            <h2 style={styles.hotelsTitle}>🏨 Recommended Hotels</h2>
            <p style={styles.hotelsSubtitle}>
              {hotels.length} {trip.budget} hotels in {trip.destination}
            </p>
            <div style={styles.hotelList}>
              {hotels.map((hotel, i) => (
                <div key={i} style={styles.hotelItem}>
                  <div style={styles.hotelNumber}>{i + 1}</div>
                  <div style={styles.hotelItemLeft}>
                    <div style={styles.hotelName}>{hotel.name}</div>
                    <div style={styles.hotelLocation}>📍 {hotel.location}</div>
                    <div style={styles.hotelDesc}>{hotel.description}</div>
                  </div>
                  <div style={styles.hotelItemRight}>
                    <div style={styles.hotelPrice}>
                      {hotel.price_per_night}
                      <span style={styles.perNight}>/night</span>
                    </div>
                    <div style={styles.hotelRating}>⭐ {hotel.rating}</div>
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(hotel.name + ' ' + trip.destination)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.mapsLink}
                    >
                      View on Maps →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <p>Created with ✈️ AI Travel Planner</p>
        </div>

      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f7f8fc' },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    background: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  navLogo: {
    fontSize: '20px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  navBadge: {
    fontSize: '12px',
    padding: '4px 12px',
    background: '#f0f0ff',
    color: '#667eea',
    borderRadius: '20px',
    fontWeight: 'bold',
    border: '1px solid #667eea',
  },
  container: { maxWidth: '800px', margin: '0 auto', padding: '32px 24px' },
  center: { textAlign: 'center', marginTop: '60px', color: '#666' },
  notFound: { textAlign: 'center', marginTop: '80px', color: '#666' },
  notFoundIcon: { fontSize: '64px', marginBottom: '16px' },
  header: { marginBottom: '24px' },
  title: { margin: '0 0 8px', fontSize: '28px', fontWeight: 'bold' },
  meta: { margin: 0, color: '#666' },
  infoBar: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    marginBottom: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    color: '#333',
  },
  tipsBox: {
    background: '#fffbea',
    border: '1px solid #fde68a',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '24px',
  },
  tipsTitle: { margin: '0 0 10px', fontSize: '16px' },
  tipsList: { margin: 0, paddingLeft: '20px' },
  tip: { color: '#555', marginBottom: '6px', fontSize: '14px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '2px solid #ddd',
    background: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
    color: '#666',
  },
  tabActive: {
    border: '2px solid #667eea',
    color: '#667eea',
    background: '#f0f0ff',
  },
  dayTitle: { fontSize: '20px', marginBottom: '16px', color: '#333' },
  places: { display: 'flex', flexDirection: 'column', gap: '16px' },
  placeCard: {
    display: 'flex',
    gap: '16px',
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    alignItems: 'flex-start',
  },
  placeTime: {
    minWidth: '80px',
    color: '#667eea',
    fontWeight: 'bold',
    fontSize: '14px',
    paddingTop: '2px',
  },
  placeInfo: { flex: 1 },
  placeName: { margin: '0 0 6px', fontSize: '16px', fontWeight: 'bold' },
  placeDesc: { margin: '0 0 10px', color: '#666', fontSize: '14px', lineHeight: '1.5' },
  placeMeta: { display: 'flex', gap: '16px', alignItems: 'center' },
  placeCost: { color: '#555', fontSize: '13px' },
  mapsLink: { color: '#667eea', fontSize: '13px', textDecoration: 'none' },
  hotelsSection: {
    marginTop: '40px',
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
  },
  hotelsTitle: { fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px' },
  hotelsSubtitle: {
    color: '#888',
    fontSize: '14px',
    margin: '0 0 20px',
    textTransform: 'capitalize',
  },
  hotelList: { display: 'flex', flexDirection: 'column' },
  hotelItem: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '16px 0',
    borderBottom: '1px solid #f0f0f0',
    gap: '14px',
  },
  hotelNumber: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 'bold',
    flexShrink: 0,
    marginTop: '2px',
  },
  hotelItemLeft: { flex: 1 },
  hotelName: { fontWeight: 'bold', fontSize: '15px', marginBottom: '2px' },
  hotelLocation: { color: '#888', fontSize: '12px', marginBottom: '4px' },
  hotelDesc: { color: '#666', fontSize: '13px', lineHeight: '1.5' },
  hotelItemRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    flexShrink: 0,
  },
  hotelPrice: { fontWeight: 'bold', fontSize: '15px', color: '#333' },
  perNight: { fontSize: '11px', color: '#888', fontWeight: 'normal' },
  hotelRating: { fontSize: '13px', color: '#f6ad55' },
  footer: {
    textAlign: 'center',
    marginTop: '40px',
    color: '#aaa',
    fontSize: '13px',
  },
}