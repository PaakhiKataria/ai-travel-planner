import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Navbar from '../components/Navbar'

const INTERESTS = ['Food', 'Culture', 'History', 'Nature', 'Adventure', 'Shopping', 'Art', 'Nightlife']

export default function CreateTrip() {
  const [destination, setDestination] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedFromDropdown, setSelectedFromDropdown] = useState(false)
  const [numDays, setNumDays] = useState(3)
  const [budget, setBudget] = useState('moderate')
  const [interests, setInterests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (selectedFromDropdown) {
      setSelectedFromDropdown(false)
      return
    }

    const fetchSuggestions = async () => {
      if (destination.length < 2) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }
      setSearchLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=10&addressdetails=1&featuretype=city`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        if (data && data.length > 0) {
          // Remove duplicates by city+state+country combination
          const seen = new Set()
          const unique = data.filter((city) => {
            const cityName = city.address?.city || city.address?.town || city.address?.village || city.display_name.split(',')[0]
            const country = city.address?.country || ''
            const state = city.address?.state || ''
            const key = `${cityName}-${state}-${country}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          setSuggestions(unique)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
          setShowSuggestions(false)
        }
      } catch {
        setSuggestions([])
      } finally {
        setSearchLoading(false)
      }
    }
    const timer = setTimeout(fetchSuggestions, 400)
    return () => clearTimeout(timer)
  }, [destination])

  const handleSelectCity = (city) => {
    const cityName = city.address?.city || city.address?.town || city.address?.village || city.display_name.split(',')[0]
    const country = city.address?.country || ''
    const state = city.address?.state || ''
    const selected = state ? `${cityName}, ${state}, ${country}` : `${cityName}, ${country}`
    setSelectedFromDropdown(true)
    setDestination(selected)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const toggleInterest = (interest) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (interests.length === 0) {
      setError('Please select at least one interest')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/trips/generate', {
        destination,
        num_days: numDays,
        budget,
        interests: interests.join(', '),
      })
      navigate(`/trips/${res.data.id}`)
    } catch (err) {
      setError('Failed to generate trip. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <h1 style={styles.title}>✈️ Plan a New Trip</h1>
        <p style={styles.subtitle}>Tell us where you want to go and we'll create a personalized itinerary</p>

        {error && <p style={styles.error}>{error}</p>}

        {loading ? (
          <div style={styles.loadingBox}>
            <p style={styles.loadingIcon}>🌍</p>
            <h2>Planning your perfect trip...</h2>
            <p style={{ color: '#666' }}>Our AI is crafting your personalized itinerary. This takes about 10 seconds.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>

            {/* Destination */}
            <div style={styles.field}>
              <label style={styles.label}>📍 Destination</label>
              <div style={styles.searchWrapper} ref={searchRef}>
                <div style={styles.searchInputWrapper}>
                  <span style={styles.searchIcon}>🔍</span>
                  <input
                    style={styles.searchInput}
                    type="text"
                    placeholder="Search for a city... e.g. Windsor"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value)
                      setSelectedFromDropdown(false)
                    }}
                    required
                    autoComplete="off"
                  />
                  {searchLoading && <span style={styles.searchSpinner}>⏳</span>}
                </div>

                {/* Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={styles.dropdown}>
                    <div style={styles.dropdownHeader}>
                      🌍 Select your destination
                    </div>
                    {suggestions.map((city, i) => {
                      const cityName = city.address?.city || city.address?.town || city.address?.village || city.display_name.split(',')[0]
                      const state = city.address?.state || ''
                      const country = city.address?.country || ''
                      const isLast = i === suggestions.length - 1
                      return (
                        <div
                          key={i}
                          style={{
                            ...styles.suggestion,
                            borderBottom: isLast ? 'none' : '1px solid #f0f4ff',
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleSelectCity(city)
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f0f0ff'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white'
                          }}
                        >
                          <div style={styles.suggestionIconWrapper}>
                            📍
                          </div>
                          <div style={styles.suggestionText}>
                            <div style={styles.suggestionCity}>{cityName}</div>
                            <div style={styles.suggestionCountry}>
                              {[state, country].filter(Boolean).join(', ')}
                            </div>
                          </div>
                          <div style={styles.suggestionArrow}>→</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Number of days */}
            <div style={styles.field}>
              <label style={styles.label}>🗓️ Number of Days: <strong>{numDays}</strong></label>
              <input
                type="range"
                min="1"
                max="14"
                value={numDays}
                onChange={(e) => setNumDays(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#667eea' }}
              />
              <div style={styles.rangeLabels}>
                <span>1 day</span>
                <span>14 days</span>
              </div>
            </div>

            {/* Budget */}
            <div style={styles.field}>
              <label style={styles.label}>💳 Budget</label>
              <div style={styles.budgetRow}>
                {['budget', 'moderate', 'luxury'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    style={{
                      ...styles.budgetBtn,
                      ...(budget === b ? styles.budgetBtnActive : {})
                    }}
                    onClick={() => setBudget(b)}
                  >
                    {b === 'budget' ? '💰 Budget' : b === 'moderate' ? '💳 Moderate' : '💎 Luxury'}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div style={styles.field}>
              <label style={styles.label}>🎯 Interests (select all that apply)</label>
              <div style={styles.interestsGrid}>
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    style={{
                      ...styles.interestBtn,
                      ...(interests.includes(interest) ? styles.interestBtnActive : {})
                    }}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <button style={styles.submitBtn} type="submit">
              🤖 Generate My Itinerary
            </button>

          </form>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f7f8fc' },
  container: { maxWidth: '680px', margin: '0 auto', padding: '32px 24px' },
  title: { fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' },
  subtitle: { color: '#666', marginBottom: '32px' },
  error: { color: 'red', marginBottom: '16px' },
  form: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  field: { marginBottom: '24px' },
  label: {
    display: 'block',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#333',
    fontSize: '15px',
  },
  searchWrapper: { position: 'relative' },
  searchInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '6px 14px',
    background: 'white',
    gap: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  searchIcon: { fontSize: '18px', flexShrink: 0 },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '15px',
    padding: '8px 0',
    background: 'transparent',
    color: '#333',
  },
  searchSpinner: { fontSize: '14px' },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    boxShadow: '0 16px 48px rgba(102, 126, 234, 0.15)',
    zIndex: 100,
    marginTop: '8px',
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: '10px 16px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#667eea',
    background: '#f8f7ff',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderBottom: '1px solid #ede9ff',
  },
  suggestion: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    cursor: 'pointer',
    background: 'white',
    transition: 'background 0.15s',
  },
  suggestionIconWrapper: {
    width: '38px',
    height: '38px',
    background: '#f0f0ff',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  suggestionText: { flex: 1 },
  suggestionCity: {
    fontWeight: '600',
    fontSize: '15px',
    color: '#1a1a2e',
    marginBottom: '2px',
  },
  suggestionCountry: {
    fontSize: '12px',
    color: '#999',
  },
  suggestionArrow: {
    color: '#ccc',
    fontSize: '16px',
    flexShrink: 0,
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#999',
    fontSize: '13px',
    marginTop: '6px',
  },
  budgetRow: { display: 'flex', gap: '12px' },
  budgetBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
    transition: 'all 0.15s',
  },
  budgetBtnActive: {
    border: '2px solid #667eea',
    color: '#667eea',
    background: '#f0f0ff',
  },
  interestsGrid: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  interestBtn: {
    padding: '8px 18px',
    borderRadius: '20px',
    border: '2px solid #e2e8f0',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#666',
    transition: 'all 0.15s',
  },
  interestBtnActive: {
    border: '2px solid #667eea',
    color: '#667eea',
    background: '#f0f0ff',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: '8px',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  loadingBox: {
    textAlign: 'center',
    background: 'white',
    borderRadius: '16px',
    padding: '60px 32px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  loadingIcon: { fontSize: '64px', marginBottom: '16px' },
}