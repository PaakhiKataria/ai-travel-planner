import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Navbar from '../components/Navbar'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    fetchProfile()
    fetchTrips()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data)
      setName(res.data.name)
    } catch {
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchTrips = async () => {
    try {
      const res = await api.get('/trips/')
      setTrips(res.data)
    } catch {
      setTrips([])
    }
  }

  const handleSaveName = async () => {
    setSavingName(true)
    try {
      const res = await api.put('/auth/me', { name })
      setUser(res.data)
      setEditingName(false)
    } catch {
      alert('Failed to update name')
    } finally {
      setSavingName(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMsg('')
    setPasswordError('')
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    setSavingPassword(true)
    try {
      await api.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setPasswordMsg('✅ Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  const budgetCounts = trips.reduce((acc, trip) => {
    acc[trip.budget] = (acc[trip.budget] || 0) + 1
    return acc
  }, {})

  if (loading) return (
    <div style={styles.page}>
      <Navbar />
      <p style={styles.center}>Loading profile...</p>
    </div>
  )

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        {/* Back button */}
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
        {/* Profile Header */}
        <div style={styles.profileCard}>
          <div style={styles.avatar}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={styles.profileInfo}>
            {editingName ? (
              <div style={styles.editNameRow}>
                <input
                  style={styles.nameInput}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                <button style={styles.saveBtn} onClick={handleSaveName} disabled={savingName}>
                  {savingName ? 'Saving...' : 'Save'}
                </button>
                <button style={styles.cancelBtn} onClick={() => {
                  setEditingName(false)
                  setName(user.name)
                }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={styles.nameRow}>
                <h1 style={styles.userName}>{user?.name}</h1>
                <button style={styles.editNameBtn} onClick={() => setEditingName(true)}>
                  ✏️ Edit
                </button>
              </div>
            )}
            <p style={styles.userEmail}>📧 {user?.email}</p>
            <p style={styles.joinDate}>
              📅 Member since {new Date(user?.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{trips.length}</div>
            <div style={styles.statLabel}>Total Trips</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{budgetCounts['budget'] || 0}</div>
            <div style={styles.statLabel}>💰 Budget Trips</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{budgetCounts['moderate'] || 0}</div>
            <div style={styles.statLabel}>💳 Moderate Trips</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{budgetCounts['luxury'] || 0}</div>
            <div style={styles.statLabel}>💎 Luxury Trips</div>
          </div>
        </div>

        {/* Recent Trips */}
        {trips.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🗺️ Recent Trips</h2>
            <div style={styles.recentTrips}>
              {trips.slice(0, 3).map((trip, i) => (
                <div
                  key={i}
                  style={styles.recentTripCard}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                >
                  <div style={styles.recentTripDest}>{trip.destination}</div>
                  <div style={styles.recentTripMeta}>
                    {trip.num_days} days · {trip.budget}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Change Password */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🔒 Change Password</h2>
          <div style={styles.passwordCard}>
            {passwordMsg && <p style={styles.successMsg}>{passwordMsg}</p>}
            {passwordError && <p style={styles.errorMsg}>{passwordError}</p>}
            <form onSubmit={handleChangePassword}>
              <div style={styles.formField}>
                <label style={styles.fieldLabel}>Current Password</label>
                <input
                  style={styles.fieldInput}
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.fieldLabel}>New Password</label>
                <input
                  style={styles.fieldInput}
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.fieldLabel}>Confirm New Password</label>
                <input
                  style={styles.fieldInput}
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button style={styles.changePassBtn} type="submit" disabled={savingPassword}>
                {savingPassword ? 'Changing...' : '🔒 Change Password'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f7f8fc' },
  container: { maxWidth: '700px', margin: '0 auto', padding: '32px 24px' },
  center: { textAlign: 'center', marginTop: '60px', color: '#666' },
  profileCard: {
    background: 'white', borderRadius: '16px',
    padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    display: 'flex', gap: '24px', alignItems: 'center',
    marginBottom: '24px', flexWrap: 'wrap',
  },
  avatar: {
    width: '80px', height: '80px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '32px', fontWeight: 'bold',
    flexShrink: 0,
  },
  profileInfo: { flex: 1 },
  nameRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
  userName: { margin: 0, fontSize: '24px', fontWeight: 'bold' },
  editNameBtn: {
    padding: '4px 12px', background: 'transparent',
    border: '1px solid #ddd', borderRadius: '6px',
    cursor: 'pointer', fontSize: '13px', color: '#666',
  },
  editNameRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' },
  nameInput: {
    padding: '8px 12px', borderRadius: '8px',
    border: '1px solid #667eea', fontSize: '16px',
    outline: 'none', flex: 1,
  },
  saveBtn: {
    padding: '8px 16px', background: '#667eea',
    color: 'white', border: 'none', borderRadius: '8px',
    cursor: 'pointer', fontWeight: 'bold',
  },
  cancelBtn: {
    padding: '8px 16px', background: 'transparent',
    color: '#666', border: '1px solid #ddd', borderRadius: '8px',
    cursor: 'pointer',
  },
  userEmail: { margin: '0 0 6px', color: '#666', fontSize: '15px' },
  joinDate: { margin: 0, color: '#999', fontSize: '14px' },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px', marginBottom: '24px',
  },
  statCard: {
    background: 'white', borderRadius: '12px',
    padding: '20px 16px', textAlign: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
  },
  statNumber: {
    fontSize: '28px', fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  statLabel: { fontSize: '12px', color: '#888', marginTop: '4px' },
  section: { marginBottom: '24px' },
  sectionTitle: { fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#333' },
  recentTrips: { display: 'flex', flexDirection: 'column', gap: '10px' },
  recentTripCard: {
    background: 'white', borderRadius: '10px',
    padding: '14px 18px', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'transform 0.1s',
  },
  recentTripDest: { fontWeight: 'bold', fontSize: '15px', color: '#333' },
  recentTripMeta: { fontSize: '13px', color: '#888', textTransform: 'capitalize' },
  passwordCard: {
    background: 'white', borderRadius: '16px',
    padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
  },
  formField: { marginBottom: '16px' },
  fieldLabel: { display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#333', fontSize: '14px' },
  fieldInput: {
    width: '100%', padding: '10px 12px',
    borderRadius: '8px', border: '1px solid #ddd',
    fontSize: '15px', boxSizing: 'border-box', outline: 'none',
  },
  changePassBtn: {
    width: '100%', padding: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '15px', cursor: 'pointer', fontWeight: 'bold',
    marginTop: '8px',
  },
  successMsg: { color: '#38a169', marginBottom: '12px', fontWeight: 'bold' },
  errorMsg: { color: '#e53e3e', marginBottom: '12px' },
  backBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#666',
    marginBottom: '20px',
    display: 'inline-block',
  },
}