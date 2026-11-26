import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import {
  Home, CreditCard, Users, Store, UserRound, Shield, ArrowLeftRight,
  Plus, Copy, Menu, X, Download, Wallet, Sparkles
} from 'lucide-react'
import './style.css'

const supabaseUrl = 'https://rrpjzfaqmkrawvtvpqfm.supabase.co'
const supabaseKey = 'sb_publishable_giHUqFHf-WWatUkS7AqNPA_UVkgA1ps'
const supabase = createClient(supabaseUrl, supabaseKey)

function App() {
  const [tab, setTab] = useState('home')
  const [language, setLanguage] = useState(() => localStorage.getItem('vortex-language') || 'ru')
  const [analytics, setAnalytics] = useState({ total: 0, today: 0, week: 0, unique: 0, error: '' })
  const [menu, setMenu] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [user, setUser] = useState(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushPromptOpen, setPushPromptOpen] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const pushServerReady = Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [cards, setCards] = useState(1)
  const [listings, setListings] = useState([])
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketError, setMarketError] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('10')
  const [referrals] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminData, setAdminData] = useState([])
  const [adminDataLoading, setAdminDataLoading] = useState(false)
  const [financial, setFinancial] = useState({ ledger: [], cards: [], deposits: [], withdrawals: [], exchanges: [], error: '', loading: false })
  const [transferEmail, setTransferEmail] = useState('')
  const [transferQuantity, setTransferQuantity] = useState('1')
  const [adminActionBusy, setAdminActionBusy] = useState(false)
  const [issueOwnerId, setIssueOwnerId] = useState('')
  const [issueSerial, setIssueSerial] = useState('')

  const adminTables = [
    { name: 'user_accounts', label: 'Аккаунты пользователей' },
    { name: 'card_balances', label: 'Баланс карточек' },
    { name: 'market_listings', label: 'Объявления маркетплейса' },
    { name: 'complaints', label: 'Жалобы' },
    { name: 'disputes', label: 'Спорные сделки' },
    { name: 'buyback_requests', label: 'Заявки на выкуп' },
    { name: 'admin_audit_log', label: 'Журнал действий администратора' },
    { name: 'card_inventory', label: 'Реестр выпущенных карточек' },
    { name: 'wallet_ledger', label: 'Финансовый журнал' },
    { name: 'crypto_deposit_requests', label: 'Заявки на пополнение криптовалютой' },
    { name: 'crypto_withdrawal_requests', label: 'Заявки на вывод криптовалюты' },
    { name: 'exchange_requests', label: 'Заявки на обмен в VTX' }
  ]

  async function loadAnalytics() {
    const since = new Date(); since.setDate(since.getDate() - 7); since.setHours(0,0,0,0)
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    try {
      const [all, today, recent] = await Promise.all([
        supabase.from('site_visits').select('*', { count: 'exact', head: true }),
        supabase.from('site_visits').select('*', { count: 'exact', head: true }).gte('visited_at', todayStart.toISOString()),
        supabase.from('site_visits').select('session_id, visited_at').gte('visited_at', since.toISOString()).limit(5000)
      ])
      const failed = all.error || today.error || recent.error
      if (failed) throw failed
      setAnalytics({ total: all.count || 0, today: today.count || 0, week: recent.data?.length || 0, unique: new Set((recent.data || []).map(x => x.session_id)).size, error: '' })
    } catch (error) {
      setAnalytics(v => ({ ...v, error: error.message || 'Не удалось загрузить статистику' }))
    }
  }

  async function loadFinancialData() {
    if (!user) {
      setFinancial({ ledger: [], cards: [], deposits: [], withdrawals: [], exchanges: [], error: '', loading: false })
      return
    }
    setFinancial(v => ({ ...v, loading: true, error: '' }))
    try {
      const [ledger, cardsResult, deposits, withdrawals, exchanges] = await Promise.all([
        supabase.from('wallet_ledger').select('id, asset_code, amount, entry_type, description, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('card_inventory').select('id, serial_number, status, issued_at').eq('owner_id', user.id).order('issued_at', { ascending: false }).limit(100),
        supabase.from('crypto_deposit_requests').select('id, asset_code, network, amount_expected, amount_received, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('crypto_withdrawal_requests').select('id, asset_code, network, amount, fee, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('exchange_requests').select('id, from_asset, amount_in, to_asset, amount_out, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
      ])
      const failed = [ledger, cardsResult, deposits, withdrawals, exchanges].find(result => result.error)
      if (failed) throw failed.error
      setFinancial({
        ledger: ledger.data || [],
        cards: cardsResult.data || [],
        deposits: deposits.data || [],
        withdrawals: withdrawals.data || [],
        exchanges: exchanges.data || [],
        error: '',
        loading: false
      })
    } catch (error) {
      setFinancial(v => ({ ...v, loading: false, error: error.message || 'Не удалось загрузить финансовые данные' }))
    }
  }

  async function transferCards(e) {
    e.preventDefault()
    if (!user) { setNotice('Сначала войдите в аккаунт.'); return }
    const quantity = Number(transferQuantity)
    if (!transferEmail.trim() || !Number.isInteger(quantity) || quantity < 1) {
      setNotice('Укажите email получателя и целое количество карточек.'); return
    }
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('transfer_cards', {
        p_recipient_email: transferEmail.trim(), p_quantity: quantity
      })
      if (error) throw error
      setTransferEmail('')
      setTransferQuantity('1')
      await loadFinancialData()
      setNotice(`Успешно передано карточек: ${data?.transferred ?? quantity}.`)
    } catch (error) {
      setNotice('Не удалось передать карточки: ' + (error.message || 'ошибка операции'))
    } finally { setBusy(false) }
  }

  async function issueCard(e) {
    e.preventDefault()
    if (!isAdmin || !issueOwnerId.trim() || !issueSerial.trim()) return
    await runAdminAction('admin_issue_card', { p_owner_id: issueOwnerId.trim(), p_serial_number: issueSerial.trim() }, 'Карточка выпущена и закреплена за пользователем.')
    setIssueSerial('')
  }

  async function runAdminAction(rpcName, args, successMessage) {
    if (!isAdmin || adminActionBusy) return
    setAdminActionBusy(true)
    try {
      const { error } = await supabase.rpc(rpcName, args)
      if (error) throw error
      setNotice(successMessage)
      await loadAdminData()
    } catch (error) {
      setNotice('Действие не выполнено: ' + (error.message || 'ошибка сервера'))
    } finally { setAdminActionBusy(false) }
  }

  async function loadMarketplace() {
    setMarketLoading(true)
    setMarketError('')
    try {
      const { data, error } = await supabase
        .from('market_listings')
        .select('id, seller_id, quantity, price, status, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      setListings((data || []).map(item => ({
        id: item.id,
        sellerId: item.seller_id,
        isMine: item.seller_id === user?.id,
        seller: String(item.seller_id || '').slice(0, 8),
        qty: Number(item.quantity || 0),
        price: Number(item.price || 0),
        createdAt: item.created_at
      })))
    } catch (error) {
      setListings([])
      setMarketError(error.message || 'Не удалось загрузить объявления')
    } finally {
      setMarketLoading(false)
    }
  }

  async function loadAdminData() {
    setAdminDataLoading(true)
    const results = await Promise.all(adminTables.map(async table => {
      try {
        const { data, error } = await supabase.from(table.name).select('*').limit(50)
        if (error) return { ...table, rows: [], error: error.message }
        return { ...table, rows: data || [], error: '' }
      } catch (error) {
        return { ...table, rows: [], error: error.message || 'Не удалось загрузить данные' }
      }
    }))
    setAdminData(results)
    setAdminDataLoading(false)
  }

  useEffect(() => {
    if (tab === 'admin' && isAdmin) { loadAdminData(); loadAnalytics() }
  }, [tab, isAdmin])

  useEffect(() => {
    if (tab === 'market') loadMarketplace()
  }, [tab])

  async function checkAdmin(currentUser) {
    if (!currentUser) {
      setIsAdmin(false)
      setAdminLoading(false)
      return
    }
    setAdminLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .maybeSingle()
      if (error) console.error('Ошибка проверки администратора:', error)
      setIsAdmin(!error && data?.role === 'admin')
    } catch (error) {
      console.error('Ошибка проверки администратора:', error)
      setIsAdmin(false)
    } finally {
      setAdminLoading(false)
    }
  }

  useEffect(() => {
    checkAdmin(user)
  }, [user])

  useEffect(() => {
    loadFinancialData()
  }, [user])

  useEffect(() => {
    localStorage.setItem('vortex-language', language)
  }, [language])

  useEffect(() => {
    if (!user) {
      setPushEnabled(false)
      setPushPromptOpen(false)
      return
    }
    const metadata = user.user_metadata || {}
    setPushEnabled(metadata.push_notifications_enabled === true)
    setPushPromptOpen(!metadata.push_consent_status || metadata.push_consent_status === 'pending')
  }, [user?.id, user?.user_metadata?.push_consent_status, user?.user_metadata?.push_notifications_enabled])

  async function savePushPreference(enabled) {
    if (!user || pushBusy) return
    setPushBusy(true)
    try {
      if (enabled) {
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
          throw new Error('Этот браузер не поддерживает push-уведомления. Попробуйте установить приложение и открыть его в Chrome.')
        }
        let permission = Notification.permission
        if (permission !== 'granted') permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          const { data, error } = await supabase.auth.updateUser({ data: {
            push_notifications_enabled: false,
            push_consent_status: 'declined',
            push_consent_at: new Date().toISOString()
          } })
          if (error) throw error
          setUser(data.user)
          setPushEnabled(false)
          setPushPromptOpen(false)
          setNotice('Разрешение на уведомления не выдано. Вы сможете изменить выбор в настройках профиля.')
          return
        }
        if (pushServerReady) {
          const registration = await navigator.serviceWorker.ready
          let subscription = await registration.pushManager.getSubscription()
          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
            })
          }
          const { error: saveError } = await supabase.from('push_subscriptions').upsert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            subscription: subscription.toJSON(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,endpoint' })
          if (saveError) throw saveError
        }
      } else {
        if (pushServerReady && user) {
          const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
          if (error) console.warn('Не удалось удалить подписки push:', error.message)
        }
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration(`${import.meta.env.BASE_URL}`)
          const subscription = await registration?.pushManager?.getSubscription()
          if (subscription) await subscription.unsubscribe()
        }
      }

      const { data, error } = await supabase.auth.updateUser({ data: {
        push_notifications_enabled: enabled,
        push_consent_status: enabled ? 'accepted' : 'declined',
        push_consent_at: new Date().toISOString()
      } })
      if (error) throw error
      setUser(data.user)
      setPushEnabled(enabled)
      setPushPromptOpen(false)
      setNotice(enabled
        ? (pushServerReady ? 'Push-уведомления включены на этом устройстве.' : 'Согласие сохранено. Сервер отправки push-уведомлений ещё не настроен; получение сообщений начнёт работать после его подключения.')
        : 'Push-уведомления отключены.')
    } catch (error) {
      console.error('Ошибка настройки push-уведомлений:', error)
      setNotice('Не удалось изменить настройки уведомлений: ' + (error.message || 'ошибка'))
    } finally {
      setPushBusy(false)
    }
  }

  useEffect(() => {
    const handler = e => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
        .catch(error => console.error('Не удалось зарегистрировать Service Worker:', error))
    }

    if ('caches' in window) {
      caches.keys()
        .then(keys => Promise.all(
          keys.filter(key => key.startsWith('vortex-cards-')).map(key => caches.delete(key))
        ))
        .catch(error => console.error('Ошибка очистки кэша:', error))
    }

    try {
      let sessionId = sessionStorage.getItem('vortex-visit-session')
      if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem('vortex-visit-session', sessionId) }
      supabase.from('site_visits').insert({ path: location.pathname, session_id: sessionId, language }).then(({ error }) => { if (error) console.warn('Не удалось записать посещение:', error.message) })
    } catch (error) { console.warn('Аналитика посещений недоступна:', error) }

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error
        setUser(data.session?.user || null)
      })
      .catch(error => {
        console.error('Ошибка получения сессии:', error)
        setNotice('Не удалось проверить вход: ' + (error.message || 'ошибка соединения'))
      })

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset')
        setPassword('')
        setPasswordConfirm('')
        setNotice('Введите новый пароль для аккаунта.')
        setTab('profile')
      }
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      authListener.subscription.unsubscribe()
    }
  }, [])

  const translations = {
  "uk": {
    "Обзор": "Огляд",
    "Карточки": "Картки",
    "Маркетплейс": "Маркетплейс",
    "Рефералы": "Реферали",
    "Профиль": "Профіль",
    "Администрирование": "Адміністрування",
    "МЕНЮ": "МЕНЮ",
    "Установить": "Встановити",
    "DIGITAL CARD ECONOMY": "ЦИФРОВА ЕКОНОМІКА КАРТОК",
    "Вход или регистрация": "Вхід або реєстрація",
    "Панель администратора": "Панель адміністратора",
    "Статистика посещаемости": "Статистика відвідуваності",
    "Языки сайта": "Мови сайту",
    "Администратор": "Адміністратор",
    "Закрыть": "Закрити",
    "Твоя карточка.": "Твоя картка.",
    "Твои правила.": "Твої правила.",
    "Управляй карточками, приглашай друзей и торгуй на P2P-маркетплейсе VORTEX.": "Керуй картками, запрошуй друзів і торгуй на P2P-маркетплейсі VORTEX.",
    "Открыть маркетплейс": "Відкрити маркетплейс",
    "МОИ КАРТОЧКИ": "МОЇ КАРТКИ",
    "РЕФЕРАЛЫ": "РЕФЕРАЛИ",
    "ЦЕНА ВЫКУПА*": "ЦІНА ВИКУПУ*",
    "БЫСТРЫЕ ДЕЙСТВИЯ": "ШВИДКІ ДІЇ",
    "Мои карточки": "Мої картки",
    "Баланс и переводы": "Баланс і перекази",
    "P2P-рынок": "P2P-ринок",
    "Покупка и продажа": "Купівля та продаж",
    "Пригласить друга": "Запросити друга",
    "Получить карточку": "Отримати картку",
    "ДОСТУПНЫЙ БАЛАНС": "ДОСТУПНИЙ БАЛАНС",
    "Передать карточки": "Передати картки",
    "В демонстрационном режиме переводы не выполняются.": "У демонстраційному режимі перекази не виконуються.",
    "Email или ID получателя": "Email або ID отримувача",
    "Количество карточек": "Кількість карток",
    "Передать": "Передати",
    "P2P маркетплейс": "P2P маркетплейс",
    "Пользователи устанавливают собственные цены.": "Користувачі встановлюють власні ціни.",
    "КОМИССИЯ 5%": "КОМІСІЯ 5%",
    "Создать объявление": "Створити оголошення",
    "Количество": "Кількість",
    "Цена за карточку, ₴": "Ціна за картку, ₴",
    "Выставить": "Виставити",
    "АКТИВНЫЕ ОБЪЯВЛЕНИЯ": "АКТИВНІ ОГОЛОШЕННЯ",
    "карточек доступно": "карток доступно",
    "за карточку": "за картку",
    "Купить": "Купити",
    "Расти вместе с VORTEX": "Рости разом із VORTEX",
    "ПРИГЛАШЕНО": "ЗАПРОШЕНО",
    "НАГРАДА": "ВИНАГОРОДА",
    "Аккаунт": "Обліковий запис",
    "Выйти": "Вийти",
    "Пароль": "Пароль",
    "Подождите...": "Зачекайте...",
    "Войти": "Увійти",
    "Создать аккаунт": "Створити обліковий запис",
    "Финансовый кабинет": "Фінансовий кабінет",
    "Баланс по активам": "Баланс за активами",
    "Последние финансовые операции": "Останні фінансові операції",
    "Финансовых операций пока нет.": "Фінансових операцій поки немає.",
    "Заявки на пополнение": "Заявки на поповнення",
    "Заявки на вывод": "Заявки на виведення",
    "Заявки на обмен в VTX": "Заявки на обмін у VTX",
    "Заявок нет.": "Заявок немає.",
    "Обновить финансовые данные": "Оновити фінансові дані",
    "Ваши карточки, зарегистрированные в реестре VORTEX.": "Ваші картки, зареєстровані в реєстрі VORTEX.",
    "карточек": "карток",
    "Пока нет карточек": "Поки немає карток",
    "Когда карточки будут выпущены и закреплены за вашим аккаунтом, они появятся здесь.": "Коли картки буде випущено та закріплено за вашим обліковим записом, вони з’являться тут.",
    "Обновить карточки": "Оновити картки",
    "На продаже": "На продажу",
    "Зарезервирована": "Зарезервована",
    "Продана": "Продана",
    "Владелец": "Власник",
    "Проверка прав доступа...": "Перевірка прав доступу...",
    "Войдите в аккаунт": "Увійдіть в обліковий запис",
    "Доступ закрыт. У вас нет прав администратора.": "Доступ закрито. У вас немає прав адміністратора.",
    "Права администратора подтверждены. Ниже отображаются данные из базы Supabase.": "Права адміністратора підтверджено. Нижче відображено дані з бази Supabase.",
    "Обновление...": "Оновлення...",
    "Обновить данные": "Оновити дані",
    "ВСЕ ПОСЕЩЕНИЯ": "УСІ ВІДВІДУВАННЯ",
    "СЕГОДНЯ": "СЬОГОДНІ",
    "ЗА 7 ДНЕЙ": "ЗА 7 ДНІВ",
    "УНИКАЛЬНЫЕ СЕССИИ · 7 ДНЕЙ": "УНІКАЛЬНІ СЕСІЇ · 7 ДНІВ",
    "Обновить статистику": "Оновити статистику",
    "Считаются посещения страниц и анонимные сессии. IP-адреса и личные данные посетителей не сохраняются.": "Враховуються перегляди сторінок та анонімні сесії. IP-адреси й особисті дані відвідувачів не зберігаються.",
    "Доступные языки интерфейса. Посетитель может выбрать язык в верхней панели; выбор сохраняется на его устройстве.": "Доступні мови інтерфейсу. Відвідувач може вибрати мову у верхній панелі; вибір зберігається на його пристрої.",
    "Записей пока нет.": "Записів поки немає.",
    "Загружаем таблицы базы данных...": "Завантажуємо таблиці бази даних...",

    "20 ₴ — утверждённая целевая цена выкупа. Выплаты возможны только при наличии финансирования и после проверки условий программы.": "20 ₴ — затверджена цільова ціна викупу. Виплати можливі лише за наявності фінансування та після перевірки умов програми.",
    "Для безопасных переводов требуется подключённая серверная операция Supabase.": "Для безпечних переказів потрібна підключена серверна операція Supabase.",
    "Показаны демонстрационные объявления. Реальные расчёты, резервирование карточек и удержание комиссии пока не подключены.": "Показано демонстраційні оголошення. Реальні розрахунки, резервування карток та утримання комісії поки не підключені.",
    "Пригласивший получает 1 дополнительную карточку после подтверждённой регистрации реферала. Новый пользователь получает стартовую карточку.": "Той, хто запросив, отримує 1 додаткову картку після підтвердженої реєстрації реферала. Новий користувач отримує стартову картку.",
    "Ссылка скопирована": "Посилання скопійовано",
    "Не удалось скопировать ссылку": "Не вдалося скопіювати посилання",
    "Загрузка данных...": "Завантаження даних...",
    "Загрузка карточек...": "Завантаження карток...",
    "Карточки пока не удалось загрузить.": "Не вдалося завантажити картки.",
    "Ошибка загрузки:": "Помилка завантаження:",
    "Сумма не указана": "Суму не вказано",
    "Показано записей:": "Показано записів:",
    "карточек доступно": "карток доступно",
    "за карточку": "за картку",
    "ЦЕНА ВЫКУПА": "ЦІНА ВИКУПУ",
    "Digital card platform": "Платформа цифрових карток"
  },
  "en": {
    "Обзор": "Overview",
    "Карточки": "Cards",
    "Маркетплейс": "Marketplace",
    "Рефералы": "Referrals",
    "Профиль": "Profile",
    "Администрирование": "Administration",
    "МЕНЮ": "MENU",
    "Установить": "Install",
    "DIGITAL CARD ECONOMY": "DIGITAL CARD ECONOMY",
    "Вход или регистрация": "Sign in or register",
    "Панель администратора": "Admin panel",
    "Статистика посещаемости": "Traffic statistics",
    "Языки сайта": "Website languages",
    "Администратор": "Administrator",
    "Закрыть": "Close",
    "Твоя карточка.": "Your card.",
    "Твои правила.": "Your rules.",
    "Управляй карточками, приглашай друзей и торгуй на P2P-маркетплейсе VORTEX.": "Manage cards, invite friends, and trade on the VORTEX P2P marketplace.",
    "Открыть маркетплейс": "Open marketplace",
    "МОИ КАРТОЧКИ": "MY CARDS",
    "РЕФЕРАЛЫ": "REFERRALS",
    "ЦЕНА ВЫКУПА*": "BUYBACK PRICE*",
    "БЫСТРЫЕ ДЕЙСТВИЯ": "QUICK ACTIONS",
    "Мои карточки": "My cards",
    "Баланс и переводы": "Balance and transfers",
    "P2P-рынок": "P2P market",
    "Покупка и продажа": "Buy and sell",
    "Пригласить друга": "Invite a friend",
    "Получить карточку": "Get a card",
    "ДОСТУПНЫЙ БАЛАНС": "AVAILABLE BALANCE",
    "Передать карточки": "Transfer cards",
    "В демонстрационном режиме переводы не выполняются.": "Transfers are disabled in demo mode.",
    "Email или ID получателя": "Recipient email or ID",
    "Количество карточек": "Number of cards",
    "Передать": "Transfer",
    "P2P маркетплейс": "P2P marketplace",
    "Пользователи устанавливают собственные цены.": "Users set their own prices.",
    "КОМИССИЯ 5%": "5% FEE",
    "Создать объявление": "Create listing",
    "Количество": "Quantity",
    "Цена за карточку, ₴": "Price per card, ₴",
    "Выставить": "List for sale",
    "АКТИВНЫЕ ОБЪЯВЛЕНИЯ": "ACTIVE LISTINGS",
    "карточек доступно": "cards available",
    "за карточку": "per card",
    "Купить": "Buy",
    "Расти вместе с VORTEX": "Grow with VORTEX",
    "ПРИГЛАШЕНО": "INVITED",
    "НАГРАДА": "REWARD",
    "Аккаунт": "Account",
    "Выйти": "Sign out",
    "Пароль": "Password",
    "Подождите...": "Please wait...",
    "Войти": "Sign in",
    "Создать аккаунт": "Create account",
    "Финансовый кабинет": "Financial dashboard",
    "Баланс по активам": "Asset balances",
    "Последние финансовые операции": "Recent financial activity",
    "Финансовых операций пока нет.": "No financial activity yet.",
    "Заявки на пополнение": "Deposit requests",
    "Заявки на вывод": "Withdrawal requests",
    "Заявки на обмен в VTX": "Exchange requests to VTX",
    "Заявок нет.": "No requests.",
    "Обновить финансовые данные": "Refresh financial data",
    "Ваши карточки, зарегистрированные в реестре VORTEX.": "Your cards registered in the VORTEX registry.",
    "карточек": "cards",
    "Пока нет карточек": "No cards yet",
    "Когда карточки будут выпущены и закреплены за вашим аккаунтом, они появятся здесь.": "Cards issued and assigned to your account will appear here.",
    "Обновить карточки": "Refresh cards",
    "На продаже": "Listed",
    "Зарезервирована": "Reserved",
    "Продана": "Sold",
    "Владелец": "Owned",
    "Проверка прав доступа...": "Checking access...",
    "Войдите в аккаунт": "Please sign in",
    "Доступ закрыт. У вас нет прав администратора.": "Access denied. You do not have administrator privileges.",
    "Права администратора подтверждены. Ниже отображаются данные из базы Supabase.": "Administrator access confirmed. Supabase data is shown below.",
    "Обновление...": "Refreshing...",
    "Обновить данные": "Refresh data",
    "ВСЕ ПОСЕЩЕНИЯ": "ALL VISITS",
    "СЕГОДНЯ": "TODAY",
    "ЗА 7 ДНЕЙ": "LAST 7 DAYS",
    "УНИКАЛЬНЫЕ СЕССИИ · 7 ДНЕЙ": "UNIQUE SESSIONS · 7 DAYS",
    "Обновить статистику": "Refresh statistics",
    "Считаются посещения страниц и анонимные сессии. IP-адреса и личные данные посетителей не сохраняются.": "Page visits and anonymous sessions are counted. IP addresses and personal visitor data are not stored.",
    "Доступные языки интерфейса. Посетитель может выбрать язык в верхней панели; выбор сохраняется на его устройстве.": "Available interface languages. Visitors can choose a language in the top bar; the choice is saved on their device.",
    "Записей пока нет.": "No records yet.",
    "Загружаем таблицы базы данных...": "Loading database tables..."
  },

    "20 ₴ — утверждённая целевая цена выкупа. Выплаты возможны только при наличии финансирования и после проверки условий программы.": "₴20 is the approved target buyback price. Payouts are subject to available funding and program eligibility checks.",
    "Для безопасных переводов требуется подключённая серверная операция Supabase.": "A secure Supabase server operation is required to transfer cards.",
    "Показаны демонстрационные объявления. Реальные расчёты, резервирование карточек и удержание комиссии пока не подключены.": "These are sample listings. Real payments, card reservations, and fee collection are not connected yet.",
    "Пригласивший получает 1 дополнительную карточку после подтверждённой регистрации реферала. Новый пользователь получает стартовую карточку.": "The inviter receives 1 extra card after the referral registration is confirmed. The new user receives a starter card.",
    "Ссылка скопирована": "Link copied",
    "Не удалось скопировать ссылку": "Could not copy the link",
    "Загрузка данных...": "Loading data...",
    "Загрузка карточек...": "Loading cards...",
    "Карточки пока не удалось загрузить.": "Cards could not be loaded yet.",
    "Ошибка загрузки:": "Loading error:",
    "Сумма не указана": "Amount not specified",
    "Показано записей:": "Records shown:",
    "карточек доступно": "cards available",
    "за карточку": "per card",
    "ЦЕНА ВЫКУПА": "BUYBACK PRICE",
    "Digital card platform": "Digital card platform",  "de": {
    "Обзор": "Übersicht",
    "Карточки": "Karten",
    "Маркетплейс": "Marktplatz",
    "Рефералы": "Empfehlungen",
    "Профиль": "Profil",
    "Администрирование": "Administration",
    "МЕНЮ": "MENÜ",
    "Установить": "Installieren",
    "DIGITAL CARD ECONOMY": "DIGITALE KARTENWIRTSCHAFT",
    "Вход или регистрация": "Anmelden oder registrieren",
    "Панель администратора": "Adminbereich",
    "Статистика посещаемости": "Besucherstatistik",
    "Языки сайта": "Website-Sprachen",
    "Администратор": "Administrator",
    "Закрыть": "Schließen",
    "Твоя карточка.": "Deine Karte.",
    "Твои правила.": "Deine Regeln.",
    "Управляй карточками, приглашай друзей и торгуй на P2P-маркетплейсе VORTEX.": "Verwalte Karten, lade Freunde ein und handle auf dem VORTEX-P2P-Marktplatz.",
    "Открыть маркетплейс": "Marktplatz öffnen",
    "МОИ КАРТОЧКИ": "MEINE KARTEN",
    "РЕФЕРАЛЫ": "EMPFEHLUNGEN",
    "ЦЕНА ВЫКУПА*": "RÜCKKAUFPREIS*",
    "БЫСТРЫЕ ДЕЙСТВИЯ": "SCHNELLZUGRIFFE",
    "Мои карточки": "Meine Karten",
    "Баланс и переводы": "Guthaben und Überweisungen",
    "P2P-рынок": "P2P-Markt",
    "Покупка и продажа": "Kaufen und verkaufen",
    "Пригласить друга": "Freund einladen",
    "Получить карточку": "Karte erhalten",
    "ДОСТУПНЫЙ БАЛАНС": "VERFÜGBARES GUTHABEN",
    "Передать карточки": "Karten übertragen",
    "В демонстрационном режиме переводы не выполняются.": "Im Demomodus sind Übertragungen deaktiviert.",
    "Email или ID получателя": "E-Mail oder Empfänger-ID",
    "Количество карточек": "Anzahl der Karten",
    "Передать": "Übertragen",
    "P2P маркетплейс": "P2P-Marktplatz",
    "Пользователи устанавливают собственные цены.": "Nutzer legen ihre eigenen Preise fest.",
    "КОМИССИЯ 5%": "5 % GEBÜHR",
    "Создать объявление": "Anzeige erstellen",
    "Количество": "Menge",
    "Цена за карточку, ₴": "Preis pro Karte, ₴",
    "Выставить": "Einstellen",
    "АКТИВНЫЕ ОБЪЯВЛЕНИЯ": "AKTIVE ANGEBOTE",
    "карточек доступно": "Karten verfügbar",
    "за карточку": "pro Karte",
    "Купить": "Kaufen",
    "Расти вместе с VORTEX": "Wachse mit VORTEX",
    "ПРИГЛАШЕНО": "EINGELADEN",
    "НАГРАДА": "BELOHNUNG",
    "Аккаунт": "Konto",
    "Выйти": "Abmelden",
    "Пароль": "Passwort",
    "Подождите...": "Bitte warten...",
    "Войти": "Anmelden",
    "Создать аккаунт": "Konto erstellen",
    "Финансовый кабинет": "Finanzübersicht",
    "Баланс по активам": "Guthaben nach Assets",
    "Последние финансовые операции": "Letzte Finanztransaktionen",
    "Финансовых операций пока нет.": "Noch keine Finanztransaktionen.",
    "Заявки на пополнение": "Einzahlungsanfragen",
    "Заявки на вывод": "Auszahlungsanfragen",
    "Заявки на обмен в VTX": "Tauschanfragen in VTX",
    "Заявок нет.": "Keine Anfragen.",
    "Обновить финансовые данные": "Finanzdaten aktualisieren",
    "Ваши карточки, зарегистрированные в реестре VORTEX.": "Ihre im VORTEX-Register erfassten Karten.",
    "карточек": "Karten",
    "Пока нет карточек": "Noch keine Karten",
    "Когда карточки будут выпущены и закреплены за вашим аккаунтом, они появятся здесь.": "Ausgestellte und Ihrem Konto zugewiesene Karten erscheinen hier.",
    "Обновить карточки": "Karten aktualisieren",
    "На продаже": "Im Angebot",
    "Зарезервирована": "Reserviert",
    "Продана": "Verkauft",
    "Владелец": "Im Besitz",
    "Проверка прав доступа...": "Zugriffsrechte werden geprüft...",
    "Войдите в аккаунт": "Bitte anmelden",
    "Доступ закрыт. У вас нет прав администратора.": "Zugriff verweigert. Sie haben keine Administratorrechte.",
    "Права администратора подтверждены. Ниже отображаются данные из базы Supabase.": "Administratorrechte bestätigt. Unten werden Supabase-Daten angezeigt.",
    "Обновление...": "Aktualisierung...",
    "Обновить данные": "Daten aktualisieren",
    "ВСЕ ПОСЕЩЕНИЯ": "ALLE BESUCHE",
    "СЕГОДНЯ": "HEUTE",
    "ЗА 7 ДНЕЙ": "LETZTE 7 TAGE",
    "УНИКАЛЬНЫЕ СЕССИИ · 7 ДНЕЙ": "EINZIGARTIGE SITZUNGEN · 7 TAGE",
    "Обновить статистику": "Statistik aktualisieren",
    "Считаются посещения страниц и анонимные сессии. IP-адреса и личные данные посетителей не сохраняются.": "Seitenaufrufe und anonyme Sitzungen werden gezählt. IP-Adressen und persönliche Besucherdaten werden nicht gespeichert.",
    "Доступные языки интерфейса. Посетитель может выбрать язык в верхней панели; выбор сохраняется на его устройстве.": "Verfügbare Oberflächensprachen. Besucher können oben eine Sprache auswählen; die Auswahl wird auf ihrem Gerät gespeichert.",
    "Записей пока нет.": "Noch keine Einträge.",
    "Загружаем таблицы базы данных...": "Datenbanktabellen werden geladen..."
  },

    "20 ₴ — утверждённая целевая цена выкупа. Выплаты возможны только при наличии финансирования и после проверки условий программы.": "20 ₴ ist der festgelegte Ziel-Rückkaufpreis. Auszahlungen sind nur bei ausreichender Finanzierung und nach Prüfung der Programmregeln möglich.",
    "Для безопасных переводов требуется подключённая серверная операция Supabase.": "Für sichere Übertragungen ist eine serverseitige Supabase-Funktion erforderlich.",
    "Показаны демонстрационные объявления. Реальные расчёты, резервирование карточек и удержание комиссии пока не подключены.": "Dies sind Demo-Angebote. Echte Zahlungen, Kartenreservierungen und Gebühreneinzug sind noch nicht aktiviert.",
    "Пригласивший получает 1 дополнительную карточку после подтверждённой регистрации реферала. Новый пользователь получает стартовую карточку.": "Der Einladende erhält nach bestätigter Registrierung des geworbenen Nutzers eine zusätzliche Karte. Der neue Nutzer erhält eine Starterkarte.",
    "Ссылка скопирована": "Link kopiert",
    "Не удалось скопировать ссылку": "Link konnte nicht kopiert werden",
    "Загрузка данных...": "Daten werden geladen...",
    "Загрузка карточек...": "Karten werden geladen...",
    "Карточки пока не удалось загрузить.": "Karten konnten noch nicht geladen werden.",
    "Ошибка загрузки:": "Ladefehler:",
    "Сумма не указана": "Betrag nicht angegeben",
    "Показано записей:": "Angezeigte Einträge:",
    "карточек доступно": "Karten verfügbar",
    "за карточку": "pro Karte",
    "ЦЕНА ВЫКУПА": "RÜCKKAUFPREIS",
    "Digital card platform": "Digitale Kartenplattform",  "fr": {
    "Обзор": "Vue d’ensemble",
    "Карточки": "Cartes",
    "Маркетплейс": "Marché",
    "Рефералы": "Parrainages",
    "Профиль": "Profil",
    "Администрирование": "Administration",
    "МЕНЮ": "MENU",
    "Установить": "Installer",
    "DIGITAL CARD ECONOMY": "ÉCONOMIE DES CARTES NUMÉRIQUES",
    "Вход или регистрация": "Connexion ou inscription",
    "Панель администратора": "Panneau administrateur",
    "Статистика посещаемости": "Statistiques de fréquentation",
    "Языки сайта": "Langues du site",
    "Администратор": "Administrateur",
    "Закрыть": "Fermer",
    "Твоя карточка.": "Votre carte.",
    "Твои правила.": "Vos règles.",
    "Управляй карточками, приглашай друзей и торгуй на P2P-маркетплейсе VORTEX.": "Gérez vos cartes, invitez vos amis et échangez sur la place de marché P2P VORTEX.",
    "Открыть маркетплейс": "Ouvrir la marketplace",
    "МОИ КАРТОЧКИ": "MES CARTES",
    "РЕФЕРАЛЫ": "PARRAINAGES",
    "ЦЕНА ВЫКУПА*": "PRIX DE RACHAT*",
    "БЫСТРЫЕ ДЕЙСТВИЯ": "ACTIONS RAPIDES",
    "Мои карточки": "Mes cartes",
    "Баланс и переводы": "Solde et transferts",
    "P2P-рынок": "Marché P2P",
    "Покупка и продажа": "Acheter et vendre",
    "Пригласить друга": "Inviter un ami",
    "Получить карточку": "Obtenir une carte",
    "ДОСТУПНЫЙ БАЛАНС": "SOLDE DISPONIBLE",
    "Передать карточки": "Transférer des cartes",
    "В демонстрационном режиме переводы не выполняются.": "Les transferts sont désactivés en mode démo.",
    "Email или ID получателя": "E-mail ou identifiant du destinataire",
    "Количество карточек": "Nombre de cartes",
    "Передать": "Transférer",
    "P2P маркетплейс": "Marketplace P2P",
    "Пользователи устанавливают собственные цены.": "Les utilisateurs fixent leurs propres prix.",
    "КОМИССИЯ 5%": "FRAIS DE 5 %",
    "Создать объявление": "Créer une annonce",
    "Количество": "Quantité",
    "Цена за карточку, ₴": "Prix par carte, ₴",
    "Выставить": "Mettre en vente",
    "АКТИВНЫЕ ОБЪЯВЛЕНИЯ": "ANNONCES ACTIVES",
    "карточек доступно": "cartes disponibles",
    "за карточку": "par carte",
    "Купить": "Acheter",
    "Расти вместе с VORTEX": "Grandissez avec VORTEX",
    "ПРИГЛАШЕНО": "INVITÉS",
    "НАГРАДА": "RÉCOMPENSE",
    "Аккаунт": "Compte",
    "Выйти": "Se déconnecter",
    "Пароль": "Mot de passe",
    "Подождите...": "Veuillez patienter...",
    "Войти": "Se connecter",
    "Создать аккаунт": "Créer un compte",
    "Финансовый кабинет": "Espace financier",
    "Баланс по активам": "Soldes par actif",
    "Последние финансовые операции": "Dernières opérations financières",
    "Финансовых операций пока нет.": "Aucune opération financière pour le moment.",
    "Заявки на пополнение": "Demandes de dépôt",
    "Заявки на вывод": "Demandes de retrait",
    "Заявки на обмен в VTX": "Demandes de conversion en VTX",
    "Заявок нет.": "Aucune demande.",
    "Обновить финансовые данные": "Actualiser les données financières",
    "Ваши карточки, зарегистрированные в реестре VORTEX.": "Vos cartes enregistrées dans le registre VORTEX.",
    "карточек": "cartes",
    "Пока нет карточек": "Aucune carte pour le moment",
    "Когда карточки будут выпущены и закреплены за вашим аккаунтом, они появятся здесь.": "Les cartes émises et associées à votre compte apparaîtront ici.",
    "Обновить карточки": "Actualiser les cartes",
    "На продаже": "En vente",
    "Зарезервирована": "Réservée",
    "Продана": "Vendue",
    "Владелец": "Possédée",
    "Проверка прав доступа...": "Vérification des autorisations...",
    "Войдите в аккаунт": "Veuillez vous connecter",
    "Доступ закрыт. У вас нет прав администратора.": "Accès refusé. Vous ne disposez pas des droits administrateur.",
    "Права администратора подтверждены. Ниже отображаются данные из базы Supabase.": "Droits administrateur confirmés. Les données Supabase sont affichées ci-dessous.",
    "Обновление...": "Actualisation...",
    "Обновить данные": "Actualiser les données",
    "ВСЕ ПОСЕЩЕНИЯ": "TOUTES LES VISITES",
    "СЕГОДНЯ": "AUJOURD’HUI",
    "ЗА 7 ДНЕЙ": "7 DERNIERS JOURS",
    "УНИКАЛЬНЫЕ СЕССИИ · 7 ДНЕЙ": "SESSIONS UNIQUES · 7 JOURS",
    "Обновить статистику": "Actualiser les statistiques",
    "Считаются посещения страниц и анонимные сессии. IP-адреса и личные данные посетителей не сохраняются.": "Les visites de pages et les sessions anonymes sont comptabilisées. Les adresses IP et données personnelles ne sont pas enregistrées.",
    "Доступные языки интерфейса. Посетитель может выбрать язык в верхней панели; выбор сохраняется на его устройстве.": "Langues disponibles. Le visiteur peut choisir une langue dans la barre supérieure ; son choix est mémorisé sur son appareil.",
    "Записей пока нет.": "Aucun enregistrement pour le moment.",
    "Загружаем таблицы базы данных...": "Chargement des tables de la base de données..."
  }
}

  const t = value => translations[language]?.[value] || value

  const referralLink = useMemo(
    () => `${location.origin}${import.meta.env.BASE_URL}?ref=${user?.id || 'YOUR_CODE'}`,
    [user]
  )

  async function signIn(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setNotice('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })
      if (error) throw error
      setUser(data.user)
      setNotice('Вход выполнен.')
    } catch (error) {
      console.error('Ошибка входа:', error)
      setNotice('Ошибка входа: ' + (error.message || 'проверьте интернет-соединение'))
    } finally {
      setBusy(false)
    }
  }

  async function sendPasswordReset(e) {
    e.preventDefault()
    if (busy) return
    const cleanEmail = email.trim()
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setNotice('Введите правильный адрес электронной почты.')
      return
    }
    setBusy(true)
    setNotice('Отправляем ссылку для восстановления пароля...')
    try {
      const redirectTo = new URL(import.meta.env.BASE_URL, location.origin).toString()
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo })
      if (error) throw error
      setNotice('Если этот адрес зарегистрирован, на него придёт письмо со ссылкой для восстановления пароля. Проверьте также папку «Спам».')
    } catch (error) {
      console.error('Ошибка восстановления пароля:', error)
      setNotice('Не удалось отправить письмо: ' + (error.message || 'ошибка сервера'))
    } finally {
      setBusy(false)
    }
  }

  async function saveNewPassword(e) {
    e.preventDefault()
    if (busy) return
    if (password.length < 6) {
      setNotice('Новый пароль должен содержать не менее 6 символов.')
      return
    }
    if (password !== passwordConfirm) {
      setNotice('Пароли не совпадают. Проверьте оба поля.')
      return
    }
    setBusy(true)
    setNotice('Сохраняем новый пароль...')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setPassword('')
      setPasswordConfirm('')
      setAuthMode('login')
      setNotice('Пароль успешно изменён. Теперь можно войти с новым паролем.')
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Ошибка смены пароля:', error)
      setNotice('Не удалось изменить пароль: ' + (error.message || 'ссылка могла устареть'))
    } finally {
      setBusy(false)
    }
  }

  async function signUp() {
    if (busy) return
    const cleanEmail = email.trim()
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setNotice('Введите правильный адрес электронной почты.')
      return
    }
    if (password.length < 6) {
      setNotice('Пароль должен содержать не менее 6 символов.')
      return
    }

    setBusy(true)
    setNotice('Отправляем запрос на регистрацию...')
    try {
      const ref = new URLSearchParams(location.search).get('ref')
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { referral_code: ref, push_consent_status: 'pending', push_notifications_enabled: false } }
      })
      if (error) throw error

      if (data.session) {
        setUser(data.user)
        setNotice('Регистрация успешна. Вы вошли в аккаунт.')
      } else {
        setNotice('Запрос принят. Проверьте почту и подтвердите регистрацию, затем войдите.')
      }
    } catch (error) {
      console.error('Ошибка регистрации:', error)
      setNotice('Регистрация не выполнена: ' + (error.message || 'не удалось связаться с сервером'))
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setBusy(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setIsAdmin(false)
      setNotice('Вы вышли из аккаунта.')
    } catch (error) {
      setNotice('Ошибка выхода: ' + (error.message || 'неизвестная ошибка'))
    } finally {
      setBusy(false)
    }
  }

  async function addListing(e) {
    e.preventDefault()
    if (!user) { setNotice('Чтобы выставить карточку, войдите в аккаунт.'); return }
    const q = Number(qty)
    const p = Number(price)
    if (!Number.isInteger(q) || q < 1 || !Number.isFinite(p) || p <= 0) {
      setNotice('Укажите корректное количество карточек и цену.')
      return
    }
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('create_market_listing', {
        p_quantity: q, p_price: p
      })
      if (error) throw error
      setNotice(`Объявление создано. Выставлено карточек: ${data?.quantity ?? q}. Пока объявление активно, эти карточки нельзя перевести другому пользователю.`)
      await Promise.all([loadMarketplace(), loadFinancialData()])
    } catch (error) {
      setNotice('Не удалось выставить карточки: ' + (error.message || 'ошибка операции'))
    } finally {
      setBusy(false)
    }
  }

  async function cancelOwnListing(item) {
    if (!user || !item?.id || !item.isMine || busy) return
    setBusy(true)
    try {
      const { error } = await supabase.rpc('cancel_own_market_listing', { p_listing_id: item.id })
      if (error) throw error
      setNotice('Объявление снято с продажи. Карточки снова доступны для перевода.')
      await Promise.all([loadMarketplace(), loadFinancialData()])
    } catch (error) {
      setNotice('Не удалось снять объявление: ' + (error.message || 'ошибка операции'))
    } finally {
      setBusy(false)
    }
  }

  const nav = [
    ['home', t('Обзор'), Home],
    ['cards', t('Карточки'), CreditCard],
    ['market', t('Маркетплейс'), Store],
    ['referrals', t('Рефералы'), Users],
    ['profile', t('Профиль'), UserRound]
  ]
  const title = nav.find(x => x[0] === tab)?.[1] || (tab === 'admin' ? 'Администратор' : 'Обзор')

  const page = <div className="app-shell">
    <header className="topbar">
      <button className="icon-btn mobile-only" type="button" onClick={() => setMenu(!menu)}>
        {menu ? <X /> : <Menu />}
      </button>
      <div className="brand-mark">
        <span className="brand-gem">V</span>
        <span>VORTEX <b>CARDS</b></span>
      </div>
      <div className="top-actions">
        <label className="language-picker" aria-label="Language"><span>🌐</span><select value={language} onChange={e => setLanguage(e.target.value)}><option value="uk">Українська</option><option value="ru">Русский</option><option value="en">English</option><option value="de">Deutsch</option><option value="fr">Français</option></select></label>
        <span className="status"><i /> ONLINE</span>
        {installPrompt && <button className="install-btn" type="button" onClick={async () => {
          try {
            await installPrompt.prompt()
            setInstallPrompt(null)
          } catch (error) {
            setNotice('Не удалось установить приложение: ' + error.message)
          }
        }}><Download size={16} /> Установить</button>}
      </div>
    </header>

    <div className="layout">
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <div className="side-label">{t('МЕНЮ')}</div>
        {nav.map(([id, label, Icon]) => (
          <button key={id} type="button" className={`nav-item ${tab === id ? 'active' : ''}`}
            onClick={() => { setTab(id); setMenu(false) }}>
            <Icon size={19} />{label}
          </button>
        ))}
        <div className="side-spacer" />
        <button type="button" className={`nav-item ${tab === 'admin' ? 'active' : ''}`}
          onClick={() => { setTab('admin'); setMenu(false) }}>
          <Shield size={19} /> {t('Администрирование')}
        </button>
        <div className="sidebar-foot">VORTEX CARDS <span>v1.0 PWA</span></div>
      </aside>

      <main className="main">
        <div className="page-head">
          <div><div className="eyebrow">{t('DIGITAL CARD ECONOMY')}</div><h1>{title}</h1></div>
          <div className="avatar">{user?.email?.[0]?.toUpperCase() || 'G'}</div>
        </div>

        {notice && <div className="notice" role="status">
          <span>{notice}</span><button type="button" aria-label="Закрыть" onClick={() => setNotice('')}>×</button>
        </div>}

        {tab === 'home' && <>
          <section className="hero">
            <div className="hero-copy">
              <div className="pill"><Sparkles size={13} /> YOUR DIGITAL ASSET</div>
              <h2>Твоя карточка.<br /><span>Твои правила.</span></h2>
              <p>Управляй карточками, приглашай друзей и торгуй на P2P-маркетплейсе VORTEX.</p>
              <button type="button" className="primary" onClick={() => setTab('market')}>
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
            <p className="muted">Передать можно только свободные карточки. Карточки, выставленные на маркетплейс, заблокированы для перевода до снятия объявления с продажи.</p>
            <form onSubmit={transferCards}>
              <label>Email получателя<input type="email" value={transferEmail} onChange={e => setTransferEmail(e.target.value)} placeholder="user@example.com" required /></label>
              <label>Количество карточек<input type="number" min="1" max="100" step="1" value={transferQuantity} onChange={e => setTransferQuantity(e.target.value)} required /></label>
              <button type="submit" className="primary full" disabled={busy}>{busy ? 'Выполняется...' : 'Передать карточки'}</button>
            </form>
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
              <button className="primary" type="submit" disabled={busy}>{busy ? 'Выставляем...' : 'Выставить'}</button>
            </form>
          </div>
          <div className="section-title">КАРТОЧКИ В ПРОДАЖЕ</div>
          <div className="listing-list">
            {marketLoading ? <p className="muted">Загружаем предложения...</p>
              : marketError ? <p className="muted">Не удалось загрузить предложения: {marketError}</p>
              : listings.length === 0 ? <div className="panel"><h3>Пока нет карточек в продаже</h3><p className="muted">Когда пользователи разместят реальные карточки, предложения появятся здесь.</p></div>
              : listings.map(item => <div className="listing market-card" key={item.id}>
                <div className="listing-avatar"><CreditCard /></div>
                <div className="listing-info"><b>VORTEX CARD</b><span>Продавец: {item.seller} · {item.qty} шт.</span></div>
                <div className="listing-price"><b>{item.price.toLocaleString('uk-UA')} ₴</b><span>за карточку</span></div>
                <div className="listing-price"><b>{(item.price * item.qty).toLocaleString('uk-UA')} ₴</b><span>за всё количество</span></div>
                {item.isMine && <button type="button" className="outline" disabled={busy} onClick={() => cancelOwnListing(item)}>Снять с продажи</button>}
              </div>)}
          </div>
          <button type="button" className="outline" onClick={loadMarketplace} disabled={marketLoading}>Обновить предложения</button>
          <p className="disclaimer">В витрине отображаются только реальные активные объявления из базы данных. Покупка и расчёты будут доступны после подключения безопасного механизма сделки.</p>
        </>}

        {tab === 'referrals' && <>
          <div className="panel referral-panel">
            <div className="ref-icon"><Users /></div>
            <h2>Расти вместе с VORTEX</h2>
            <p className="muted">Пригласивший получает 1 дополнительную карточку после подтверждённой регистрации реферала. Новый пользователь получает стартовую карточку.</p>
            <div className="ref-link">
              <span>{referralLink}</span>
              <button type="button" onClick={() => navigator.clipboard?.writeText(referralLink).then(() => setNotice('Ссылка скопирована')).catch(() => setNotice('Не удалось скопировать ссылку'))}><Copy size={17} /></button>
            </div>
            <div className="stats mini">
              <Stat label="ПРИГЛАШЕНО" value={referrals} icon={<Users />} />
              <Stat label="НАГРАДА" value="+1 CARD" icon={<CreditCard />} />
            </div>
          </div>
        </>}

        {tab === 'profile' && <div className="profile-dashboard">
          <section className="panel auth-panel profile-account">
            <h2>{user ? 'Аккаунт' : 'Вход или регистрация'}</h2>
            {user && authMode !== 'reset' ? <>
              <p className="muted">{user.email}</p>
              <div className="push-settings-row">
                <div className="push-settings-copy">
                  <b>Push-уведомления</b>
                  <span>{pushServerReady ? 'Получать важные сообщения VORTEXCARDS на этом устройстве.' : 'Разрешение сохраняется. Сервер отправки будет подключён отдельно.'}</span>
                </div>
                <label className="push-switch" aria-label="Получать push-уведомления">
                  <input type="checkbox" checked={pushEnabled} disabled={pushBusy} onChange={event => savePushPreference(event.target.checked)} />
                  <span className="push-switch-track"></span>
                </label>
              </div>
              <button type="button" className="outline" onClick={logout} disabled={busy}>Выйти</button>
            </> : authMode === 'forgot' ? <form onSubmit={sendPasswordReset}>
              <p className="muted">Укажите email, который использовали при регистрации. Мы отправим на него ссылку для восстановления доступа.</p>
              <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
              <button type="submit" className="primary full" disabled={busy}>{busy ? 'Отправляем...' : 'Отправить ссылку'}</button>
              <button type="button" className="outline full" disabled={busy} onClick={() => { setAuthMode('login'); setNotice('') }}>Вернуться ко входу</button>
            </form> : authMode === 'reset' ? <form onSubmit={saveNewPassword}>
              <p className="muted">Придумайте новый пароль для своего аккаунта.</p>
              <label>Новый пароль<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required autoComplete="new-password" /></label>
              <label>Повторите новый пароль<input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} minLength="6" required autoComplete="new-password" /></label>
              <button type="submit" className="primary full" disabled={busy}>{busy ? 'Сохраняем...' : 'Сохранить новый пароль'}</button>
            </form> : <form onSubmit={signIn}>
              <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
              <label>Пароль<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required autoComplete="current-password" /></label>
              <button type="submit" className="primary full" disabled={busy}>{busy ? 'Подождите...' : 'Войти'}</button>
              <button type="button" className="outline full" disabled={busy} onClick={signUp}>{busy ? 'Подождите...' : 'Создать аккаунт'}</button>
              <button type="button" className="outline full" disabled={busy} onClick={() => { setAuthMode('forgot'); setNotice('') }}>Забыли пароль?</button>
            </form>}
          </section>
          {user && <>
            <section className="panel">
              <h3>Перевести карточки другому пользователю</h3>
              <p className="muted">Укажите email получателя и количество свободных карточек. Карточки, выставленные на маркетплейс, передать нельзя.</p>
              <form onSubmit={transferCards}>
                <label>Email получателя<input type="email" value={transferEmail} onChange={e => setTransferEmail(e.target.value)} placeholder="user@example.com" required /></label>
                <label>Количество карточек<input type="number" min="1" max="100" step="1" value={transferQuantity} onChange={e => setTransferQuantity(e.target.value)} required /></label>
                <button type="submit" className="primary full" disabled={busy}>{busy ? 'Выполняется...' : 'Перевести другому пользователю'}</button>
              </form>
            </section>
            <section className="panel profile-financial">
              <div className="admin-head"><Wallet /><h3>Финансовый кабинет</h3></div>
              <p className="muted">Данные загружаются из Supabase. Балансы рассчитываются по записям финансового журнала; заявки сами по себе не означают поступление или выплату средств.</p>
              {financial.loading ? <p className="muted">Загрузка данных...</p> : financial.error ? <p className="muted">Ошибка загрузки: {financial.error}</p> : <>
                <h3>Баланс по активам</h3>
                <div className="admin-stats-grid">
                  {['USDT','BTC','ETH','TON','USDC','VTX'].map(asset => {
                    const total = financial.ledger.filter(entry => entry.asset_code === asset).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
                    return <Stat key={asset} label={asset} value={total.toFixed(6)} icon={<Wallet />} />
                  })}
                </div>
                <h3>Последние финансовые операции</h3>
                {financial.ledger.length === 0 ? <p className="muted">Финансовых операций пока нет.</p> : financial.ledger.slice(0,10).map(entry => <div className="listing" key={entry.id}>
                  <div className="listing-info"><b>{entry.entry_type} · {entry.asset_code}</b><span>{entry.description || new Date(entry.created_at).toLocaleString()}</span></div>
                  <div className="listing-price"><b>{Number(entry.amount).toFixed(6)}</b></div>
                </div>)}
                <h3>Заявки на пополнение</h3>
                {financial.deposits.length === 0 ? <p className="muted">Заявок нет.</p> : financial.deposits.map(item => <p className="muted" key={item.id}>{item.asset_code} · {item.network} · {item.amount_expected ?? 'Сумма не указана'} · {item.status}</p>)}
                <h3>Заявки на вывод</h3>
                {financial.withdrawals.length === 0 ? <p className="muted">Заявок нет.</p> : financial.withdrawals.map(item => <p className="muted" key={item.id}>{item.asset_code} · {item.amount} · {item.status}</p>)}
                <h3>Заявки на обмен в VTX</h3>
                {financial.exchanges.length === 0 ? <p className="muted">Заявок нет.</p> : financial.exchanges.map(item => <p className="muted" key={item.id}>{item.amount_in} {item.from_asset} → VTX · {item.status}</p>)}
              </>}
              <button type="button" className="outline" onClick={loadFinancialData} disabled={financial.loading}>Обновить финансовые данные</button>
            </section>
            <section className="panel profile-cards">
              <div className="admin-head"><CreditCard /><h3>Мои карточки</h3></div>
              <p className="muted">Ваши карточки, зарегистрированные в реестре VORTEX.</p>
              <div className="owned-card-count">{financial.cards.filter(card => card.status !== 'retired').length} <span>карточек</span></div>
              {financial.loading ? <p className="muted">Загрузка карточек...</p> : financial.error ? <p className="muted">Карточки пока не удалось загрузить.</p> : financial.cards.filter(card => card.status !== 'retired').length === 0
                ? <div className="empty-cards"><CreditCard size={30} /><b>Пока нет карточек</b><span>Когда карточки будут выпущены и закреплены за вашим аккаунтом, они появятся здесь.</span></div>
                : <div className="owned-cards-grid">
                  {financial.cards.filter(card => card.status !== 'retired').map((card, index) => <div className="owned-card" key={card.id}>
                    <div className="owned-card-top"><span>VORTEX</span><span>№ {String(index + 1).padStart(3, '0')}</span></div>
                    <div className="owned-card-symbol">V</div>
                    <div className="owned-card-bottom"><b>{card.serial_number}</b><span>{card.status === 'listed' ? 'На продаже' : card.status === 'reserved' ? 'Зарезервирована' : card.status === 'sold' ? 'Продана' : 'Владелец'}</span></div>
                  </div>)}
                </div>}
              <button type="button" className="outline" onClick={loadFinancialData} disabled={financial.loading}>Обновить карточки</button>
            </section>
          </>}
        </div>}

        {tab === 'admin' && <div>
          <div className="panel">
            <div className="admin-head"><Shield /><h2>Панель администратора</h2></div>
            {adminLoading ? <p className="muted">Проверка прав доступа...</p>
              : !user ? <p className="muted">Войдите в аккаунт</p>
              : !isAdmin ? <p className="muted">Доступ закрыт. У вас нет прав администратора.</p>
              : <>
                <p className="muted">Права администратора подтверждены. Ниже отображаются данные из базы Supabase.</p>
                <button type="button" className="primary" onClick={loadAdminData} disabled={adminDataLoading}>
                  {adminDataLoading ? 'Обновление...' : 'Обновить данные'}
                </button>
              </>}
          </div>
          {user && isAdmin && <div className="panel">
            <h3>Выпустить карточку пользователю</h3>
            <p className="muted">Укажите UUID пользователя из таблицы user_accounts и уникальный серийный номер. Выпуск создаёт запись в реестре карточек.</p>
            <form className="listing-form" onSubmit={issueCard}>
              <label>UUID пользователя<input value={issueOwnerId} onChange={e => setIssueOwnerId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required /></label>
              <label>Серийный номер<input value={issueSerial} onChange={e => setIssueSerial(e.target.value)} placeholder="VTX-000001" required /></label>
              <button type="submit" className="primary" disabled={adminActionBusy}>{adminActionBusy ? 'Выполняется...' : 'Выпустить карточку'}</button>
            </form>
          </div>}
          {user && isAdmin && <div className="panel analytics-panel">
            <div className="admin-head"><Users /><h2>{t('Статистика посещаемости')}</h2></div>
            {analytics.error ? <p className="muted">{analytics.error}. Выполните SQL-файл настройки аналитики в Supabase.</p> : <div className="admin-stats-grid">
              <Stat label="ВСЕ ПОСЕЩЕНИЯ" value={analytics.total} icon={<Users />} />
              <Stat label="СЕГОДНЯ" value={analytics.today} icon={<Home />} />
              <Stat label="ЗА 7 ДНЕЙ" value={analytics.week} icon={<CreditCard />} />
              <Stat label="УНИКАЛЬНЫЕ СЕССИИ · 7 ДНЕЙ" value={analytics.unique} icon={<UserRound />} />
            </div>}
            <button type="button" className="outline" onClick={loadAnalytics}>Обновить статистику</button>
            <p className="muted">Считаются посещения страниц и анонимные сессии. IP-адреса и личные данные посетителей не сохраняются.</p>
          </div>}
          {user && isAdmin && <div className="panel language-admin">
            <div className="admin-head"><Sparkles /><h2>{t('Языки сайта')}</h2></div>
            <p className="muted">Доступные языки интерфейса. Посетитель может выбрать язык в верхней панели; выбор сохраняется на его устройстве.</p>
            <div className="language-options">{[['uk','Українська'],['ru','Русский'],['en','English'],['de','Deutsch'],['fr','Français']].map(([code,name]) => <span className="language-chip" key={code}>{name}</span>)}</div>
          </div>}
          {user && isAdmin && adminData.map(table => {
            const columns = table.rows.length ? Object.keys(table.rows[0]) : []
            return <div className="panel" key={table.name}>
              <h3>{table.label}</h3>
              {table.error
                ? <p className="muted">Ошибка загрузки: {table.error}</p>
                : table.rows.length === 0
                  ? <p className="muted">Записей пока нет.</p>
                  : <>
                    <p className="muted">Показано записей: {table.rows.length} (максимум 50)</p>
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '520px', fontSize: '11px', textAlign: 'left' }}>
                        <thead><tr>
                          {columns.map(column => <th key={column} style={{ padding: '9px', borderBottom: '1px solid #51416f', color: '#27e5d2', whiteSpace: 'nowrap' }}>{column}</th>)}
                          <th style={{ padding: '9px', borderBottom: '1px solid #51416f', color: '#27e5d2' }}>Действия</th>
                        </tr></thead>
                        <tbody>
                          {table.rows.map((row, rowIndex) => <tr key={row.id || rowIndex}>
                            {columns.map(column => {
                              const value = row[column]
                              const display = value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)
                              return <td key={column} style={{ padding: '9px', borderBottom: '1px solid #252438', verticalAlign: 'top', maxWidth: '260px', overflowWrap: 'anywhere' }}>{display}</td>
                            })}
                            <td style={{ padding: '9px', borderBottom: '1px solid #252438', whiteSpace: 'nowrap' }}>
                              {table.name === 'user_accounts' && <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_set_user_block', { p_user_id: row.user_id, p_blocked: !row.is_blocked, p_reason: row.is_blocked ? null : 'Блокировка администратором' }, row.is_blocked ? 'Аккаунт разблокирован.' : 'Аккаунт заблокирован.')}>{row.is_blocked ? 'Разблокировать' : 'Заблокировать'}</button>}
                              {table.name === 'complaints' && row.status !== 'resolved' && <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_resolve_complaint', { p_complaint_id: row.id }, 'Жалоба отмечена как рассмотренная.')}>Рассмотреть</button>}
                              {table.name === 'disputes' && row.status !== 'resolved' && <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_resolve_dispute', { p_dispute_id: row.id, p_resolution: 'Решено администратором VORTEXCARDS' }, 'Спор закрыт. Решение записано.')}>Закрыть спор</button>}
                              {table.name === 'buyback_requests' && !['approved','rejected'].includes(row.status) && <>
                                <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_review_buyback', { p_request_id: row.id, p_approved: true, p_note: 'Заявка одобрена. Выплата не произведена.' }, 'Заявка на выкуп одобрена без проведения выплаты.')}>Одобрить</button>
                                <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_review_buyback', { p_request_id: row.id, p_approved: false, p_note: 'Заявка отклонена администратором.' }, 'Заявка на выкуп отклонена.')}>Отклонить</button>
                              </>}
                              {table.name === 'card_inventory' && row.status !== 'sold' && <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_set_card_retired', { p_card_id: row.id, p_retired: row.status !== 'retired' }, row.status === 'retired' ? 'Карточка восстановлена.' : 'Карточка выведена из обращения.')}>{row.status === 'retired' ? 'Восстановить' : 'Вывести из обращения'}</button>}
                              {table.name === 'market_listings' && row.status === 'active' && <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_cancel_listing', { p_listing_id: row.id }, 'Объявление снято с продажи.')}>Снять с продажи</button>}
                              {table.name === 'crypto_deposit_requests' && ['pending','detected','confirming'].includes(row.status) && <>
                                <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_review_deposit', { p_request_id: row.id, p_status: 'confirming', p_note: 'Проверяется подтверждение транзакции в сети. Средства не зачислены.' }, 'Заявка переведена на проверку сети.')}>Проверить</button>
                                <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_review_deposit', { p_request_id: row.id, p_status: 'rejected', p_note: 'Отклонено администратором после проверки.' }, 'Заявка на пополнение отклонена.')}>Отклонить</button>
                              </>}
                              {table.name === 'crypto_withdrawal_requests' && ['pending','under_review'].includes(row.status) && <>
                                {row.status === 'pending' && <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_review_withdrawal', { p_request_id: row.id, p_status: 'under_review', p_note: 'Заявка взята на проверку. Выплата не отправлена.' }, 'Заявка взята на проверку; выплата не отправлена.')}>На проверку</button>}
                                <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_review_withdrawal', { p_request_id: row.id, p_status: 'rejected', p_note: 'Отклонено администратором.' }, 'Заявка на вывод отклонена.')}>Отклонить</button>
                              </>}
                              {table.name === 'exchange_requests' && ['pending','quoted'].includes(row.status) && <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_reject_exchange', { p_request_id: row.id, p_note: 'Обмен отклонён администратором.' }, 'Заявка на обмен отклонена.')}>Отклонить</button>}
                            </td>
                          </tr>)}
                        </tbody>
                      </table>
                    </div>
                  </>}
            </div>
          })}
          {user && isAdmin && adminDataLoading && adminData.length === 0 && <p className="muted">Загружаем таблицы базы данных...</p>}
        </div>}

        {pushPromptOpen && user && <div className="push-consent-backdrop" role="dialog" aria-modal="true" aria-labelledby="push-consent-title">
          <section className="push-consent-panel">
            <div className="push-consent-icon">♢</div>
            <h2 id="push-consent-title">Разрешить уведомления VORTEXCARDS?</h2>
            <p>Будем присылать важные сообщения о вашем аккаунте и работе платформы. Вы сможете в любой момент отключить их в настройках профиля.</p>
            <button type="button" className="primary full" disabled={pushBusy} onClick={() => savePushPreference(true)}>{pushBusy ? 'Сохраняем...' : 'Согласен получать'}</button>
            <button type="button" className="outline full" disabled={pushBusy} onClick={() => savePushPreference(false)}>Не согласен</button>
          </section>
        </div>}
        <footer>© 2026 VORTEX CARDS <span>Digital card platform</span></footer>
      </main>
    </div>
  </div>
  return translateTree(page, language, translations)
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from(rawData, character => character.charCodeAt(0))
}

function translateTree(node, language, translations) {
  if (node == null || typeof node === 'boolean') return node
  if (typeof node === 'string') {
    const trimmed = node.trim()
    const dictionary = translations[language] || {}
    const translated = dictionary[trimmed]
    if (translated) return node.replace(trimmed, translated)
    return Object.keys(dictionary).sort((a, b) => b.length - a.length).reduce((result, key) => result.includes(key) ? result.replaceAll(key, dictionary[key]) : result, node)
  }
  if (Array.isArray(node)) return node.map(child => translateTree(child, language, translations))
  if (!React.isValidElement(node)) return node
  const props = { ...node.props }
  for (const key of ['placeholder', 'aria-label', 'title', 'label', 'desc']) {
    if (typeof props[key] === 'string') props[key] = translateTree(props[key], language, translations)
  }
  if (props.children !== undefined) props.children = translateTree(props.children, language, translations)
  return React.cloneElement(node, props)
}

function Stat({ label, value, icon }) {
  return <div className="stat">
    <div className="stat-icon">{icon}</div>
    <div><span>{label}</span><b>{value}</b></div>
  </div>
}

function Quick({ icon, title, desc, click }) {
  return <button type="button" className="quick" onClick={click}>
    <div className="quick-icon">{icon}</div>
    <div><b>{title}</b><span>{desc}</span></div>
    <span className="arrow">↗</span>
  </button>
}

createRoot(document.getElementById('root')).render(<App />)
              
