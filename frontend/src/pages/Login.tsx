import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Ship, Globe } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../services/api'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [language, setLanguage] = useState('en')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await authApi.login(email, password)
      const { user, token } = response.data.data
      login(user, token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const translations = {
    en: {
      title: 'Client Login',
      subtitle: 'Messenger Logistics',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot Password?',
      signIn: 'SIGN IN',
      noAccount: "Don't have an account?",
      register: 'Register',
    },
    rw: {
      title: 'Kwinjira',
      subtitle: 'Messenger Logistics',
      email: 'Imeyili',
      password: 'Ijambo ryibanga',
      forgotPassword: 'Wibagiwe ijambo ryibanga?',
      signIn: 'INJIRA',
      noAccount: 'Nta konti ufite?',
      register: 'Iyandikishe',
    },
    sw: {
      title: 'Kuingia',
      subtitle: 'Messenger Logistics',
      email: 'Barua pepe',
      password: 'Nenosiri',
      forgotPassword: 'Umesahau nenosiri?',
      signIn: 'INGIA',
      noAccount: 'Huna akaunti?',
      register: 'Jisajili',
    },
  }

  const t = translations[language as keyof typeof translations]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary-500 p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center mb-4">
              <Ship className="w-10 h-10 text-primary-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t.title}</h1>
            <p className="text-primary-100">{t.subtitle}</p>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.password}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <button type="button" className="text-sm text-primary-600 hover:text-primary-700">
                  {t.forgotPassword}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-500 text-white py-3 rounded-lg font-medium hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoading ? 'Signing in...' : t.signIn}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <span className="text-gray-600">{t.noAccount} </span>
              <button className="text-accent-500 hover:text-accent-600 font-medium">
                {t.register}
              </button>
            </div>

            {/* Language Selector */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-sm text-gray-600 bg-transparent focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="rw">Kinyarwanda</option>
                  <option value="sw">Kiswahili</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2025 Messenger Logistics. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default Login
