import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { receptionApi } from "../../utils/api";

export default function Reception_Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [theme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('reception.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })

  useEffect(()=>{
    const html = document.documentElement
    try { html.classList.toggle('dark', theme === 'dark') } catch {}
    return () => { try { html.classList.remove('dark') } catch {} }
  }, [theme])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Enter username and password");
      return;
    }

    try {
      const res: any = await receptionApi.login(username.trim(), password)
      const user = res?.user
      if (!user) {
        setError("Invalid credentials");
        return;
      }
      try {
        localStorage.setItem('reception.user', JSON.stringify(user))
        localStorage.setItem('reception.session', JSON.stringify({ username: user.username, role: user.role }))
      } catch {}
      navigate("/reception");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    }
  };

  return (
    <div className={theme === 'dark' ? 'reception-scope dark' : 'reception-scope'}>
      <div className="min-h-screen bg-gradient-to-br from-[#0a1e3c] via-[#0b2b55] to-slate-900 flex items-center justify-center p-4 overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-48 -right-48 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute -bottom-56 -left-56 h-[28rem] w-[28rem] rounded-full bg-blue-500/20 blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
          <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/15 blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
          <div className="absolute top-20 left-20 h-32 w-32 bg-gradient-to-br from-sky-400/10 to-blue-600/10 backdrop-blur-sm rounded-3xl" style={{ transform: 'rotateX(45deg) rotateZ(45deg)', animation: 'float 6s ease-in-out infinite' }} />
          <div className="absolute bottom-32 right-32 h-24 w-24 bg-gradient-to-br from-blue-400/10 to-sky-600/10 backdrop-blur-sm rounded-2xl" style={{ transform: 'rotateX(-30deg) rotateZ(30deg)', animation: 'float 8s ease-in-out infinite', animationDelay: '1s' }} />
          <div className="absolute top-1/3 right-1/4 h-20 w-20 bg-gradient-to-br from-indigo-400/10 to-sky-600/10 backdrop-blur-sm rounded-xl" style={{ transform: 'rotateX(60deg) rotateZ(-45deg)', animation: 'float 7s ease-in-out infinite', animationDelay: '2s' }} />
        </div>

        <style>{`@keyframes float{0%,100%{transform:translateY(0px) rotateX(45deg) rotateZ(45deg)}50%{transform:translateY(-20px) rotateX(55deg) rotateZ(50deg)}}@keyframes rotate3d{0%{transform:perspective(1000px) rotateY(0deg) rotateX(10deg)}100%{transform:perspective(1000px) rotateY(360deg) rotateX(10deg)}}.card-3d{transform-style:preserve-3d;transition:transform .6s cubic-bezier(.23,1,.32,1)}.card-3d:hover{transform:perspective(1000px) rotateY(5deg) rotateX(-5deg) scale(1.02)}`}</style>

        <div className="card-3d relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
          <div className="relative">
            <div className="relative p-8 pb-6 text-center">
              <div className="mx-auto mb-6 h-24 w-24 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-400/20 to-blue-600/20 p-1 backdrop-blur-sm" style={{ animation: 'rotate3d 20s linear infinite' }}>
                <div className="h-full w-full overflow-hidden rounded-[1.3rem] bg-white/10 ring-1 ring-white/20">
                  <img src={`${(import.meta as any).env?.BASE_URL || '/'}hospital_icon.jpeg`} alt="Healthspire" className="h-full w-full object-cover" />
                </div>
              </div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-sky-200 via-blue-200 to-indigo-200 bg-clip-text text-transparent mb-2">HealthSpire</h1>
              <p className="text-sm text-white/60 font-medium">Reception Portal</p>
            </div>

            <div className="p-8 pt-4">
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-white/90">Username</label>
                  <div className="relative group">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sky-300/60 transition-colors group-focus-within:text-sky-300">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2-8 4.5V20h16v-1.5c0-2.5-3.58-4.5-8-4.5Z"/></svg>
                    </div>
                    <input type="text" value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full rounded-2xl border-2 border-white/10 bg-white/5 backdrop-blur-sm px-12 py-3.5 text-white placeholder-white/40 outline-none transition-all focus:border-sky-400/50 focus:bg-white/10 focus:ring-4 focus:ring-sky-400/20" placeholder="Enter username" autoComplete="username" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-white/90">Password</label>
                  <div className="relative group">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/60 transition-colors group-focus-within:text-blue-300">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4Z"/></svg>
                    </div>
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full rounded-2xl border-2 border-white/10 bg-white/5 backdrop-blur-sm px-12 py-3.5 pr-14 text-white placeholder-white/40 outline-none transition-all focus:border-blue-400/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-400/20" placeholder="Enter password" autoComplete="current-password" />
                    <button type="button" onClick={()=>setShowPassword(s=>!s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M3.53 2.47 2.47 3.53 5.3 6.36A11.6 11.6 0 0 0 1.4 12c2.1 4.4 6.33 7.5 10.6 7.5 2.07 0 4.1-.66 5.9-1.84l2.6 2.6 1.06-1.06L3.53 2.47ZM12 7.5c.63 0 1.22.18 1.72.48l-5.7 5.7A4.5 4.5 0 0 1 12 7.5Zm0-3c-4.27 0-8.5 3.1-10.6 7.5a12.8 12.8 0 0 0 3 4.05l2.14-2.14A6 6 0 0 1 18 12c0-.52-.06-1.02-.18-1.5H20c-2.1-4.4-6.33-7.5-10.6-7.5Z"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 4.5c-4.27 0-8.5 3.1-10.6 7.5 2.1 4.4 6.33 7.5 10.6 7.5s8.5-3.1 10.6-7.5C20.5 7.6 16.27 4.5 12 4.5Zm0 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm0-2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-500/10 backdrop-blur-sm px-4 py-3 text-sm text-rose-200 font-medium">{error}</div>
                )}

                <button type="submit" className="group relative mt-2 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 px-4 py-4 font-bold text-white shadow-2xl shadow-sky-500/30 transition-all hover:shadow-sky-500/50 hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-sky-400/50">
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-500 opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="relative flex items-center justify-center gap-2">Login<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 transition-transform group-hover:translate-x-1"><path d="M13.3 17.3 18.6 12l-5.3-5.3-1.4 1.4 3.2 3.2H4v2h11.1l-3.2 3.2 1.4 1.5Z"/></svg></span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="mt-3 w-full rounded-2xl border-2 border-white/20 bg-white/5 px-4 py-3 font-semibold text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-sky-400/30 transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M10 19 3 12l7-7 1.4 1.4L6.8 11H21v2H6.8l4.6 4.6L10 19Z"/></svg>
                  <span>Back to Portal</span>
                </button>
              </form>
            </div>

            <div className="border-t border-white/10 px-8 py-4 text-center">
              <p className="text-xs text-white/40">© 2026@healthspire.org</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
