import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.logo} onClick={() => navigate('/dashboard')}>
        ✈️ AI Travel Planner
      </div>
      <div style={styles.actions}>
        <button style={styles.createBtn} onClick={() => navigate('/create')}>
          + New Trip
        </button>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
        <button style={styles.profileBtn} onClick={() => navigate('/profile')}>
          👤 Profile
        </button>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    background: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  createBtn: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  logoutBtn: {
    padding: '8px 20px',
    background: 'transparent',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  profileBtn: {
    padding: '8px 16px',
    background: 'transparent',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
  },
}