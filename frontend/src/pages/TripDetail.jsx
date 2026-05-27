import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Navbar from '../components/Navbar'

const INTERESTS = ['Food', 'Culture', 'History', 'Nature', 'Adventure', 'Shopping', 'Art', 'Nightlife']

export default function TripDetail() {
  const { id } = useParams()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState(0)
  const [copied, setCopied] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [weather, setWeather] = useState(null)
  const [packingList, setPackingList] = useState(null)
  const [packingLoading, setPackingLoading] = useState(false)
  const [showPacking, setShowPacking] = useState(false)
  const [checkedItems, setCheckedItems] = useState({})

  const [editNumDays, setEditNumDays] = useState(3)
  const [editBudget, setEditBudget] = useState('moderate')
  const [editInterests, setEditInterests] = useState([])

  const navigate = useNavigate()

  useEffect(() => {
    fetchTrip()
  }, [id])

  const fetchTrip = async () => {
    try {
      const res = await api.get(`/trips/${id}`)
      setTrip(res.data)
      setEditNumDays(res.data.num_days)
      setEditBudget(res.data.budget)
      setEditInterests(res.data.interests.split(', '))
    } catch (err) {
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const city = trip?.destination.split(',')[0]
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${import.meta.env.VITE_WEATHER_API_KEY}&units=metric&cnt=40`
        )
        const data = await res.json()
        if (data.cod === '200') {
          const dailyMap = {}
          data.list.forEach(item => {
            const date = item.dt_txt.split(' ')[0]
            const time = item.dt_txt.split(' ')[1]
            if (time === '12:00:00' || !dailyMap[date]) {
              dailyMap[date] = item
            }
          })
          const days = Object.values(dailyMap).slice(0, 5)
          setWeather(days)
        }
      } catch {
        setWeather(null)
      }
    }
    if (trip) fetchWeather()
  }, [trip])

  const fetchPackingList = async () => {
    if (packingList) {
      setShowPacking(true)
      return
    }
    setPackingLoading(true)
    setShowPacking(true)
    try {
      const res = await api.post(`/trips/${id}/packing-list`)
      setPackingList(res.data)
    } catch {
      alert('Failed to generate packing list. Try again.')
      setShowPacking(false)
    } finally {
      setPackingLoading(false)
    }
  }

  const toggleItem = (categoryName, item) => {
    const key = `${categoryName}-${item}`
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const copyShareLink = () => {
    const link = `${window.location.origin}/share/${trip.share_token}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleInterest = (interest) => {
    setEditInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    )
  }

  const handleRegenerate = async () => {
    if (editInterests.length === 0) {
      alert('Please select at least one interest')
      return
    }
    setRegenerating(true)
    try {
      const res = await api.put(`/trips/${id}/regenerate`, {
        destination: trip.destination,
        num_days: editNumDays,
        budget: editBudget,
        interests: editInterests.join(', '),
      })
      setTrip(res.data)
      setEditMode(false)
      setActiveDay(0)
      setPackingList(null)
      setShowPacking(false)
      setWeather(null)
    } catch (err) {
      alert('Failed to regenerate. Please try again.')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) return (
    <div style={styles.page}>
      <Navbar />
      <p style={styles.center}>Loading your itinerary...</p>
    </div>
  )

  if (!trip) return null

  const days = trip.itinerary?.days || []
  const hotels = trip.itinerary?.hotels || []
  const totalItems = packingList?.categories?.reduce((acc, cat) => acc + cat.items.length, 0) || 0
  const checkedCount = Object.values(checkedItems).filter(Boolean).length

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
          <div style={styles.headerInfo}>
            <h1 style={styles.title}>🌍 {trip.destination}</h1>
            <p style={styles.meta}>
              {trip.num_days} days · {trip.budget} budget · {trip.interests}
            </p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.editBtn} onClick={() => setEditMode(!editMode)}>
              {editMode ? '✕ Cancel' : '✏️ Edit Trip'}
            </button>
            <button style={styles.printBtn} onClick={() => window.print()}>
              🖨️ Print
            </button>
            <button style={styles.shareBtn} onClick={copyShareLink}>
              {copied ? '✅ Copied!' : '🔗 Share'}
            </button>
          </div>
        </div>

        {/* Edit Form */}
        {editMode && (
          <div style={styles.editForm}>
            <h2 style={styles.editTitle}>✏️ Edit Trip Settings</h2>
            <p style={styles.editSubtitle}>
              Editing itinerary for <strong>{trip.destination}</strong> — change days, budget or interests and regenerate
            </p>

            <div style={styles.editField}>
              <label style={styles.editLabel}>🗓️ Number of Days: <strong>{editNumDays}</strong></label>
              <input
                type="range" min="1" max="14" value={editNumDays}
                onChange={(e) => setEditNumDays(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#667eea' }}
              />
              <div style={styles.rangeLabels}>
                <span>1 day</span><span>14 days</span>
              </div>
            </div>

            <div style={styles.editField}>
              <label style={styles.editLabel}>💳 Budget</label>
              <div style={styles.budgetRow}>
                {['budget', 'moderate', 'luxury'].map((b) => (
                  <button key={b} type="button"
                    style={{ ...styles.budgetBtn, ...(editBudget === b ? styles.budgetBtnActive : {}) }}
                    onClick={() => setEditBudget(b)}
                  >
                    {b === 'budget' ? '💰 Budget' : b === 'moderate' ? '💳 Moderate' : '💎 Luxury'}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.editField}>
              <label style={styles.editLabel}>🎯 Interests</label>
              <div style={styles.interestsGrid}>
                {INTERESTS.map((interest) => (
                  <button key={interest} type="button"
                    style={{ ...styles.interestBtn, ...(editInterests.includes(interest) ? styles.interestBtnActive : {}) }}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {regenerating ? (
              <div style={styles.regeneratingBox}>
                <p style={styles.regeneratingIcon}>🌍</p>
                <h3>Regenerating your itinerary...</h3>
                <p style={{ color: '#666' }}>This takes about 10 seconds</p>
              </div>
            ) : (
              <button style={styles.regenerateBtn} onClick={handleRegenerate}>
                🤖 Regenerate Itinerary
              </button>
            )}
          </div>
        )}

        {/* Weather Forecast */}
        {!editMode && weather && weather.length > 0 && (
          <div style={styles.weatherBox}>
            <div style={styles.weatherTitle}>
              🌤️ 5-Day Weather Forecast for {trip.destination.split(',')[0]}
            </div>
            <div style={styles.weatherDays}>
              {weather.map((day, i) => {
                const date = new Date(day.dt * 1000)
                const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                return (
                  <div key={i} style={styles.weatherDay}>
                    <div style={styles.weatherDayName}>{dayName}</div>
                    <img
                      src={`https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`}
                      alt={day.weather[0].description}
                      style={{ width: '48px', height: '48px' }}
                    />
                    <div style={styles.weatherDayTemp}>{Math.round(day.main.temp)}°C</div>
                    <div style={styles.weatherDayDesc}>{day.weather[0].description}</div>
                    <div style={styles.weatherDayStats}>
                      <span>💧{day.main.humidity}%</span>
                      <span>🌬️{Math.round(day.wind.speed)}km/h</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Cost + Flight Search */}
        {!editMode && (
          <div style={styles.infoBar}>
            <div style={styles.infoBarLeft}>
              {trip.itinerary?.total_estimated_cost && (
                <span>💰 Total estimated cost: <strong>{trip.itinerary.total_estimated_cost}</strong></span>
              )}
            </div>
            <a
              href={`https://www.google.com/travel/flights/search?tfs=CBwQAhoeEgoyMDI2LTAxLTAxagcIARIDYWxsEgoyMDI2LTAxLTA4&q=flights+to+${encodeURIComponent(trip.destination.split(',')[0])}`}
              target="_blank"
              rel="noreferrer"
              style={styles.flightBtn}
            >
              ✈️ Search Flights
            </a>
          </div>
        )}

        {/* Tips */}
        {!editMode && trip.itinerary?.tips && (
          <div style={styles.tipsBox}>
            <h3 style={styles.tipsTitle}>💡 Travel Tips</h3>
            <ul style={styles.tipsList}>
              {trip.itinerary.tips.map((tip, i) => (
                <li key={i} style={styles.tip}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabs — Days + Packing List */}
        {!editMode && (
          <div style={styles.tabs}>
            {days.map((day, i) => (
              <button
                key={i}
                style={{
                  ...styles.tab,
                  ...(activeDay === i && !showPacking ? styles.tabActive : {})
                }}
                onClick={() => {
                  setActiveDay(i)
                  setShowPacking(false)
                }}
              >
                Day {day.day}
              </button>
            ))}
            <button
              style={{
                ...styles.tab,
                ...(showPacking ? styles.tabActive : {}),
                marginLeft: 'auto',
                background: showPacking ? '#f0f0ff' : '#fff8f0',
                border: showPacking ? '2px solid #667eea' : '2px solid #f6ad55',
                color: showPacking ? '#667eea' : '#b7791f',
              }}
              onClick={fetchPackingList}
            >
              {packingLoading ? '⏳' : '🎒'} Packing List
            </button>
          </div>
        )}

        {/* Places */}
        {!editMode && !showPacking && days[activeDay] && (
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
                        href={`https://www.google.com/maps/search/${encodeURIComponent(place.name + ' ' + trip.destination)}`}
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

        {/* Packing List Tab Content */}
        {!editMode && showPacking && (
          <div>
            {packingLoading ? (
              <div style={styles.regeneratingBox}>
                <p style={styles.regeneratingIcon}>🎒</p>
                <h3>Generating your packing list...</h3>
                <p style={{ color: '#666' }}>This takes about 5 seconds</p>
              </div>
            ) : packingList && (
              <div style={styles.packingBox}>
                <div style={styles.packingHeader}>
                  <h2 style={styles.packingTitle}>🎒 Packing List</h2>
                  <span style={styles.packingProgress}>
                    {checkedCount}/{totalItems} packed
                  </span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{
                    ...styles.progressFill,
                    width: totalItems > 0 ? `${(checkedCount / totalItems) * 100}%` : '0%'
                  }} />
                </div>
                <div style={styles.packingCategories}>
                  {packingList.categories.map((category, ci) => (
                    <div key={ci} style={styles.packingCategory}>
                      <h3 style={styles.categoryTitle}>
                        {category.emoji} {category.name}
                      </h3>
                      <div style={styles.itemsGrid}>
                        {category.items.map((item, ii) => {
                          const key = `${category.name}-${item}`
                          const checked = checkedItems[key] || false
                          return (
                            <div key={ii} style={styles.packingItem}
                              onClick={() => toggleItem(category.name, item)}
                            >
                              <div style={{
                                ...styles.checkbox,
                                ...(checked ? styles.checkboxChecked : {})
                              }}>
                                {checked && '✓'}
                              </div>
                              <span style={{
                                ...styles.itemText,
                                ...(checked ? styles.itemTextChecked : {})
                              }}>
                                {item}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hotels */}
        {!editMode && !showPacking && hotels.length > 0 && (
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

      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f7f8fc' },
  container: { maxWidth: '800px', margin: '0 auto', padding: '32px 24px' },
  center: { textAlign: 'center', marginTop: '60px', color: '#666' },
  header: {
    display: 'flex', alignItems: 'center',
    gap: '16px', marginBottom: '24px', flexWrap: 'wrap',
  },
  backBtn: {
    padding: '8px 16px', background: 'transparent',
    border: '1px solid #ddd', borderRadius: '8px',
    cursor: 'pointer', color: '#666',
  },
  headerInfo: { flex: 1 },
  title: { margin: 0, fontSize: '26px', fontWeight: 'bold' },
  meta: { margin: '4px 0 0', color: '#666' },
  headerActions: { display: 'flex', gap: '8px' },
  editBtn: {
    padding: '8px 20px', background: 'white',
    color: '#667eea', border: '2px solid #667eea',
    borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
  },
  shareBtn: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
  },
  weatherBox: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '16px', padding: '20px 24px',
    marginBottom: '16px', color: 'white',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  weatherTitle: {
    fontSize: '15px', fontWeight: 'bold',
    marginBottom: '16px', opacity: 0.95,
  },
  weatherNote: { fontSize: '12px', opacity: 0.7, fontWeight: 'normal' },
  weatherDays: {
    display: 'flex', gap: '8px',
    overflowX: 'auto', paddingBottom: '4px',
  },
  weatherDay: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '12px', padding: '12px 16px',
    minWidth: '110px', gap: '2px',
  },
  weatherDayName: {
    fontSize: '12px', fontWeight: 'bold',
    opacity: 0.9, textAlign: 'center',
  },
  weatherDayTemp: { fontSize: '22px', fontWeight: 'bold', lineHeight: 1 },
  weatherDayDesc: {
    fontSize: '11px', textTransform: 'capitalize',
    opacity: 0.85, textAlign: 'center',
  },
  weatherDayStats: {
    display: 'flex', gap: '8px',
    fontSize: '11px', opacity: 0.8, marginTop: '4px',
  },
  editForm: {
    background: 'white', borderRadius: '16px',
    padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    marginBottom: '24px',
  },
  editTitle: { margin: '0 0 6px', fontSize: '20px', fontWeight: 'bold' },
  editSubtitle: { color: '#666', fontSize: '14px', marginBottom: '24px' },
  editField: { marginBottom: '20px' },
  editLabel: { display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' },
  rangeLabels: { display: 'flex', justifyContent: 'space-between', color: '#999', fontSize: '12px', marginTop: '4px' },
  budgetRow: { display: 'flex', gap: '12px' },
  budgetBtn: {
    flex: 1, padding: '10px', borderRadius: '8px',
    border: '2px solid #ddd', background: 'white',
    cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#666',
  },
  budgetBtnActive: { border: '2px solid #667eea', color: '#667eea', background: '#f0f0ff' },
  interestsGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  interestBtn: {
    padding: '8px 14px', borderRadius: '20px',
    border: '2px solid #ddd', background: 'white',
    cursor: 'pointer', fontSize: '13px', color: '#666',
  },
  interestBtnActive: { border: '2px solid #667eea', color: '#667eea', background: '#f0f0ff' },
  regenerateBtn: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', marginTop: '8px',
  },
  regeneratingBox: { textAlign: 'center', padding: '40px 24px', color: '#666' },
  regeneratingIcon: { fontSize: '48px', marginBottom: '12px' },
  infoBar: {
    background: 'white', padding: '16px 20px',
    borderRadius: '12px', marginBottom: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: '12px',
  },
  infoBarLeft: { flex: 1, color: '#333' },
  flightBtn: {
    padding: '8px 18px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', borderRadius: '8px',
    textDecoration: 'none', fontWeight: 'bold',
    fontSize: '14px', whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
  },
  tipsBox: {
    background: '#fffbea', border: '1px solid #fde68a',
    borderRadius: '12px', padding: '16px 20px', marginBottom: '24px',
  },
  tipsTitle: { margin: '0 0 10px', fontSize: '16px' },
  tipsList: { margin: 0, paddingLeft: '20px' },
  tip: { color: '#555', marginBottom: '6px', fontSize: '14px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: {
    padding: '10px 20px', borderRadius: '8px',
    border: '2px solid #ddd', background: 'white',
    cursor: 'pointer', fontWeight: 'bold', color: '#666',
  },
  tabActive: { border: '2px solid #667eea', color: '#667eea', background: '#f0f0ff' },
  dayTitle: { fontSize: '20px', marginBottom: '16px', color: '#333' },
  places: { display: 'flex', flexDirection: 'column', gap: '16px' },
  placeCard: {
    display: 'flex', gap: '16px', background: 'white',
    borderRadius: '12px', padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)', alignItems: 'flex-start',
  },
  placeTime: { minWidth: '80px', color: '#667eea', fontWeight: 'bold', fontSize: '14px', paddingTop: '2px' },
  placeInfo: { flex: 1 },
  placeName: { margin: '0 0 6px', fontSize: '16px', fontWeight: 'bold' },
  placeDesc: { margin: '0 0 10px', color: '#666', fontSize: '14px', lineHeight: '1.5' },
  placeMeta: { display: 'flex', gap: '16px', alignItems: 'center' },
  placeCost: { color: '#555', fontSize: '13px' },
  mapsLink: { color: '#667eea', fontSize: '13px', textDecoration: 'none' },
  packingBox: {
    background: 'white', borderRadius: '16px',
    padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  packingHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '12px',
  },
  packingTitle: { margin: 0, fontSize: '20px', fontWeight: 'bold' },
  packingProgress: {
    fontSize: '13px', color: '#667eea', fontWeight: 'bold',
    background: '#f0f0ff', padding: '4px 12px', borderRadius: '20px',
  },
  progressBar: {
    height: '6px', background: '#f0f0f0',
    borderRadius: '3px', marginBottom: '24px', overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '3px', transition: 'width 0.3s ease',
  },
  packingCategories: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  packingCategory: { background: '#f9f9f9', borderRadius: '12px', padding: '16px' },
  categoryTitle: { fontSize: '14px', fontWeight: 'bold', color: '#333', margin: '0 0 12px' },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '8px',
    marginTop: '4px',
  },
  packingItem: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  checkbox: {
    width: '20px', height: '20px', borderRadius: '6px',
    border: '2px solid #ddd', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', flexShrink: 0, color: 'white',
    transition: 'all 0.15s',
  },
  checkboxChecked: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: '2px solid #667eea',
  },
  itemText: { fontSize: '13px', color: '#444', lineHeight: 1.4 },
  itemTextChecked: { textDecoration: 'line-through', color: '#aaa' },
  hotelsSection: {
    marginTop: '40px', background: 'white',
    borderRadius: '16px', padding: '24px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
  },
  hotelsTitle: { fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px' },
  hotelsSubtitle: { color: '#888', fontSize: '14px', margin: '0 0 20px', textTransform: 'capitalize' },
  hotelList: { display: 'flex', flexDirection: 'column' },
  hotelItem: {
    display: 'flex', alignItems: 'flex-start',
    padding: '16px 0', borderBottom: '1px solid #f0f0f0', gap: '14px',
  },
  hotelNumber: {
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '13px',
    fontWeight: 'bold', flexShrink: 0, marginTop: '2px',
  },
  hotelItemLeft: { flex: 1 },
  hotelName: { fontWeight: 'bold', fontSize: '15px', marginBottom: '2px' },
  hotelLocation: { color: '#888', fontSize: '12px', marginBottom: '4px' },
  hotelDesc: { color: '#666', fontSize: '13px', lineHeight: '1.5' },
  hotelItemRight: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'flex-end', gap: '4px', flexShrink: 0,
  },
  hotelPrice: { fontWeight: 'bold', fontSize: '15px', color: '#333' },
  perNight: { fontSize: '11px', color: '#888', fontWeight: 'normal' },
  hotelRating: { fontSize: '13px', color: '#f6ad55' },
  
  printBtn: {
  padding: '8px 20px',
  background: 'white',
  color: '#555',
  border: '1px solid #ddd',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
},
}