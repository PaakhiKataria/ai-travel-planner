import axios from 'axios'

const BASE_URL = 'https://ai-travel-planner-4wuo.onrender.com'

const api = axios.create({
  baseURL: BASE_URL,
})

// Wake up the server when the app loads
fetch(`${BASE_URL}/`).catch(() => {})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api