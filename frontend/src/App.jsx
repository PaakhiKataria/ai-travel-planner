import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateTrip from './pages/CreateTrip'
import TripDetail from './pages/TripDetail'
import ShareTrip from './pages/ShareTrip'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        <Route path="/create" element={
          <PrivateRoute><CreateTrip /></PrivateRoute>
        } />
        <Route path="/trips/:id" element={
          <PrivateRoute><TripDetail /></PrivateRoute>
        } />
        <Route path="/share/:share_token" element={<ShareTrip />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App