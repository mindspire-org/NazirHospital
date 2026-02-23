import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Finance() {
  const navigate = useNavigate()
  useEffect(() => {
    try {
      const sess = localStorage.getItem('finance.session')
      if (!sess) navigate('/finance/login', { replace: true })
      else navigate('/finance/pharmacy-reports', { replace: true })
    } catch {
      navigate('/finance/login', { replace: true })
    }
  }, [navigate])
  return <div className="px-6 py-10"></div>
}
