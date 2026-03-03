import axios from 'axios'
import { supabase } from './supabaseClient'

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Attach Supabase auth token to every request
api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`
    }
    return config
})

// Response error handler — do NOT hard redirect on 401
// Let the React auth state handle navigation instead
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Try refreshing the session once before giving up
            const { data: { session } } = await supabase.auth.refreshSession()
            if (session && error.config && !error.config._retry) {
                error.config._retry = true
                error.config.headers.Authorization = `Bearer ${session.access_token}`
                return api(error.config) // Retry the request with the new token
            }
            // If refresh also fails, sign out (React will redirect via state)
            await supabase.auth.signOut()
        }
        return Promise.reject(error)
    }
)

export default api
