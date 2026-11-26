import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import {
  Home, CreditCard, Users, Store, UserRound, Shield, ArrowLeftRight,
  Plus, Copy, Menu, X, Download, Wallet, Sparkles
} from 'lucide-react'
import './style.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

function App() {
  const [tab, setTab] = useState('home')
  const [menu, setMenu] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [cards, setCards] = useState(1)
  const [listings, setListings] = useState([
    { id: 1, seller: 'VortexPilot', qty: 2, price: 10 },
    { id: 2, seller: 'NeonFox', qty: 5, price: 11 },
    { id: 3, seller: 'CryptoWave', qty: 1, price: 12 }
  ])
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('10')
  const [referrals, setReferrals] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)

  async function checkAdmin(currentUser) {
    if (!supabase || !currentUser) {
      setIsAdmin(false)
      setAdminLoading(false)
      return
    }
    setAdminLoading(true)
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .maybeSingle()
    setIsAdmin(!error && data?.role === 'admin')
    setAdminLoading(false)
  }

  useEffect(() => {
    checkAdmin(user)
  }, [user])

  useEffect(() => {
    const handler = e => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Для GitHub Pages адрес должен учитывать базовый путь /vortex-cards/.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
        .catch(error => console.error('Ошибка регистрации Service Worker:', error))
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setUser(data.session?.user || null)
      }).catch(error => console.error('Ошибка получения сессии:', error))
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const referralLink = useMemo(
    () => `${location.origin}${import.meta.env.BASE_URL}?ref=${user?.id || 'YOUR_CODE'}`,
    [user]
  )

  async function signIn(e) {
    e.preventDefault()
    if (!supabase) {
      setNotice('Supabase не подключён. Проверь настройки публикации сайта.')
      return
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setNotice(error.message)
    else {
      setUser(data.user)
      setNotice('Вход выполнен')
    }
  }

  async function signUp() {
    if (!supabase) {
      setNotice('Supabase не подключён. Проверь настройки публикации сайта.')
      return
    }
    if (!email || password.length < 6) {
      setNotice('Укажи email и пароль не короче 6 символов.')
      return
    }
    const ref = new URLSearchParams(location.search).get('ref')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { referral_code: ref } }
    })
    if (error) setNotice(error.message)
    else setNotice('Проверь почту для подтверждения регистрации.')
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setNotice('Вы вышли из аккаунта')
  }

  function addListing(e) {
    e.preventDefault()
    const q = Math.max(1, Number(qty))
    const p = Math.max(1, Number(price))
    if (q > cards) {
      setNotice('Недостаточно карточек для объявления')
      return
    }
    setCards(v => v - q)
    setListings(v => [{
      id: Date.now(),
      seller: user?.email?.split('@')[0] || 'You',
      qty: q,
      price: p
    }, ...v])
    setNotice('Демо-объявление добавлено. Реальная операция пока не подключена.')
  }

  function buy(item) {
    setNotice(`Демо: заявка на ${item.qty} карточки по ${item.price} ₴ создана. Реальный платёж пока не подключён.`)
  }

  const nav = [
    ['home', 'Обзор', Home],
    ['cards', 'Карточки', CreditCard],
    ['market', 'Маркетплейс', Store],
    ['referrals', 'Рефералы', Users],
    ['profile', 'Профиль', UserRound]
  ]
  const title = nav.find(x => x[0] === tab)?.[1] || 'Обзор'

  return <div className="app-shell">
    <header className="topbar">
      <button className="icon-btn mobile-only" onClick={() => setMenu(!menu)}>
        {menu ? <X /> : <Menu />}
      </button>
      <div className="brand-mark">
        <span className="brand-gem">V</span>
        <span>VORTEX <b>CARDS</b></span>
      </div>
      <div className="top-actions">
        <span className="status"><i /> {supabase ? 'ONLINE' : 'DEMO MODE'}</span>
        {installPrompt && <button className="install-btn" onClick={async () => {
          await installPrompt.prompt()
          setInstallPrompt(null)
        }}><Download size={16} /> Установить</button>}
      </div>
    </header>

    <div className="layout">
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <div className="side-label">МЕНЮ</div>
        {nav.map(([id, label, Icon]) => (
          <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`}
            onClick={() => { setTab(id); setMenu(false) }}>
            <Icon size={19} />{label}
          </button>
        ))}
        <div className="side-spacer" />
        <button className={`nav-item ${tab === 'admin' ? 'active' : ''}`}
          onClick={() => { setTab('admin'); setMenu(false) }}>
          <Shield size={19} /> Администрирование
        </button>
        <div className="sidebar-foot">VORTEX CARDS <span>v1.0 PWA</span></div>
      </aside>

      <main className="main">
        <div className="page-head">
          <div><div className="eyebrow">DIGITAL CARD ECONOMY</div><h1>{title}</h1></div>
          <div className="avatar">{user?.email?.[0]?.toUpperCase() || 'G'}</div>
        </div>

        {notice && <div className="notice" onClick={() => setNotice('')}>
          {notice}<button>×</button>
        </div>}

        {tab === 'home' && <>
          <section className="hero">
            <div className="hero-copy">
              <div className="pill"><Sparkles size={13} /> YOUR DIGITAL ASSET</div>
              <h2>Твоя карточка.<br /><span>Твои правила.</span></h2>
              <p>Управляй карточками, приглашай друзей и торгуй на P2P-маркетплейсе VORTEX.</p>
              <button className="primary" onClick={() => setTab('market')}>
                Открыть маркетплейс <ArrowLeftRight size={17} />
              </button>
            </div>
            <div className="hero-card">
              <div className="card-top"><span>VORTEX</span><span>GENESIS / 001</span></div>
              <div className="orb"><div /></div>
              <div className="card-bottom"><b>VORTEX CARD</b><span>OWN THE DIGITAL FLOW</span></div>
            </div>
          </section>
          <div className="stats">
            <Stat label="МОИ КАРТОЧКИ" value={cards} icon={<CreditCard />} />
            <Stat label="РЕФЕРАЛЫ" value={referrals} icon={<Users />} />
            <Stat label="ЦЕНА ВЫКУПА*" value="20 ₴" icon={<Wallet />} />
          </div>
          <div className="section-title">БЫСТРЫЕ ДЕЙСТВИЯ</div>
          <div className="quick-grid">
            <Quick icon={<CreditCard />} title="Мои карточки" desc="Баланс и переводы" click={() => setTab('cards')} />
            <Quick icon={<Store />} title="P2P-рынок" desc="Покупка и продажа" click={() => setTab('market')} />
            <Quick icon={<Users />} title="Пригласить друга" desc="Получить карточку" click={() => setTab('referrals')} />
          </div>
          <p className="disclaimer">* 20 ₴ — утверждённая целевая цена выкупа. Выплаты возможны только при наличии финансирования и после проверки условий программы.</p>
        </>}

        {tab === 'cards' && <>
          <div className="balance-panel">
            <div><span className="muted">ДОСТУПНЫЙ БАЛАНС</span><div className="big-number">{cards} <small>VORTEX CARD</small></div></div>
            <div className="balance-icon"><CreditCard /></div>
          </div>
          <div className="panel">
            <h3>Передать карточки</h3>
            <p className="muted">В демонстрационном режиме переводы не выполняются.</p>
            <input placeholder="Email или ID получателя" />
            <input type="number" min="1" placeholder="Количество карточек" />
            <button className="primary full" onClick={() => setNotice('Для безопасных переводов требуется подключённая серверная операция Supabase.')}>Передать</button>
          </div>
        </>}

        {tab === 'market' && <>
          <div className="market-head">
            <div><h2>P2P маркетплейс</h2><p className="muted">Пользователи устанавливают собственные цены.</p></div>
            <span className="fee">КОМИССИЯ 5%</span>
          </div>
          <div className="panel">
            <h3><Plus size={18} /> Создать объявление</h3>
            <form className="listing-form" onSubmit={addListing}>
              <label>Количество<input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} /></label>
              <label>Цена за карточку, ₴<input type="number" min="1" value={price} onChange={e => setPrice(e.target.value)} /></label>
              <button className="primary">Выставить</button>
            </form>
          </div>
          <div className="section-title">АКТИВНЫЕ ОБЪЯВЛЕНИЯ</div>
          <div className="listing-list">
            {listings.map(item => <div className="listing" key={item.id}>
              <div className="listing-avatar">{item.seller[0].toUpperCase()}</div>
              <div className="listing-info"><b>{item.seller}</b><span>{item.qty} карточек доступно</span></div>
              <div className="listing-price"><b>{item.price} ₴</b><span>за карточку</span></div>
              <button className="outline" onClick={() => buy(item)}>Купить</button>
            </div>)}
          </div>
          <p className="disclaimer">Показаны демонстрационные объявления. Реальные расчёты, резервирование карточек и удержание комиссии пока не подключены.</p>
        </>}

        {tab === 'referrals' && <>
          <div className="panel referral-panel">
            <div className="ref-icon"><Users /></div>
            <h2>Расти вместе с VORTEX</h2>
            <p className="muted">Пригласивший получает 1 дополнительную карточку после подтверждённой регистрации реферала. Новый пользователь получает стартовую карточку.</p>
            <div className="ref-link">
              <span>{referralLink}</span>
              <button onClick={() => navigator.clipboard?.writeText(referralLink).then(() => setNotice('Ссылка скопирована')).catch(() => setNotice('Не удалось скопировать ссылку'))}><Copy size={17} /></button>
            </div>
            <div className="stats mini">
              <Stat label="ПРИГЛАШЕНО" value={referrals} icon={<Users />} />
              <Stat label="НАГРАДА" value="+1 CARD" icon={<CreditCard />} />
            </div>
          </div>
        </>}

        {tab === 'profile' && <div className="panel auth-panel">
          <h2>{user ? 'Аккаунт' : 'Вход или регистрация'}</h2>
          {user ? <>
            <p className="muted">{user.email}</p>
            <button className="outline" onClick={logout}>Выйти</button>
          </> : <form onSubmit={signIn}>
            <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
            <label>Пароль<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required /></label>
            <button className="primary full">Войти</button>
            <button type="button" className="outline full" onClick={signUp}>Создать аккаунт</button>
          </form>}
        </div>}

        {tab === 'admin' && <div className="panel">
          <div className="admin-head"><Shield /><h2>Панель администратора</h2></div>
          {adminLoading ? <p className="muted">Проверка прав доступа...</p>
            : !user ? <p className="muted">Войдите в аккаунт</p>
            : !isAdmin ? <p className="muted">Доступ закрыт. У вас нет прав администратора</p>
            : <>
              <p className="muted">Права администратора подтверждены</p>
              <div className="admin-grid">
                <Stat label="ЗАЯВКИ НА ВЫКУП" value="Подключим позже" icon={<Wallet />} />
                <Stat label="СПОРНЫЕ СДЕЛКИ" value="Подключим позже" icon={<Shield />} />
              </div>
            </>}
        </div>}

        <footer>© 2026 VORTEX CARDS <span>Digital card platform</span></footer>
      </main>
    </div>
  </div>
}

function Stat({ label, value, icon }) {
  return <div className="stat">
    <div className="stat-icon">{icon}</div>
    <div><span>{label}</span><b>{value}</b></div>
  </div>
}

function Quick({ icon, title, desc, click }) {
  return <button className="quick" onClick={click}>
    <div className="quick-icon">{icon}</div>
    <div><b>{title}</b><span>{desc}</span></div>
    <span className="arrow">↗</span>
  </button>
}

createRoot(document.getElementById('root')).render(<App />)
                                                                                    
