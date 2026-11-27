import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import {
  Home, CreditCard, Users, Store, UserRound, Shield, ArrowLeftRight,
  Plus, Copy, Menu, X, Download, Wallet, Sparkles, Eye, Mail, Gem, Trophy, History, Layers, Search
} from 'lucide-react'
import './style.css'
import WantedSection from './WantedSection.jsx'

try { sessionStorage.removeItem('vortex-startup-reload') } catch (_) {}

const supabaseUrl = 'https://rrpjzfaqmkrawvtvpqfm.supabase.co'
const supabaseKey = 'sb_publishable_giHUqFHf-WWatUkS7AqNPA_UVkgA1ps'
// Keep website and installed PWA sessions separate on the same device.
const isStandaloneApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
const authStorageKey = isStandaloneApp ? 'vortex-unit-installed-app-auth' : 'sb-rrpjzfaqmkrawvtvpqfm-auth-token'
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { storageKey: authStorageKey } })

function App() {
  const [tab, setTab] = useState('home')
  const [rareView, setRareView] = useState('gallery')
  const [language, setLanguage] = useState(() => localStorage.getItem('vortex-language') || 'ru')
  const [analytics, setAnalytics] = useState({ total: 0, today: 0, week: 0, unique: 0, error: '' })
  const [menu, setMenu] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [publicAuthOpen, setPublicAuthOpen] = useState(false)
  const [publicInfoPage, setPublicInfoPage] = useState('')
  const [publicFooterOpen, setPublicFooterOpen] = useState('')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushPromptOpen, setPushPromptOpen] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const pushServerReady = Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [usernameBusy, setUsernameBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [cards, setCards] = useState(1)
  const [listings, setListings] = useState([])
  const [listingPage, setListingPage] = useState(1)
  const [listingCount, setListingCount] = useState(0)
  const [selectedListing, setSelectedListing] = useState(null)
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketError, setMarketError] = useState('')
  const [price, setPrice] = useState('')
  const [assetCode, setAssetCode] = useState('')
  const [referrals] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminData, setAdminData] = useState([])
  const [adminDataLoading, setAdminDataLoading] = useState(false)
  const [financial, setFinancial] = useState({ ledger: [], cards: [], deposits: [], withdrawals: [], exchanges: [], error: '', loading: false })
  const [historyTab, setHistoryTab] = useState('deposits')
  const [transferEmail, setTransferEmail] = useState('')
  const [transferQuantity, setTransferQuantity] = useState('1')
  const [adminActionBusy, setAdminActionBusy] = useState(false)
  const [issueOwnerId, setIssueOwnerId] = useState('')
  const [issueSerial, setIssueSerial] = useState('')

  const adminTables = [
    { name: 'user_accounts', label: 'Аккаунты пользователей' },
    { name: 'card_balances', label: 'Баланс юнитов' },
    { name: 'market_listings', label: 'Объявления маркетплейса' },
    { name: 'complaints', label: 'Жалобы' },
    { name: 'disputes', label: 'Спорные сделки' },
    { name: 'buyback_requests', label: 'Заявки на выкуп' },
    { name: 'admin_audit_log', label: 'Журнал действий администратора' },
    { name: 'card_inventory', label: 'Реестр выпущенных юнитов' },
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
      setNotice('Не удалось передать юниты: ' + (error.message || 'ошибка операции'))
    } finally { setBusy(false) }
  }

  async function issueCard(e) {
    e.preventDefault()
    if (!isAdmin || !issueOwnerId.trim() || !issueSerial.trim()) return
    await runAdminAction('admin_issue_card', { p_owner_id: issueOwnerId.trim(), p_serial_number: issueSerial.trim() }, 'Юнит выпущен и закреплён за пользователем.')
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

  async function loadMarketplace(page = listingPage) {
    const pageSize = 5
    setMarketLoading(true)
    setMarketError('')
    try {
      const from = (page - 1) * pageSize
      const { data, error, count } = await supabase
        .from('market_listings')
        .select('id, seller_id, quantity, price, status, created_at', { count: 'exact' })
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1)
      if (error) throw error
      setListingCount(count || 0)
      const listingIds = (data || []).map(item => item.id)
      const [currencyResult, inventoryResult] = await Promise.all([
        listingIds.length
          ? supabase.from('market_listing_currencies').select('listing_id, asset_code').in('listing_id', listingIds)
          : Promise.resolve({ data: [], error: null }),
        listingIds.length
          ? supabase.from('card_inventory').select('listing_id, serial_number').in('listing_id', listingIds)
          : Promise.resolve({ data: [], error: null })
      ])
      if (currencyResult.error) throw currencyResult.error
      if (inventoryResult.error) throw inventoryResult.error
      const currencyByListing = Object.fromEntries((currencyResult.data || []).map(row => [row.listing_id, row.asset_code]))
      const serialsByListing = {}
      ;(inventoryResult.data || []).forEach(row => {
        if (!serialsByListing[row.listing_id]) serialsByListing[row.listing_id] = []
        serialsByListing[row.listing_id].push(row.serial_number)
      })
      const pricedListings = (data || []).filter(item => currencyByListing[item.id])
      const sellerIds = [...new Set(pricedListings.map(item => item.seller_id).filter(Boolean))]
      let profilesById = {}
      if (sellerIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', sellerIds)
        if (profilesError) console.warn('Не удалось загрузить аватары продавцов:', profilesError.message)
        profilesById = Object.fromEntries((profiles || []).map(profile => [profile.user_id, profile]))
      }
      setListings(pricedListings.map(item => {
        const profile = profilesById[item.seller_id] || {}
        const isMine = item.seller_id === user?.id
        return {
          id: item.id,
          sellerId: item.seller_id,
          isMine,
          seller: profile.username || (isMine ? (user?.user_metadata?.username || 'Вы') : 'Пользователь'),
          avatarUrl: profile.avatar_url || (isMine ? user?.user_metadata?.avatar_url : '') || '',
          qty: Number(item.quantity || 0),
          price: Number(item.price || 0),
          assetCode: currencyByListing[item.id],
          createdAt: item.created_at,
          serialNumbers: serialsByListing[item.id] || []
        }
      }))
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
    if (tab === 'market') loadMarketplace(listingPage)
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

  // Global Wanted chat notifications: keep active on every app tab, not only WantedSection.
  useEffect(() => {
    if (!user?.id) return
    let active = true
    const channel = supabase.channel('vortex-global-wanted-notices-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'card_request_messages' }, async payload => {
        const message = payload.new
        if (!message?.response_id || message.sender_id === user.id) return
        try {
          const { data: response, error: responseError } = await supabase
            .from('card_request_responses')
            .select('id, request_id, responder_id')
            .eq('id', message.response_id)
            .maybeSingle()
          if (responseError) throw responseError
          if (!response) return
          const { data: request, error: requestError } = await supabase
            .from('card_requests')
            .select('id, card_number, requester_id')
            .eq('id', response.request_id)
            .maybeSingle()
          if (requestError) throw requestError
          if (!request) return
          const recipientId = message.sender_id === response.responder_id
            ? request.requester_id
            : response.responder_id
          if (!active || recipientId !== user.id) return
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('username')
            .eq('user_id', message.sender_id)
            .maybeSingle()
          if (!active) return
          const labels = {
            ru: { title: 'Новое сообщение', card: 'Карточка №' },
            uk: { title: 'Нове повідомлення', card: 'Картка №' },
            en: { title: 'New message', card: 'Card #' },
            de: { title: 'Neue Nachricht', card: 'Karte Nr.' },
            fr: { title: 'Nouveau message', card: 'Carte n°' }
          }
          const words = labels[language] || labels.ru
          const sender = profile?.username || (language === 'en' ? 'User' : language === 'de' ? 'Benutzer' : language === 'fr' ? 'Utilisateur' : language === 'uk' ? 'Користувач' : 'Пользователь')
          const body = words.card + request.card_number + ' · ' + sender
          setNotice(words.title + ': ' + body)
          if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
            new Notification('VORTEX UNIT · ' + words.title, { body, tag: 'vortex-wanted-' + message.id })
          }
        } catch (error) {
          console.error('Ошибка уведомления о сообщении VORTEX:', error)
        }
      })
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Не удалось подключить уведомления VORTEX Realtime:', status, error)
        }
      })
    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [user?.id, language])

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
    setUsername(user?.user_metadata?.username || '')
  }, [user?.id, user?.user_metadata?.username])

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

  async function saveUsername(e) {
    e.preventDefault()
    if (!user || usernameBusy) return
    const clean = username.trim()
    if (clean.length < 2 || clean.length > 24) {
      setNotice('Имя пользователя должно содержать от 2 до 24 символов.')
      return
    }
    if (!/^[\p{L}\p{N}_ .-]+$/u.test(clean)) {
      setNotice('Используйте буквы, цифры, пробел, точку, дефис или подчёркивание.')
      return
    }
    setUsernameBusy(true)
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { username: clean } })
      if (error) throw error
      const { error: profileError } = await supabase.from('user_profiles').upsert({
        user_id: user.id, username: clean,
        avatar_url: data.user.user_metadata?.avatar_url || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      if (profileError) throw profileError
      setUser(data.user)
      setNotice('Имя пользователя сохранено.')
    } catch (error) {
      setNotice('Не удалось сохранить имя: ' + (error.message || 'ошибка'))
    } finally {
      setUsernameBusy(false)
    }
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !user || avatarBusy) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setNotice('Выберите изображение JPG, PNG или WEBP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice('Размер изображения не должен превышать 5 МБ.')
      return
    }
    setAvatarBusy(true)
    try {
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const path = user.id + '/avatar.' + extension
      const oldPath = user.user_metadata?.avatar_path
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600', upsert: true, contentType: file.type
      })
      if (uploadError) throw uploadError
      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatarUrl = publicData.publicUrl + '?v=' + Date.now()
      const { data, error } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl, avatar_path: path } })
      if (error) throw error
      const { error: profileError } = await supabase.from('user_profiles').upsert({
        user_id: user.id, username: data.user.user_metadata?.username || username || null,
        avatar_url: avatarUrl, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      if (profileError) throw profileError
      if (oldPath && oldPath !== path) await supabase.storage.from('avatars').remove([oldPath])
      setUser(data.user)
      setNotice('Аватар успешно обновлён.')
      if (tab === 'market') await loadMarketplace()
    } catch (error) {
      setNotice('Не удалось загрузить аватар: ' + (error.message || 'ошибка'))
    } finally {
      setAvatarBusy(false)
    }
  }

  async function removeAvatar() {
    if (!user || avatarBusy || !user.user_metadata?.avatar_path) return
    setAvatarBusy(true)
    try {
      const path = user.user_metadata.avatar_path
      const { error: removeError } = await supabase.storage.from('avatars').remove([path])
      if (removeError) throw removeError
      const { data, error } = await supabase.auth.updateUser({ data: { avatar_url: null, avatar_path: null } })
      if (error) throw error
      const { error: profileError } = await supabase.from('user_profiles').upsert({
        user_id: user.id, username: data.user.user_metadata?.username || username || null,
        avatar_url: null, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      if (profileError) throw profileError
      setUser(data.user)
      setNotice('Аватар удалён.')
      if (tab === 'market') await loadMarketplace()
    } catch (error) {
      setNotice('Не удалось удалить аватар: ' + (error.message || 'ошибка'))
    } finally {
      setAvatarBusy(false)
    }
  }

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
    const installedHandler = () => { setIsInstalled(true); setInstallPrompt(null) }
    window.addEventListener('appinstalled', installedHandler)
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)

    if ('serviceWorker' in navigator) {
      let refreshingAfterUpdate = false
      const handleControllerChange = () => {
        if (refreshingAfterUpdate) return
        refreshingAfterUpdate = true
        window.location.reload()
      }
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
        .then(registration => {
          // Проверяем новую версию при каждом открытии установленного приложения.
          registration.update().catch(error => console.warn('Не удалось проверить обновление приложения:', error))
        })
        .catch(error => console.error('Не удалось зарегистрировать Service Worker:', error))

      const checkAppUpdate = () => {
        if (document.visibilityState === 'visible') {
          navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
            .then(registration => registration?.update())
            .catch(error => console.warn('Не удалось проверить обновление приложения:', error))
        }
      }
      document.addEventListener('visibilitychange', checkAppUpdate)
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
        setAuthLoading(false)
      })
      .catch(error => {
        console.error('Ошибка получения сессии:', error)
        setNotice('Не удалось проверить вход: ' + (error.message || 'ошибка соединения'))
        setAuthLoading(false)
      })

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setAuthLoading(false)
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset')
        setPassword('')
        setPasswordConfirm('')
        setNotice('Введите новый пароль для аккаунта.')
        setTab('profile')
        setPublicAuthOpen(true)
      }
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
      authListener.subscription.unsubscribe()
    }
  }, [])

  const translations = {
  "uk": {
    "Назад к объявлениям": "Назад до оголошень",
    "Активное объявление": "Активне оголошення",
    "Предложение VORTEX UNIT": "Пропозиція VORTEX UNIT",
    "Подробная информация об объявлении": "Докладна інформація про оголошення",
    "Продавец": "Продавець",
    "Количество юнитов": "Кількість юнітів",
    "Цена за один юнит": "Ціна за один юніт",
    "Стоимость всего предложения": "Вартість усієї пропозиції",
    "Дата размещения": "Дата розміщення",
    "Номера юнитов": "Номери юнітів",
    "Будут показаны после синхронизации реестра": "Будуть показані після синхронізації реєстру",
    "Объявление размещено пользователем": "Оголошення розміщене користувачем",
    "Покупка и расчёты станут доступны после подключения безопасного механизма сделки.": "Купівля та розрахунки стануть доступні після підключення безпечного механізму угоди.",
    "Подробнее": "Детальніше",
    "Страницы объявлений": "Сторінки оголошень",
    "Страница": "Сторінка",
    "из": "з",
    "Далее": "Далі",
    "Удалить объявление": "Видалити оголошення",
    "Удалить это объявление? Юниты вернутся в вашу коллекцию.": "Видалити це оголошення? Юніти повернуться до вашої колекції.",
    "Объявление удалено. Юниты возвращены в вашу коллекцию.": "Оголошення видалено. Юніти повернено до вашої колекції.",
    "Не удалось удалить объявление: ": "Не вдалося видалити оголошення: ",
    "Обзор": "Огляд",
    "Юниты": "Юніти",
    "Маркетплейс": "Маркетплейс",
    "Ищу карточку": "Шукаю картку",
    "Размещайте запросы на карточки, которых не хватает в вашей коллекции. Другие участники смогут откликнуться, а условия сделки вы обсудите напрямую.": "Публікуйте запити на картки, яких бракує у вашій колекції. Інші учасники зможуть відгукнутися, а умови угоди ви обговорите напряму.",
    "Создайте объявление": "Створіть оголошення",
    "Укажите номер карточки, количество и желаемую цену.": "Вкажіть номер картки, кількість і бажану ціну.",
    "Договоритесь с продавцом": "Домовтеся з продавцем",
    "Обсудите наличие и цену в личной переписке VORTEX UNIT.": "Обговоріть наявність і ціну в особистому листуванні VORTEX UNIT.",
    "Завершите сделку на маркетплейсе": "Завершіть угоду на маркетплейсі",
    "Продавец размещает карточку на маркетплейсе. Оплата и передача проходят только там.": "Продавець розміщує картку на маркетплейсі. Оплата й передавання відбуваються лише там.",
    "Раздел готовится к запуску": "Розділ готується до запуску",
    "Форма объявлений, список запросов и личные сообщения будут подключены после настройки защищённого хранения объявлений и чатов. Сейчас публикация запросов и переписка ещё не работают.": "Форму оголошень, список запитів і особисті повідомлення буде підключено після налаштування захищеного зберігання оголошень і чатів. Зараз публікація запитів і листування ще не працюють.",
    "Функция пока не активна": "Функція поки не активна",
    "Важно: договорённости можно будет обсуждать в чате, но продавать и покупать карточки разрешено только через маркетплейс VORTEX UNIT.": "Важливо: домовленості можна буде обговорювати в чаті, але продавати й купувати картки дозволено лише через маркетплейс VORTEX UNIT.",
    "Рефералы": "Реферали",
    "Профиль": "Профіль",
    "Поддержка": "Підтримка",
    "VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО": "VORTEX · СПІЛЬНОТА КОЛЕКЦІОНЕРІВ",
    "Администрирование": "Адміністрування",
    "МЕНЮ": "МЕНЮ",
    "Установить": "Встановити",
    "Скачать приложение VORTEX UNIT": "Завантажити застосунок VORTEX UNIT",
    "Установите приложение на устройство": "Встановіть застосунок на свій пристрій",
    "Откройте меню браузера и выберите «Добавить на главный экран» или «Установить приложение».": "Відкрийте меню браузера та виберіть «Додати на головний екран» або «Встановити застосунок».",
    "Приложение уже установлено": "Застосунок уже встановлено",
    "Установка приложения запущена": "Встановлення застосунку розпочато",
    "VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО": "VORTEX · СПІЛЬНОТА КОЛЕКЦІОНЕРІВ",
    "Вход или регистрация": "Вхід або реєстрація",
    "Панель администратора": "Панель адміністратора",
    "Статистика посещаемости": "Статистика відвідуваності",
    "Языки сайта": "Мови сайту",
    "Администратор": "Адміністратор",
    "Закрыть": "Закрити",
    "Одна единица.": "Один юніт.",
    "Своя ценность.": "Власна цінність.",
    "Управляй юнитами, приглашай друзей и торгуй на P2P-маркетплейсе VORTEX UNIT.": "Керуй юнітами, запрошуй друзів і торгуй на P2P-маркетплейсі VORTEX UNIT.",
    "Открыть маркетплейс": "Відкрити маркетплейс",
    "МОИ ЮНИТЫ": "МОЇ ЮНІТИ",
    "РЕФЕРАЛЫ": "РЕФЕРАЛИ",
    "БЫСТРЫЕ ДЕЙСТВИЯ": "ШВИДКІ ДІЇ",
    "Мои юниты": "Мої юніти",
    "Баланс и переводы": "Баланс і перекази",
    "P2P-рынок": "P2P-ринок",
    "Покупка и продажа": "Купівля та продаж",
    "Пригласить друга": "Запросити друга",
    "Получить юнит": "Отримати юнит",
    "ДОСТУПНЫЙ БАЛАНС": "ДОСТУПНИЙ БАЛАНС",
    "Передать юниты": "Передати юніти",
    "Выполняется...": "Виконується...",
    "Перевести юниты другому пользователю": "Переказати юніти іншому користувачу",
    "Укажите email получателя и количество свободных юнитов. Юниты, выставленные на маркетплейс, передать нельзя.": "Вкажіть email отримувача та кількість вільних юнітів. Юніти, виставлені на маркетплейсі, передати не можна.",
    "В демонстрационном режиме переводы не выполняются.": "У демонстраційному режимі перекази не виконуються.",
    "Email или ID получателя": "Email або ID отримувача",
    "Количество юнитов": "Кількість юнитів",
    "Передать": "Передати",
    "P2P маркетплейс": "P2P маркетплейс",
    "Пользователи устанавливают собственные цены.": "Користувачі встановлюють власні ціни.",
    "Создать объявление": "Створити оголошення",
    "Количество": "Кількість",
    "Цена за юнит": "Ціна за юнит",
    "Выставить": "Виставити",
    "АКТИВНЫЕ ОБЪЯВЛЕНИЯ": "АКТИВНІ ОГОЛОШЕННЯ",
    "юнитов доступно": "юнитів доступно",
    "за юнит": "за юнит",
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
    "Ваши юниты, зарегистрированные в реестре VORTEX UNIT.": "Ваші юніти, зареєстровані в реєстрі VORTEX.",
    "карточек": "юнитів",
    "Пока нет юнитов": "Поки немає юнитів",
    "Когда юниты будут выпущены и закреплены за вашим аккаунтом, они появятся здесь.": "Коли юніти буде випущено та закріплено за вашим обліковим записом, вони з’являться тут.",
    "Обновить юниты": "Оновити юніти",
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

    "Для безопасных переводов требуется подключённая серверная операция Supabase.": "Для безпечних переказів потрібна підключена серверна операція Supabase.",
    "Показаны демонстрационные объявления. Реальные расчёты, резервирование юнитов и удержание комиссии пока не подключены.": "Показано демонстраційні оголошення. Реальні розрахунки, резервування юнитів та утримання комісії поки не підключені.",
    "Пригласивший получает 1 дополнительный юнит после подтверждённой регистрации реферала. Новый пользователь получает стартовый юнит.": "Той, хто запросив, отримує 1 додатковий юніт після підтвердженої реєстрації реферала. Новий користувач отримує стартовий юніт.",
    "Ссылка скопирована": "Посилання скопійовано",
    "Не удалось скопировать ссылку": "Не вдалося скопіювати посилання",
    "Загрузка данных...": "Завантаження даних...",
    "Загрузка юнитов...": "Завантаження юнитів...",
    "Юниты пока не удалось загрузить.": "Не вдалося завантажити юніти.",
    "Ошибка загрузки:": "Помилка завантаження:",
    "Сумма не указана": "Суму не вказано",
    "Показано записей:": "Показано записів:",
    "юнитов доступно": "юнитів доступно",
    "за юнит": "за юнит",
    "VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО": "VORTEX · СПІЛЬНОТА КОЛЕКЦІОНЕРІВ",
    "Зарегистрироваться": "Зареєструватися",
    "VORTEX UNIT — платформа уникальных цифровых юнитов и NFT. Создай аккаунт, управляй своими юнитами и открывай новые возможности.": "VORTEX UNIT — цифрова платформа юнитів. Створіть обліковий запис, керуйте своїми юнітами та відкривайте можливості платформи.",
    "У меня уже есть аккаунт": "У мене вже є обліковий запис",
    "Юниты и NFT": "Цифрові юніти",
    "Создавай коллекции и управляй уникальными цифровыми юнитами.": "Особистий кабінет і керування юнітами після входу.",
    "P2P-маркетплейс": "P2P-маркетплейс",
    "Просмотр предложений и торговые функции для пользователей.": "Перегляд пропозицій і торгові функції для користувачів.",
    "Сообщество": "Спільнота",
    "Приглашайте друзей и развивайтесь вместе с VORTEX.": "Запрошуйте друзів і розвивайтеся разом із VORTEX.",
    "Регистрация VORTEX UNIT": "Реєстрація VORTEX UNIT",
    "Восстановление пароля": "Відновлення пароля",
    "Новый пароль": "Новий пароль",
    "Вход в аккаунт": "Вхід до облікового запису",
    "Отправить ссылку": "Надіслати посилання",
    "Вернуться ко входу": "Повернутися до входу",
    "Повторите новый пароль": "Повторіть новий пароль",
    "Сохранить новый пароль": "Зберегти новий пароль",
    "Отправляем...": "Надсилаємо...",
    "Сохраняем...": "Зберігаємо...",
    "Забыли пароль?": "Забули пароль?",
    "Уже есть аккаунт? Войти": "Вже маєте обліковий запис? Увійти",
    "Нет аккаунта? Зарегистрироваться": "Немає облікового запису? Зареєструватися",
    "Email получателя": "Email отримувача",
    "Передать можно только свободные юниты. Юниты, выставленные на маркетплейс, заблокированы для перевода до снятия объявления с продажи.": "Передавати можна лише вільні юніти. Юніти, виставлені на маркетплейс, заблоковані для переказу, доки оголошення не буде знято з продажу.",
    "Перевести другому пользователю": "Переказати іншому користувачу",
    "Данные загружаются из Supabase. Балансы рассчитываются по записям финансового журнала; заявки сами по себе не означают поступление или выплату средств.": "Дані завантажуються із Supabase. Баланси розраховуються за записами фінансового журналу; заявки самі по собі не означають надходження чи виплату коштів.",
    "Имя пользователя (псевдоним)": "Ім’я користувача (псевдонім)",
    "Например, VORTEX": "Наприклад, VORTEX",
    "Придумайте любое имя. Не указывайте здесь email или настоящее имя, если хотите сохранить приватность.": "Придумайте будь-яке ім’я. Не вказуйте тут email або справжнє ім’я, якщо хочете зберегти приватність.",
    "Сохранить имя пользователя": "Зберегти ім’я користувача",
    "Email аккаунта (виден только вам):": "Email облікового запису (видно лише вам):",
    "Push-уведомления": "Push-сповіщення",
    "Получать важные сообщения VORTEX UNIT на этом устройстве.": "Отримувати важливі повідомлення VORTEX UNIT на цьому пристрої.",
    "Разрешение сохраняется. Сервер отправки будет подключён отдельно.": "Дозвіл зберігається. Сервер надсилання буде підключено окремо.",
    "Получать push-уведомления": "Отримувати push-сповіщення",
    "Удалить аккаунт": "Видалити обліковий запис",
    "Удалить аккаунт навсегда?": "Видалити обліковий запис назавжди?",
    "Будет удалена ваша учётная запись VORTEX UNIT и связанные с ней данные. Доступ к аккаунту с сайта и установленного приложения прекратится. Это действие нельзя отменить.": "Ваш обліковий запис VORTEX UNIT і пов’язані з ним дані буде видалено. Доступ до облікового запису із сайту та встановленого застосунку буде припинено. Цю дію неможливо скасувати.",
    "Если у вас есть юниты, объявления или финансовая история, они также могут быть удалены вместе с аккаунтом.": "Ваші юніти, оголошення та фінансова історія також можуть бути видалені разом з обліковим записом.",
    "Для подтверждения напишите УДАЛИТЬ": "Для підтвердження введіть ВИДАЛИТИ",
    "Отмена": "Скасувати",
    "Удаляем...": "Видаляємо...",
    "Удалить навсегда": "Видалити назавжди",
    "Укажите email, который использовали при регистрации. Мы отправим на него ссылку для восстановления доступа.": "Вкажіть email, який ви використовували під час реєстрації. Ми надішлемо на нього посилання для відновлення доступу.",
    "Придумайте новый пароль для своего аккаунта.": "Придумайте новий пароль для свого облікового запису.",
    "Скрыть пароль": "Приховати пароль",
    "Показать пароль": "Показати пароль",
      "Редкие карточки": "Рідкісні картки",
    "COLLECTOR ARCHIVE": "КОЛЕКЦІЙНИЙ АРХІВ",
    "Коллекционные номера, ограниченные тиражи и история карточек VORTEX UNIT.": "Колекційні номери, обмежені тиражі та історія карток VORTEX UNIT.",
    "Резерв основателей": "Резерв засновників",
    "Ограниченные серии": "Обмежені серії",
    "Галерея": "Галерея",
    "Моя коллекция": "Моя колекція",
    "Комплекты": "Комплекти",
    "История": "Історія",
    "Категории редкости": "Категорії рідкісності",
    "Предварительная структура коллекционного архива": "Попередня структура колекційного архіву",
    "Легендарные": "Легендарні",
    "Элитные номера": "Елітні номери",
    "Коллекционные номера": "Колекційні номери",
    "Специальные серии": "Спеціальні серії",
    "Самые редкие первые номера. В дальнейшем могут быть переданы пользователям.": "Найрідкісніші перші номери. Надалі можуть бути передані користувачам.",
    "Особые карточки с отдельными ограниченными тиражами.": "Особливі картки з окремими обмеженими тиражами.",
    "Редкость определяется установленным тиражом каждого номера.": "Рідкісність визначається встановленим тиражем кожного номера.",
    "Отдельные тематические выпуски с собственными правилами и тиражами.": "Окремі тематичні випуски з власними правилами та тиражами.",
    "Правило тиража": "Правило тиражу",
    "У каждого номера заранее задаётся максимальное количество экземпляров. После утверждения тираж не увеличивается. Одинаковые номера могут существовать в пределах этого тиража.": "Для кожного номера заздалегідь встановлюється максимальна кількість примірників. Після затвердження тираж не збільшується. Однакові номери можуть існувати в межах цього тиражу.",
    "Здесь будут отображаться редкие карточки, которыми владеет пользователь. Подключение реестра карточек будет выполнено отдельным этапом.": "Тут відображатимуться рідкісні картки, якими володіє користувач. Реєстр карток буде підключено окремим етапом.",
    "Здесь появятся собранные наборы, например из трёх заданных номеров. Условия комплектов и возможного выкупа будут опубликованы до запуска.": "Тут з’являться зібрані набори, наприклад із трьох визначених номерів. Умови комплектів і можливого викупу буде оприлюднено до запуску.",
    "Здесь будет доступна история выпуска и смены владельцев каждой карточки после подключения реестра.": "Тут буде доступна історія випуску та зміни власників кожної картки після підключення реєстру.",
    "Административное управление резервом 001–010, тиражами и передачами будет добавлено в отдельную панель после утверждения правил выпуска.": "Адміністративне керування резервом 001–010, тиражами та передаванням буде додано до окремої панелі після затвердження правил випуску.",
    "Раздел создан как коллекционный каталог. Продажа, аукцион и денежный выкуп здесь пока не активны.": "Розділ створено як колекційний каталог. Продаж, аукціон і грошовий викуп тут поки не активні.",
    "Разделы редких карточек": "Розділи рідкісних карток",

    "Настройки профиля": "Налаштування профілю",
    "Назад": "Назад",
    "Пользователь": "Користувач",
    "Фото профиля": "Фото профілю",
    "Загрузите изображение JPG, PNG или WEBP до 5 МБ. Его увидят другие пользователи.": "Завантажте зображення JPG, PNG або WEBP до 5 МБ. Його побачать інші користувачі.",
    "Загружаем...": "Завантаження...",
    "Изменить фото": "Змінити фото",
    "Загрузить аватар": "Завантажити аватар",
    "Удалить": "Видалити",
    "Аватар профиля": "Аватар профілю",
    "История операций": "Історія операцій",
    "Пополнения": "Поповнення",
    "Выводы": "Виведення",
    "Обмен VTX": "Обмін VTX",
    "Пополнение": "Поповнення",
    "Вывод": "Виведення",
    "Пополнений пока нет.": "Поповнень поки немає.",
    "Выводов пока нет.": "Виведень поки немає.",
    "Обменов пока нет.": "Обмінів поки немає.",
    "Статус": "Статус",
    "Комиссия": "Комісія",
    "pending": "Очікує",
    "detected": "Виявлено",
    "confirming": "Підтверджується",
    "confirmed": "Підтверджено",
    "rejected": "Відхилено",
    "expired": "Термін дії минув",
    "under_review": "На перевірці",
    "approved": "Схвалено",
    "processing": "Обробляється",
    "completed": "Завершено",
    "cancelled": "Скасовано",
    "quoted": "Розраховано",
    "Запросы на недостающие карточки": "Запити на відсутні картки",
    "Коллекция и редкие серии": "Колекція та рідкісні серії",
    "Пригласить друга и награды": "Запросити друга й отримати винагороди",
    "Личные данные и настройки": "Особисті дані та налаштування",
    "Связаться со службой поддержки": "Зв’язатися зі службою підтримки",
    "Управление платформой": "Керування платформою",
  },
  "en": {
    "Назад к объявлениям": "Back to listings",
    "Активное объявление": "Active listing",
    "Предложение VORTEX UNIT": "VORTEX UNIT offer",
    "Подробная информация об объявлении": "Listing details",
    "Продавец": "Seller",
    "Количество юнитов": "Number of units",
    "Цена за один юнит": "Price per unit",
    "Стоимость всего предложения": "Total offer price",
    "Дата размещения": "Date posted",
    "Номера юнитов": "Unit numbers",
    "Будут показаны после синхронизации реестра": "Shown after registry synchronization",
    "Объявление размещено пользователем": "Listed by",
    "Покупка и расчёты станут доступны после подключения безопасного механизма сделки.": "Purchases and payments will be available after the secure transaction system is connected.",
    "Подробнее": "Details",
    "Страницы объявлений": "Listing pages",
    "Страница": "Page",
    "из": "of",
    "Далее": "Next",
    "Удалить объявление": "Delete listing",
    "Удалить это объявление? Юниты вернутся в вашу коллекцию.": "Delete this listing? The units will return to your collection.",
    "Объявление удалено. Юниты возвращены в вашу коллекцию.": "Listing deleted. The units have been returned to your collection.",
    "Не удалось удалить объявление: ": "Could not delete listing: ",
    "Обзор": "Overview",
    "Юниты": "Units",
    "Маркетплейс": "Marketplace",
    "Ищу карточку": "Looking for a card",
    "Размещайте запросы на карточки, которых не хватает в вашей коллекции. Другие участники смогут откликнуться, а условия сделки вы обсудите напрямую.": "Post requests for cards missing from your collection. Other members can respond and discuss the deal with you directly.",
    "Создайте объявление": "Create a request",
    "Укажите номер карточки, количество и желаемую цену.": "Enter the card number, quantity, and desired price.",
    "Договоритесь с продавцом": "Agree with the seller",
    "Обсудите наличие и цену в личной переписке VORTEX UNIT.": "Discuss availability and price in VORTEX UNIT private messages.",
    "Завершите сделку на маркетплейсе": "Complete the deal on the marketplace",
    "Продавец размещает карточку на маркетплейсе. Оплата и передача проходят только там.": "The seller lists the card on the marketplace. Payment and transfer take place there only.",
    "Раздел готовится к запуску": "Coming soon",
    "Форма объявлений, список запросов и личные сообщения будут подключены после настройки защищённого хранения объявлений и чатов. Сейчас публикация запросов и переписка ещё не работают.": "Request forms, the request board, and private messages will be enabled after secure storage for requests and chats is configured. Posting and messaging are not available yet.",
    "Функция пока не активна": "Not active yet",
    "Важно: договорённости можно будет обсуждать в чате, но продавать и покупать карточки разрешено только через маркетплейс VORTEX UNIT.": "Important: users may discuss terms in chat, but cards can only be bought and sold through the VORTEX UNIT marketplace.",
    "Рефералы": "Referrals",
    "Профиль": "Profile",
    "Поддержка": "Support",
    "VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО": "VORTEX · COLLECTOR COMMUNITY",
    "Администрирование": "Administration",
    "МЕНЮ": "MENU",
    "Установить": "Install",
    "Скачать приложение VORTEX UNIT": "Download the VORTEX UNIT app",
    "Установите приложение на устройство": "Install the app on your device",
    "Откройте меню браузера и выберите «Добавить на главный экран» или «Установить приложение».": "Open your browser menu and choose “Add to Home screen” or “Install app”.",
    "Приложение уже установлено": "The app is already installed",
    "Установка приложения запущена": "App installation started",
    "VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО": "VORTEX · COLLECTOR COMMUNITY",
    "Вход или регистрация": "Sign in or register",
    "Панель администратора": "Admin panel",
    "Статистика посещаемости": "Traffic statistics",
    "Языки сайта": "Website languages",
    "Администратор": "Administrator",
    "Закрыть": "Close",
    "Одна единица.": "One unit.",
    "Своя ценность.": "Its own value.",
    "Управляй юнитами, приглашай друзей и торгуй на P2P-маркетплейсе VORTEX UNIT.": "Manage units, invite friends, and trade on the VORTEX P2P marketplace.",
    "Открыть маркетплейс": "Open marketplace",
    "МОИ ЮНИТЫ": "MY UNITS",
    "РЕФЕРАЛЫ": "REFERRALS",
    "БЫСТРЫЕ ДЕЙСТВИЯ": "QUICK ACTIONS",
    "Мои юниты": "My units",
    "Баланс и переводы": "Balance and transfers",
    "P2P-рынок": "P2P market",
    "Покупка и продажа": "Buy and sell",
    "Пригласить друга": "Invite a friend",
    "Получить юнит": "Get a UNIT",
    "ДОСТУПНЫЙ БАЛАНС": "AVAILABLE BALANCE",
    "Передать юниты": "Transfer units",
    "Выполняется...": "Transferring...",
    "Перевести юниты другому пользователю": "Transfer units to another user",
    "Укажите email получателя и количество свободных юнитов. Юниты, выставленные на маркетплейс, передать нельзя.": "Enter the recipient’s email and the number of available units. Units listed on the marketplace cannot be transferred.",
    "В демонстрационном режиме переводы не выполняются.": "Transfers are disabled in demo mode.",
    "Email или ID получателя": "Recipient email or ID",
    "Количество юнитов": "Number of units",
    "Передать": "Transfer",
    "P2P маркетплейс": "P2P marketplace",
    "Пользователи устанавливают собственные цены.": "Users set their own prices.",
    "Создать объявление": "Create listing",
    "Количество": "Quantity",
    "Цена за юнит": "Price per UNIT",
    "Выставить": "List for sale",
    "АКТИВНЫЕ ОБЪЯВЛЕНИЯ": "ACTIVE LISTINGS",
    "юнитов доступно": "units available",
    "за юнит": "per UNIT",
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
    "Ваши юниты, зарегистрированные в реестре VORTEX UNIT.": "Your units registered in the VORTEX registry.",
    "карточек": "units",
    "Пока нет юнитов": "No units yet",
    "Когда юниты будут выпущены и закреплены за вашим аккаунтом, они появятся здесь.": "Units issued and assigned to your account will appear here.",
    "Обновить юниты": "Refresh units",
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
    "Загружаем таблицы базы данных...": "Loading database tables...",
    "Зарегистрироваться": "Register",
    "VORTEX UNIT — платформа уникальных цифровых юнитов и NFT. Создай аккаунт, управляй своими юнитами и открывай новые возможности.": "VORTEX UNIT is a digital UNIT platform. Create an account, manage your units, and explore the platform.",
    "У меня уже есть аккаунт": "I already have an account",
    "Юниты и NFT": "Digital units",
    "Создавай коллекции и управляй уникальными цифровыми юнитами.": "Personal dashboard and UNIT management after signing in.",
    "P2P-маркетплейс": "P2P marketplace",
    "Просмотр предложений и торговые функции для пользователей.": "Browse listings and use trading features.",
    "Сообщество": "Community",
    "Приглашайте друзей и развивайтесь вместе с VORTEX.": "Invite friends and grow together with VORTEX.",
    "Регистрация VORTEX UNIT": "VORTEX UNIT registration",
    "Восстановление пароля": "Password recovery",
    "Новый пароль": "New password",
    "Вход в аккаунт": "Sign in",
    "Отправить ссылку": "Send link",
    "Вернуться ко входу": "Back to sign in",
    "Повторите новый пароль": "Confirm new password",
    "Сохранить новый пароль": "Save new password",
    "Отправляем...": "Sending...",
    "Сохраняем...": "Saving...",
    "Забыли пароль?": "Forgot password?",
    "Уже есть аккаунт? Войти": "Already have an account? Sign in",
    "Нет аккаунта? Зарегистрироваться": "No account? Register",

    "Для безопасных переводов требуется подключённая серверная операция Supabase.": "A secure Supabase server operation is required to transfer units.",
    "Показаны демонстрационные объявления. Реальные расчёты, резервирование юнитов и удержание комиссии пока не подключены.": "These are sample listings. Real payments, UNIT reservations, and fee collection are not connected yet.",
    "Пригласивший получает 1 дополнительный юнит после подтверждённой регистрации реферала. Новый пользователь получает стартовый юнит.": "The inviter receives 1 extra UNIT after the referral registration is confirmed. The new user receives a starter UNIT.",
    "Ссылка скопирована": "Link copied",
    "Не удалось скопировать ссылку": "Could not copy the link",
    "Загрузка данных...": "Loading data...",
    "Загрузка юнитов...": "Loading units...",
    "Юниты пока не удалось загрузить.": "Units could not be loaded yet.",
    "Ошибка загрузки:": "Loading error:",
    "Сумма не указана": "Amount not specified",
    "Показано записей:": "Records shown:",
    "юнитов доступно": "units available",
    "за юнит": "per UNIT",
    "VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО": "VORTEX · COLLECTOR COMMUNITY",
    "Email получателя": "Recipient email",
    "Передать можно только свободные юниты. Юниты, выставленные на маркетплейс, заблокированы для перевода до снятия объявления с продажи.": "Only available units can be transferred. Units listed on the marketplace are locked until the listing is removed.",
    "Перевести другому пользователю": "Transfer to another user",
    "Данные загружаются из Supabase. Балансы рассчитываются по записям финансового журнала; заявки сами по себе не означают поступление или выплату средств.": "Data is loaded from Supabase. Balances are calculated from ledger entries; requests alone do not mean funds have been received or paid out.",

    "Имя пользователя (псевдоним)": "Username (nickname)",
    "Например, VORTEX": "For example, VORTEX",
    "Придумайте любое имя. Не указывайте здесь email или настоящее имя, если хотите сохранить приватность.": "Choose any username. Do not use your email or real name here if you want to protect your privacy.",
    "Сохранить имя пользователя": "Save username",
    "Email аккаунта (виден только вам):": "Account email (visible only to you):",
    "Разрешение сохраняется. Сервер отправки будет подключён отдельно.": "Your permission is saved. The notification delivery server will be connected separately.",
    "Удалить аккаунт": "Delete account",
    "Удалить аккаунт навсегда?": "Permanently delete account?",
    "Будет удалена ваша учётная запись VORTEX UNIT и связанные с ней данные. Доступ к аккаунту с сайта и установленного приложения прекратится. Это действие нельзя отменить.": "Your VORTEX UNIT account and related data will be deleted. Access from the website and installed app will end. This action cannot be undone.",
    "Если у вас есть юниты, объявления или финансовая история, они также могут быть удалены вместе с аккаунтом.": "Your units, listings, and financial history may also be deleted with your account.",
    "Для подтверждения напишите УДАЛИТЬ": "Type DELETE to confirm",
    "Отмена": "Cancel",
    "Удаляем...": "Deleting...",
    "Удалить навсегда": "Delete permanently",
    "Укажите email, который использовали при регистрации. Мы отправим на него ссылку для восстановления доступа.": "Enter the email address you used to register. We will send a password recovery link to it.",
    "Придумайте новый пароль для своего аккаунта.": "Create a new password for your account.",
    "Новый пароль": "New password",
    "Повторите новый пароль": "Confirm new password",
    "Скрыть пароль": "Hide password",
    "Показать пароль": "Show password",
    "Загрузка данных...": "Loading data...",
    "Ошибка загрузки:": "Loading error:",
    "Загрузка юнитов...": "Loading units...",
    "Юниты пока не удалось загрузить.": "Units could not be loaded yet.",
    "Push-уведомления": "Push notifications",
    "Получать важные сообщения VORTEX UNIT на этом устройстве.": "Receive important VORTEX UNIT messages on this device.",
    "Получать push-уведомления": "Receive push notifications",
      "Редкие карточки": "Rare Cards",
    "COLLECTOR ARCHIVE": "COLLECTOR ARCHIVE",
    "Коллекционные номера, ограниченные тиражи и история карточек VORTEX UNIT.": "Collectible numbers, limited editions, and VORTEX UNIT card history.",
    "Резерв основателей": "Founders’ reserve",
    "Ограниченные серии": "Limited series",
    "Галерея": "Gallery",
    "Моя коллекция": "My collection",
    "Комплекты": "Sets",
    "История": "History",
    "Категории редкости": "Rarity categories",
    "Предварительная структура коллекционного архива": "Preliminary collector archive structure",
    "Легендарные": "Legendary",
    "Элитные номера": "Elite numbers",
    "Коллекционные номера": "Collectible numbers",
    "Специальные серии": "Special series",
    "Самые редкие первые номера. В дальнейшем могут быть переданы пользователям.": "The rarest first numbers. They may be transferred to users in the future.",
    "Особые карточки с отдельными ограниченными тиражами.": "Special cards with their own limited editions.",
    "Редкость определяется установленным тиражом каждого номера.": "Rarity is determined by the fixed edition size of each number.",
    "Отдельные тематические выпуски с собственными правилами и тиражами.": "Separate themed releases with their own rules and edition sizes.",
    "Правило тиража": "Edition rule",
    "У каждого номера заранее задаётся максимальное количество экземпляров. После утверждения тираж не увеличивается. Одинаковые номера могут существовать в пределах этого тиража.": "A maximum number of copies is set for each number in advance. Once approved, the edition size cannot be increased. Identical numbers may exist within that edition limit.",
    "Здесь будут отображаться редкие карточки, которыми владеет пользователь. Подключение реестра карточек будет выполнено отдельным этапом.": "Rare cards owned by the user will appear here. The card registry will be connected in a separate phase.",
    "Здесь появятся собранные наборы, например из трёх заданных номеров. Условия комплектов и возможного выкупа будут опубликованы до запуска.": "Collected sets, such as groups of three specified numbers, will appear here. Set and potential buyback terms will be published before launch.",
    "Здесь будет доступна история выпуска и смены владельцев каждой карточки после подключения реестра.": "The issue and ownership history of each card will be available here once the registry is connected.",
    "Административное управление резервом 001–010, тиражами и передачами будет добавлено в отдельную панель после утверждения правил выпуска.": "Admin controls for the 001–010 reserve, edition sizes, and transfers will be added to a separate panel after the release rules are approved.",
    "Раздел создан как коллекционный каталог. Продажа, аукцион и денежный выкуп здесь пока не активны.": "This section is a collector catalogue. Sales, auctions, and cash buybacks are not active yet.",
    "Разделы редких карточек": "Rare card sections",

    "Настройки профиля": "Profile settings",
    "Назад": "Back",
    "Пользователь": "User",
    "Фото профиля": "Profile photo",
    "Загрузите изображение JPG, PNG или WEBP до 5 МБ. Его увидят другие пользователи.": "Upload a JPG, PNG, or WEBP image up to 5 MB. Other users will be able to see it.",
    "Загружаем...": "Uploading...",
    "Изменить фото": "Change photo",
    "Загрузить аватар": "Upload avatar",
    "Удалить": "Remove",
    "Аватар профиля": "Profile avatar",
    "История операций": "Transaction history",
    "Пополнения": "Deposits",
    "Выводы": "Withdrawals",
    "Обмен VTX": "VTX exchange",
    "Пополнение": "Deposit",
    "Вывод": "Withdrawal",
    "Пополнений пока нет.": "No deposits yet.",
    "Выводов пока нет.": "No withdrawals yet.",
    "Обменов пока нет.": "No exchanges yet.",
    "Статус": "Status",
    "Комиссия": "Fee",
    "pending": "Pending",
    "detected": "Detected",
    "confirming": "Confirming",
    "confirmed": "Confirmed",
    "rejected": "Rejected",
    "expired": "Expired",
    "under_review": "Under review",
    "approved": "Approved",
    "processing": "Processing",
    "completed": "Completed",
    "cancelled": "Cancelled",
    "quoted": "Quoted",
    "Запросы на недостающие карточки": "Requests for missing cards",
    "Коллекция и редкие серии": "Collection and rare series",
    "Пригласить друга и награды": "Invite friends and earn rewards",
    "Личные данные и настройки": "Personal details and settings",
    "Связаться со службой поддержки": "Contact support",
    "Управление платформой": "Platform management",
  },
  "de": {
    "Назад к объявлениям": "Zurück zu den Angeboten",
    "Активное объявление": "Aktives Angebot",
    "Предложение VORTEX UNIT": "VORTEX-UNIT-Angebot",
    "Подробная информация об объявлении": "Angebotsdetails",
    "Продавец": "Verkäufer",
    "Количество юнитов": "Anzahl der Units",
    "Цена за один юнит": "Preis pro Unit",
    "Стоимость всего предложения": "Gesamtpreis des Angebots",
    "Дата размещения": "Einstelldatum",
    "Номера юнитов": "Unit-Nummern",
    "Будут показаны после синхронизации реестра": "Nach der Synchronisierung des Registers sichtbar",
    "Объявление размещено пользователем": "Eingestellt von",
    "Покупка и расчёты станут доступны после подключения безопасного механизма сделки.": "Käufe und Zahlungen sind nach Einrichtung des sicheren Transaktionssystems verfügbar.",
    "Подробнее": "Details",
    "Страницы объявлений": "Angebotsseiten",
    "Страница": "Seite",
    "из": "von",
    "Далее": "Weiter",
    "Удалить объявление": "Anzeige löschen",
    "Удалить это объявление? Юниты вернутся в вашу коллекцию.": "Diese Anzeige löschen? Die Units werden Ihrer Sammlung zurückgegeben.",
    "Объявление удалено. Юниты возвращены в вашу коллекцию.": "Anzeige gelöscht. Die Units wurden Ihrer Sammlung zurückgegeben.",
    "Не удалось удалить объявление: ": "Anzeige konnte nicht gelöscht werden: ",
    "Обзор": "Übersicht",
    "Юниты": "Units",
    "Маркетплейс": "Marktplatz",
    "Ищу карточку": "Karte gesucht",
    "Размещайте запросы на карточки, которых не хватает в вашей коллекции. Другие участники смогут откликнуться, а условия сделки вы обсудите напрямую.": "Stellen Sie Anfragen für Karten ein, die Ihrer Sammlung fehlen. Andere Mitglieder können reagieren und die Bedingungen direkt mit Ihnen besprechen.",
    "Создайте объявление": "Anfrage erstellen",
    "Укажите номер карточки, количество и желаемую цену.": "Geben Sie Kartennummer, Anzahl und Wunschpreis an.",
    "Договоритесь с продавцом": "Mit dem Verkäufer einigen",
    "Обсудите наличие и цену в личной переписке VORTEX UNIT.": "Besprechen Sie Verfügbarkeit und Preis in privaten VORTEX UNIT-Nachrichten.",
    "Завершите сделку на маркетплейсе": "Kauf über den Marktplatz abschließen",
    "Продавец размещает карточку на маркетплейсе. Оплата и передача проходят только там.": "Der Verkäufer stellt die Karte auf dem Marktplatz ein. Zahlung und Übergabe erfolgen ausschließlich dort.",
    "Раздел готовится к запуску": "Demnächst verfügbar",
    "Форма объявлений, список запросов и личные сообщения будут подключены после настройки защищённого хранения объявлений и чатов. Сейчас публикация запросов и переписка ещё не работают.": "Anfrageformular, Übersicht und private Nachrichten werden nach Einrichtung der sicheren Speicherung aktiviert. Anfragen und Nachrichten funktionieren derzeit noch nicht.",
    "Функция пока не активна": "Noch nicht aktiv",
    "Важно: договорённости можно будет обсуждать в чате, но продавать и покупать карточки разрешено только через маркетплейс VORTEX UNIT.": "Wichtig: Absprachen sind im Chat möglich, Karten dürfen jedoch nur über den VORTEX UNIT-Marktplatz gekauft und verkauft werden.",
    "Рефералы": "Empfehlungen",
    "Профиль": "Profil",
    "Поддержка": "Support",
    "VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО": "VORTEX · SAMMLER-COMMUNITY",
    "Администрирование": "Administration",
    "МЕНЮ": "MENÜ",
    "Установить": "Installieren",
    "Скачать приложение VORTEX UNIT": "VORTEX UNIT-App herunterladen",
    "Установите приложение на устройство": "Installieren Sie die App auf Ihrem Gerät",
    "Откройте меню браузера и выберите «Добавить на главный экран» или «Установить приложение».": "Öffnen Sie das Browsermenü und wählen Sie „Zum Startbildschirm hinzufügen“ oder „App installieren“.",
    "Приложение уже установлено": "Die App ist bereits installiert",
    "Установка приложения запущена": "App-Installation gestartet",
    "VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО": "VORTEX · SAMMLER-COMMUNITY",
    "Вход или регистрация": "Anmelden oder registrieren",
    "Панель администратора": "Adminbereich",
    "Статистика посещаемости": "Besucherstatistik",
    "Языки сайта": "Website-Sprachen",
    "Администратор": "Administrator",
    "Закрыть": "Schließen",
    "Одна единица.": "Eine Einheit.",
    "Своя ценность.": "Eigener Wert.",
    "Управляй юнитами, приглашай друзей и торгуй на P2P-маркетплейсе VORTEX UNIT.": "Verwalte Units, lade Freunde ein und handle auf dem VORTEX-P2P-Marktplatz.",
    "Открыть маркетплейс": "Marktplatz öffnen",
    "МОИ ЮНИТЫ": "MEINE UNITS",
    "РЕФЕРАЛЫ": "EMPFEHLUNGEN",
    "БЫСТРЫЕ ДЕЙСТВИЯ": "SCHNELLZUGRIFFE",
    "Мои юниты": "Meine Units",
    "Баланс и переводы": "Guthaben und Überweisungen",
    "P2P-рынок": "P2P-Markt",
    "Покупка и продажа": "Kaufen und verkaufen",
    "Пригласить друга": "Freund einladen",
    "Получить юнит": "UNIT erhalten",
    "ДОСТУПНЫЙ БАЛАНС": "VERFÜGBARES GUTHABEN",
    "Передать юниты": "Units übertragen",
    "Выполняется...": "Wird übertragen...",
    "Перевести юниты другому пользователю": "Units an einen anderen Nutzer übertragen",
    "Укажите email получателя и количество свободных юнитов. Юниты, выставленные на маркетплейс, передать нельзя.": "Geben Sie die E-Mail-Adresse des Empfängers und die Anzahl der verfügbaren Units ein. Auf dem Marktplatz angebotene Units können nicht übertragen werden.",
    "В демонстрационном режиме переводы не выполняются.": "Im Demomodus sind Übertragungen deaktiviert.",
    "Email или ID получателя": "E-Mail oder Empfänger-ID",
    "Количество юнитов": "Anzahl der Units",
    "Передать": "Übertragen",
    "P2P маркетплейс": "P2P-Marktplatz",
    "Пользователи устанавливают собственные цены.": "Nutzer legen ihre eigenen Preise fest.",
    "Создать объявление": "Anzeige erstellen",
    "Количество": "Menge",
    "Цена за юнит": "Preis pro UNIT",
    "Выставить": "Einstellen",
    "АКТИВНЫЕ ОБЪЯВЛЕНИЯ": "AKTIVE ANGEBOTE",
    "юнитов доступно": "Units verfügbar",
    "за юнит": "pro UNIT",
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
    "Ваши юниты, зарегистрированные в реестре VORTEX UNIT.": "Ihre im VORTEX-Register erfassten Units.",
    "карточек": "Units",
    "Пока нет юнитов": "Noch keine Units",
    "Когда юниты будут выпущены и закреплены за вашим аккаунтом, они появятся здесь.": "Ausgestellte und Ihrem Konto zugewiesene Units erscheinen hier.",
    "Обновить юниты": "Units aktualisieren",
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
    "Загружаем таблицы базы данных...": "Datenbanktabellen werden geladen...",
    "Зарегистрироваться": "Registrieren",
    "VORTEX UNIT — платформа уникальных цифровых юнитов и NFT. Создай аккаунт, управляй своими юнитами и открывай новые возможности.": "VORTEX UNIT ist eine digitale Unitsplattform. Erstelle ein Konto, verwalte deine Units und entdecke die Möglichkeiten der Plattform.",
    "У меня уже есть аккаунт": "Ich habe bereits ein Konto",
    "Юниты и NFT": "Digitale Units",
    "Создавай коллекции и управляй уникальными цифровыми юнитами.": "Persönlicher Bereich und Unitsverwaltung nach der Anmeldung.",
    "P2P-маркетплейс": "P2P-Marktplatz",
    "Просмотр предложений и торговые функции для пользователей.": "Angebote ansehen und Handelsfunktionen nutzen.",
    "Сообщество": "Community",
    "Приглашайте друзей и развивайтесь вместе с VORTEX.": "Lade Freunde ein und entwickle dich gemeinsam mit VORTEX weiter.",
    "Регистрация VORTEX UNIT": "VORTEX UNIT-Registrierung",
    "Восстановление пароля": "Passwort wiederherstellen",
    "Новый пароль": "Neues Passwort",
    "Вход в аккаунт": "Anmelden",
    "Отправить ссылку": "Link senden",
    "Вернуться ко входу": "Zurück zur Anmeldung",
    "Повторите новый пароль": "Neues Passwort wiederholen",
    "Сохранить новый пароль": "Neues Passwort speichern",
    "Отправляем...": "Wird gesendet...",
    "Сохраняем...": "Wird gespeichert...",
    "Забыли пароль?": "Passwort vergessen?",
    "Уже есть аккаунт? Войти": "Du hast bereits ein Konto? Anmelden",
    "Нет аккаунта? Зарегистрироваться": "Noch kein Konto? Registrieren",

    "Для безопасных переводов требуется подключённая серверная операция Supabase.": "Für sichere Übertragungen ist eine serverseitige Supabase-Funktion erforderlich.",
    "Показаны демонстрационные объявления. Реальные расчёты, резервирование юнитов и удержание комиссии пока не подключены.": "Dies sind Demo-Angebote. Echte Zahlungen, Unitsreservierungen und Gebühreneinzug sind noch nicht aktiviert.",
    "Пригласивший получает 1 дополнительный юнит после подтверждённой регистрации реферала. Новый пользователь получает стартовый юнит.": "Der Einladende erhält nach bestätigter Registrierung des geworbenen Nutzers eine zusätzliche UNIT. Der neue Nutzer erhält eine StarterUNIT.",
    "Ссылка скопирована": "Link kopiert",
    "Не удалось скопировать ссылку": "Link konnte nicht kopiert werden",
    "Загрузка данных...": "Daten werden geladen...",
    "Загрузка юнитов...": "Units werden geladen...",
    "Юниты пока не удалось загрузить.": "Units konnten noch nicht geladen werden.",
    "Ошибка загрузки:": "Ladefehler:",
    "Сумма не указана": "Betrag nicht angegeben",
    "Показано записей:": "Angezeigte Einträge:",
    "юнитов доступно": "Units verfügbar",
    "за юнит": "pro UNIT",
    "VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО": "VORTEX · SAMMLER-COMMUNITY",
    "Email получателя": "E-Mail des Empfängers",
    "Передать можно только свободные юниты. Юниты, выставленные на маркетплейс, заблокированы для перевода до снятия объявления с продажи.": "Nur verfügbare Units können übertragen werden. Auf dem Marktplatz angebotene Units sind bis zum Entfernen des Angebots gesperrt.",
    "Перевести другому пользователю": "An einen anderen Nutzer übertragen",
    "Данные загружаются из Supabase. Балансы рассчитываются по записям финансового журнала; заявки сами по себе не означают поступление или выплату средств.": "Die Daten werden aus Supabase geladen. Guthaben werden anhand der Finanzbuchungen berechnet; Anfragen allein bedeuten keinen Geldeingang und keine Auszahlung.",

    "Имя пользователя (псевдоним)": "Benutzername (Pseudonym)",
    "Например, VORTEX": "Zum Beispiel: VORTEX",
    "Придумайте любое имя. Не указывайте здесь email или настоящее имя, если хотите сохранить приватность.": "Wählen Sie einen beliebigen Namen. Geben Sie hier weder Ihre E-Mail-Adresse noch Ihren echten Namen an, wenn Sie Ihre Privatsphäre schützen möchten.",
    "Сохранить имя пользователя": "Benutzernamen speichern",
    "Email аккаунта (виден только вам):": "Konto-E-Mail (nur für Sie sichtbar):",
    "Push-уведомления": "Push-Benachrichtigungen",
    "Разрешение сохраняется. Сервер отправки будет подключён отдельно.": "Ihre Zustimmung wird gespeichert. Der Versandserver wird später separat eingerichtet.",
    "Получать push-уведомления": "Push-Benachrichtigungen erhalten",
    "Удалить аккаунт": "Konto löschen",
    "Удалить аккаунт навсегда?": "Konto dauerhaft löschen?",
    "Будет удалена ваша учётная запись VORTEX UNIT и связанные с ней данные. Доступ к аккаунту с сайта и установленного приложения прекратится. Это действие нельзя отменить.": "Ihr VORTEX-UNIT-Konto und die damit verbundenen Daten werden gelöscht. Der Zugriff über die Website und die installierte App wird beendet. Dieser Vorgang kann nicht rückgängig gemacht werden.",
    "Если у вас есть юниты, объявления или финансовая история, они также могут быть удалены вместе с аккаунтом.": "Ihre Units, Angebote und Ihr Finanzverlauf können ebenfalls zusammen mit dem Konto gelöscht werden.",
    "Для подтверждения напишите УДАЛИТЬ": "Geben Sie zur Bestätigung LÖSCHEN ein",
    "Отмена": "Abbrechen",
    "Удаляем...": "Wird gelöscht...",
    "Удалить навсегда": "Endgültig löschen",
    "Укажите email получателя": "E-Mail des Empfängers eingeben",
    "Количество юнитов": "Anzahl der Units",
    "Финансовый кабинет": "Finanzübersicht",
    "Баланс по активам": "Guthaben nach Assets",
    "Получать важные сообщения VORTEX UNIT на этом устройстве.": "Wichtige Nachrichten von VORTEX UNIT auf diesem Gerät erhalten.",
    "Укажите email, который использовали при регистрации. Мы отправим на него ссылку для восстановления доступа.": "Geben Sie die bei der Registrierung verwendete E-Mail-Adresse ein. Wir senden Ihnen einen Link zur Wiederherstellung des Zugangs.",
    "Придумайте новый пароль для своего аккаунта.": "Legen Sie ein neues Passwort für Ihr Konto fest.",
    "Скрыть пароль": "Passwort verbergen",
    "Показать пароль": "Passwort anzeigen",
      "Редкие карточки": "Seltene Karten",
    "COLLECTOR ARCHIVE": "SAMMLERARCHIV",
    "Коллекционные номера, ограниченные тиражи и история карточек VORTEX UNIT.": "Sammlernummern, limitierte Auflagen und die Kartenhistorie von VORTEX UNIT.",
    "Резерв основателей": "Gründerreserve",
    "Ограниченные серии": "Limitierte Serien",
    "Галерея": "Galerie",
    "Моя коллекция": "Meine Sammlung",
    "Комплекты": "Sets",
    "История": "Verlauf",
    "Категории редкости": "Seltenheitskategorien",
    "Предварительная структура коллекционного архива": "Vorläufige Struktur des Sammlerarchivs",
    "Легендарные": "Legendär",
    "Элитные номера": "Elite-Nummern",
    "Коллекционные номера": "Sammlernummern",
    "Специальные серии": "Sonderserien",
    "Самые редкие первые номера. В дальнейшем могут быть переданы пользователям.": "Die seltensten ersten Nummern. Sie können später an Nutzer übertragen werden.",
    "Особые карточки с отдельными ограниченными тиражами.": "Besondere Karten mit eigenen limitierten Auflagen.",
    "Редкость определяется установленным тиражом каждого номера.": "Die Seltenheit wird durch die festgelegte Auflage jeder Nummer bestimmt.",
    "Отдельные тематические выпуски с собственными правилами и тиражами.": "Separate Themeneditionen mit eigenen Regeln und Auflagen.",
    "Правило тиража": "Auflagenregel",
    "У каждого номера заранее задаётся максимальное количество экземпляров. После утверждения тираж не увеличивается. Одинаковые номера могут существовать в пределах этого тиража.": "Für jede Nummer wird vorab eine maximale Stückzahl festgelegt. Nach der Freigabe wird die Auflage nicht erhöht. Gleiche Nummern können innerhalb dieser Auflage mehrfach existieren.",
    "Здесь будут отображаться редкие карточки, которыми владеет пользователь. Подключение реестра карточек будет выполнено отдельным этапом.": "Hier werden die seltenen Karten des Nutzers angezeigt. Das Kartenregister wird in einer separaten Phase angebunden.",
    "Здесь появятся собранные наборы, например из трёх заданных номеров. Условия комплектов и возможного выкупа будут опубликованы до запуска.": "Hier erscheinen zusammengestellte Sets, zum Beispiel aus drei festgelegten Nummern. Die Bedingungen für Sets und einen möglichen Rückkauf werden vor dem Start veröffentlicht.",
    "Здесь будет доступна история выпуска и смены владельцев каждой карточки после подключения реестра.": "Nach Anbindung des Registers ist hier die Ausgabe- und Besitzhistorie jeder Karte verfügbar.",
    "Административное управление резервом 001–010, тиражами и передачами будет добавлено в отдельную панель после утверждения правил выпуска.": "Die Verwaltung der Reserve 001–010, der Auflagen und Übertragungen wird nach Festlegung der Ausgaberegeln in einem separaten Adminbereich ergänzt.",
    "Раздел создан как коллекционный каталог. Продажа, аукцион и денежный выкуп здесь пока не активны.": "Dieser Bereich ist ein Sammlerkatalog. Verkäufe, Auktionen und Rückkäufe gegen Geld sind noch nicht aktiv.",
    "Разделы редких карточек": "Bereiche für seltene Karten",

    "Настройки профиля": "Profileinstellungen",
    "Назад": "Zurück",
    "Пользователь": "Benutzer",
    "Фото профиля": "Profilfoto",
    "Загрузите изображение JPG, PNG или WEBP до 5 МБ. Его увидят другие пользователи.": "Laden Sie ein JPG-, PNG- oder WEBP-Bild mit bis zu 5 MB hoch. Andere Nutzer können es sehen.",
    "Загружаем...": "Wird hochgeladen...",
    "Изменить фото": "Foto ändern",
    "Загрузить аватар": "Avatar hochladen",
    "Удалить": "Entfernen",
    "Аватар профиля": "Profilavatar",
    "История операций": "Transaktionsverlauf",
    "Пополнения": "Einzahlungen",
    "Выводы": "Auszahlungen",
    "Обмен VTX": "VTX-Tausch",
    "Пополнение": "Einzahlung",
    "Вывод": "Auszahlung",
    "Пополнений пока нет.": "Noch keine Einzahlungen.",
    "Выводов пока нет.": "Noch keine Auszahlungen.",
    "Обменов пока нет.": "Noch keine Tauschvorgänge.",
    "Статус": "Status",
    "Комиссия": "Gebühr",
    "pending": "Ausstehend",
    "detected": "Erkannt",
    "confirming": "Wird bestätigt",
    "confirmed": "Bestätigt",
    "rejected": "Abgelehnt",
    "expired": "Abgelaufen",
    "under_review": "In Prüfung",
    "approved": "Genehmigt",
    "processing": "In Bearbeitung",
    "completed": "Abgeschlossen",
    "cancelled": "Storniert",
    "quoted": "Kurs berechnet",
    "Запросы на недостающие карточки": "Anfragen für fehlende Karten",
    "Коллекция и редкие серии": "Sammlung und seltene Serien",
    "Пригласить друга и награды": "Freunde einladen und Prämien erhalten",
    "Личные данные и настройки": "Persönliche Daten und Einstellungen",
    "Связаться со службой поддержки": "Support kontaktieren",
    "Управление платформой": "Plattform verwalten",
  },
  "fr": {
    "Назад к объявлениям": "Retour aux annonces",
    "Активное объявление": "Annonce active",
    "Предложение VORTEX UNIT": "Offre VORTEX UNIT",
    "Подробная информация об объявлении": "Détails de l’annonce",
    "Продавец": "Vendeur",
    "Количество юнитов": "Nombre d’unités",
    "Цена за один юнит": "Prix par unité",
    "Стоимость всего предложения": "Prix total de l’offre",
    "Дата размещения": "Date de publication",
    "Номера юнитов": "Numéros des unités",
    "Будут показаны после синхронизации реестра": "Affichés après la synchronisation du registre",
    "Объявление размещено пользователем": "Publié par",
    "Покупка и расчёты станут доступны после подключения безопасного механизма сделки.": "Les achats et paiements seront disponibles après la mise en place du système de transaction sécurisé.",
    "Подробнее": "Détails",
    "Страницы объявлений": "Pages d’annonces",
    "Страница": "Page",
    "из": "sur",
    "Далее": "Suivant",
    "Удалить объявление": "Supprimer l’annonce",
    "Удалить это объявление? Юниты вернутся в вашу коллекцию.": "Supprimer cette annonce ? Les unités seront rendues à votre collection.",
    "Объявление удалено. Юниты возвращены в вашу коллекцию.": "Annonce supprimée. Les unités ont été rendues à votre collection.",
    "Не удалось удалить объявление: ": "Impossible de supprimer l’annonce : ",
    "Обзор": "Vue d’ensemble",
    "Юниты": "Units",
    "Маркетплейс": "Marché",
    "Ищу карточку": "Je cherche une carte",
    "Размещайте запросы на карточки, которых не хватает в вашей коллекции. Другие участники смогут откликнуться, а условия сделки вы обсудите напрямую.": "Publiez des demandes pour les cartes manquantes à votre collection. Les autres membres pourront répondre et discuter directement des conditions avec vous.",
    "Создайте объявление": "Créer une demande",
    "Укажите номер карточки, количество и желаемую цену.": "Indiquez le numéro, la quantité et le prix souhaité.",
    "Договоритесь с продавцом": "Convenir avec le vendeur",
    "Обсудите наличие и цену в личной переписке VORTEX UNIT.": "Discutez de la disponibilité et du prix dans la messagerie privée VORTEX UNIT.",
    "Завершите сделку на маркетплейсе": "Finaliser sur la marketplace",
    "Продавец размещает карточку на маркетплейсе. Оплата и передача проходят только там.": "Le vendeur publie la carte sur la marketplace. Le paiement et le transfert se font uniquement là.",
    "Раздел готовится к запуску": "Bientôt disponible",
    "Форма объявлений, список запросов и личные сообщения будут подключены после настройки защищённого хранения объявлений и чатов. Сейчас публикация запросов и переписка ещё не работают.": "Le formulaire, la liste des demandes et la messagerie seront activés après la configuration du stockage sécurisé. La publication et les messages ne fonctionnent pas encore.",
    "Функция пока не активна": "Fonction non active",
    "Важно: договорённости можно будет обсуждать в чате, но продавать и покупать карточки разрешено только через маркетплейс VORTEX UNIT.": "Important : les conditions pourront être discutées par chat, mais les cartes ne pourront être achetées et vendues que sur la marketplace VORTEX UNIT.",
    "Рефералы": "Parrainages",
    "Профиль": "Profil",
    "Поддержка": "Assistance",
    "VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО": "VORTEX · COMMUNAUTÉ DE COLLECTIONNEURS",
    "Администрирование": "Administration",
    "МЕНЮ": "MENU",
    "Установить": "Installer",
    "Скачать приложение VORTEX UNIT": "Télécharger l’application VORTEX UNIT",
    "Установите приложение на устройство": "Installez l’application sur votre appareil",
    "Откройте меню браузера и выберите «Добавить на главный экран» или «Установить приложение».": "Ouvrez le menu du navigateur et choisissez « Ajouter à l’écran d’accueil » ou « Installer l’application ».",
    "Приложение уже установлено": "L’application est déjà installée",
    "Установка приложения запущена": "Installation de l’application lancée",
    "VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО": "VORTEX · COMMUNAUTÉ DE COLLECTIONNEURS",
    "Вход или регистрация": "Connexion ou inscription",
    "Панель администратора": "Panneau administrateur",
    "Статистика посещаемости": "Statistiques de fréquentation",
    "Языки сайта": "Langues du site",
    "Администратор": "Administrateur",
    "Закрыть": "Fermer",
    "Одна единица.": "Une unité.",
    "Своя ценность.": "Sa propre valeur.",
    "Управляй юнитами, приглашай друзей и торгуй на P2P-маркетплейсе VORTEX UNIT.": "Gérez vos units, invitez vos amis et échangez sur la place de marché P2P VORTEX.",
    "Открыть маркетплейс": "Ouvrir la marketplace",
    "МОИ ЮНИТЫ": "MES UNITÉS",
    "РЕФЕРАЛЫ": "PARRAINAGES",
    "БЫСТРЫЕ ДЕЙСТВИЯ": "ACTIONS RAPIDES",
    "Мои юниты": "Mes units",
    "Баланс и переводы": "Solde et transferts",
    "P2P-рынок": "Marché P2P",
    "Покупка и продажа": "Acheter et vendre",
    "Пригласить друга": "Inviter un ami",
    "Получить юнит": "Obtenir une UNIT",
    "ДОСТУПНЫЙ БАЛАНС": "SOLDE DISPONIBLE",
    "Передать юниты": "Transférer des units",
    "В демонстрационном режиме переводы не выполняются.": "Les transferts sont désactivés en mode démo.",
    "Email или ID получателя": "E-mail ou identifiant du destinataire",
    "Количество юнитов": "Nombre de units",
    "Передать": "Transférer",
    "P2P маркетплейс": "Marketplace P2P",
    "Пользователи устанавливают собственные цены.": "Les utilisateurs fixent leurs propres prix.",
    "Создать объявление": "Créer une annonce",
    "Количество": "Quantité",
    "Цена за юнит": "Prix par UNIT",
    "Выставить": "Mettre en vente",
    "АКТИВНЫЕ ОБЪЯВЛЕНИЯ": "ANNONCES ACTIVES",
    "юнитов доступно": "units disponibles",
    "за юнит": "par UNIT",
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
    "Ваши юниты, зарегистрированные в реестре VORTEX UNIT.": "Vos units enregistrées dans le registre VORTEX.",
    "карточек": "units",
    "Пока нет юнитов": "Aucune UNIT pour le moment",
    "Когда юниты будут выпущены и закреплены за вашим аккаунтом, они появятся здесь.": "Les units émises et associées à votre compte apparaîtront ici.",
    "Обновить юниты": "Actualiser les units",
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
    "Загружаем таблицы базы данных...": "Chargement des tables de la base de données...",
    "Зарегистрироваться": "S’inscrire",
    "VORTEX UNIT — платформа уникальных цифровых юнитов и NFT. Создай аккаунт, управляй своими юнитами и открывай новые возможности.": "VORTEX UNIT est une plateforme de units numériques. Créez un compte, gérez vos units et découvrez les possibilités de la plateforme.",
    "У меня уже есть аккаунт": "J’ai déjà un compte",
    "Юниты и NFT": "Units numériques",
    "Создавай коллекции и управляй уникальными цифровыми юнитами.": "Espace personnel et gestion des units après connexion.",
    "P2P-маркетплейс": "Marché P2P",
    "Просмотр предложений и торговые функции для пользователей.": "Consultez les offres et utilisez les fonctions de trading.",
    "Сообщество": "Communauté",
    "Приглашайте друзей и развивайтесь вместе с VORTEX.": "Invitez vos amis et évoluez avec VORTEX.",
    "Регистрация VORTEX UNIT": "Inscription à VORTEX UNIT",
    "Восстановление пароля": "Récupération du mot de passe",
    "Новый пароль": "Nouveau mot de passe",
    "Вход в аккаунт": "Connexion au compte",
    "Отправить ссылку": "Envoyer le lien",
    "Вернуться ко входу": "Retour à la connexion",
    "Повторите новый пароль": "Confirmez le nouveau mot de passe",
    "Сохранить новый пароль": "Enregistrer le nouveau mot de passe",
    "Отправляем...": "Envoi en cours...",
    "Сохраняем...": "Enregistrement...",
    "Забыли пароль?": "Mot de passe oublié ?",
    "Уже есть аккаунт? Войти": "Vous avez déjà un compte ? Se connecter",
    "Нет аккаунта? Зарегистрироваться": "Pas de compte ? S’inscrire",
    "Email получателя": "E-mail du destinataire",
    "Передать можно только свободные юниты. Юниты, выставленные на маркетплейс, заблокированы для перевода до снятия объявления с продажи.": "Seules les unités disponibles peuvent être transférées. Les unités mises en vente sont bloquées jusqu'au retrait de l'annonce.",
    "Перевести другому пользователю": "Transférer à un autre utilisateur",
    "Данные загружаются из Supabase. Балансы рассчитываются по записям финансового журнала; заявки сами по себе не означают поступление или выплату средств.": "Les données sont chargées depuis Supabase. Les soldes sont calculés à partir du journal financier ; les demandes ne signifient pas à elles seules qu'un dépôt ou un paiement a eu lieu.",
    "Push-уведомления": "Notifications push",
    "Выполняется...": "Transfert en cours…",
    "Получать важные сообщения VORTEX UNIT на этом устройстве.": "Recevoir les messages importants de VORTEX UNIT sur cet appareil.",
    "Разрешение сохраняется. Сервер отправки будет подключён отдельно.": "Votre autorisation est enregistrée. Le serveur d’envoi sera connecté séparément.",
    "Получать push-уведомления": "Recevoir les notifications push",
    "Перевести юниты другому пользователю": "Transférer des units à un autre utilisateur",
    "Укажите email получателя и количество свободных юнитов. Юниты, выставленные на маркетплейс, передать нельзя.": "Indiquez l’adresse e-mail du destinataire et le nombre d’unités disponibles. Les units mises en vente sur la marketplace ne peuvent pas être transférées.",
    "Имя пользователя (псевдоним)": "Nom d’utilisateur (pseudonyme)",
    "Например, VORTEX": "Par exemple : VORTEX",
    "Придумайте любое имя. Не указывайте здесь email или настоящее имя, если хотите сохранить приватность.": "Choisissez le nom de votre choix. N’indiquez pas votre adresse e-mail ni votre vrai nom ici si vous souhaitez préserver votre vie privée.",
    "Сохранить имя пользователя": "Enregistrer le nom d’utilisateur",
    "Email аккаунта (виден только вам):": "E-mail du compte (visible uniquement par vous) :",
    "Удалить аккаунт": "Supprimer le compte",
    "Удалить аккаунт навсегда?": "Supprimer définitivement le compte ?",
    "Будет удалена ваша учётная запись VORTEX UNIT и связанные с ней данные. Доступ к аккаунту с сайта и установленного приложения прекратится. Это действие нельзя отменить.": "Votre compte VORTEX UNIT et les données associées seront supprimés. Vous ne pourrez plus accéder au compte depuis le site ni depuis l’application installée. Cette action est irréversible.",
    "Если у вас есть юниты, объявления или финансовая история, они также могут быть удалены вместе с аккаунтом.": "Vos Units, annonces et historique financier peuvent également être supprimés avec le compte.",
    "Для подтверждения напишите УДАЛИТЬ": "Pour confirmer, saisissez SUPPRIMER",
    "Отмена": "Annuler",
    "Удаляем...": "Suppression en cours…",
    "Удалить навсегда": "Supprimer définitivement",
    "Укажите email, который использовали при регистрации. Мы отправим на него ссылку для восстановления доступа.": "Saisissez l’adresse e-mail utilisée lors de l’inscription. Nous vous enverrons un lien pour récupérer l’accès.",
    "Придумайте новый пароль для своего аккаунта.": "Choisissez un nouveau mot de passe pour votre compte.",
    "Скрыть пароль": "Masquer le mot de passe",
    "Показать пароль": "Afficher le mot de passe",
    "Загрузка данных...": "Chargement des données…",
    "Ошибка загрузки:": "Erreur de chargement :",
    "Загрузка юнитов...": "Chargement des Units…",
    "Юниты пока не удалось загрузить.": "Impossible de charger les Units pour le moment.",
      "Редкие карточки": "Cartes rares",
    "COLLECTOR ARCHIVE": "ARCHIVES DES COLLECTIONNEURS",
    "Коллекционные номера, ограниченные тиражи и история карточек VORTEX UNIT.": "Numéros de collection, éditions limitées et historique des cartes VORTEX UNIT.",
    "Резерв основателей": "Réserve des fondateurs",
    "Ограниченные серии": "Séries limitées",
    "Галерея": "Galerie",
    "Моя коллекция": "Ma collection",
    "Комплекты": "Ensembles",
    "История": "Historique",
    "Категории редкости": "Catégories de rareté",
    "Предварительная структура коллекционного архива": "Structure préliminaire des archives de collection",
    "Легендарные": "Légendaires",
    "Элитные номера": "Numéros élite",
    "Коллекционные номера": "Numéros de collection",
    "Специальные серии": "Séries spéciales",
    "Самые редкие первые номера. В дальнейшем могут быть переданы пользователям.": "Les tout premiers numéros, les plus rares. Ils pourront être transférés aux utilisateurs ultérieurement.",
    "Особые карточки с отдельными ограниченными тиражами.": "Cartes spéciales avec leurs propres éditions limitées.",
    "Редкость определяется установленным тиражом каждого номера.": "La rareté est déterminée par le tirage fixé pour chaque numéro.",
    "Отдельные тематические выпуски с собственными правилами и тиражами.": "Des éditions thématiques distinctes avec leurs propres règles et tirages.",
    "Правило тиража": "Règle de tirage",
    "У каждого номера заранее задаётся максимальное количество экземпляров. После утверждения тираж не увеличивается. Одинаковые номера могут существовать в пределах этого тиража.": "Un nombre maximal d’exemplaires est fixé à l’avance pour chaque numéro. Une fois approuvé, le tirage ne peut plus être augmenté. Des numéros identiques peuvent exister dans la limite de ce tirage.",
    "Здесь будут отображаться редкие карточки, которыми владеет пользователь. Подключение реестра карточек будет выполнено отдельным этапом.": "Les cartes rares détenues par l’utilisateur apparaîtront ici. Le registre des cartes sera connecté lors d’une étape distincte.",
    "Здесь появятся собранные наборы, например из трёх заданных номеров. Условия комплектов и возможного выкупа будут опубликованы до запуска.": "Les ensembles constitués, par exemple de trois numéros définis, apparaîtront ici. Les conditions des ensembles et d’un éventuel rachat seront publiées avant le lancement.",
    "Здесь будет доступна история выпуска и смены владельцев каждой карточки после подключения реестра.": "L’historique d’émission et des changements de propriétaire de chaque carte sera disponible après la connexion du registre.",
    "Административное управление резервом 001–010, тиражами и передачами будет добавлено в отдельную панель после утверждения правил выпуска.": "La gestion administrative de la réserve 001–010, des tirages et des transferts sera ajoutée à un panneau distinct après validation des règles d’émission.",
    "Раздел создан как коллекционный каталог. Продажа, аукцион и денежный выкуп здесь пока не активны.": "Cette section est un catalogue de collection. Les ventes, enchères et rachats en argent ne sont pas encore actifs.",
    "Разделы редких карточек": "Sections des cartes rares",

    "Настройки профиля": "Paramètres du profil",
    "Назад": "Retour",
    "Пользователь": "Utilisateur",
    "Фото профиля": "Photo de profil",
    "Загрузите изображение JPG, PNG или WEBP до 5 МБ. Его увидят другие пользователи.": "Téléversez une image JPG, PNG ou WEBP de 5 Mo maximum. Les autres utilisateurs pourront la voir.",
    "Загружаем...": "Téléversement...",
    "Изменить фото": "Modifier la photo",
    "Загрузить аватар": "Téléverser un avatar",
    "Удалить": "Supprimer",
    "Аватар профиля": "Avatar du profil",
    "История операций": "Historique des opérations",
    "Пополнения": "Dépôts",
    "Выводы": "Retraits",
    "Обмен VTX": "Échange VTX",
    "Пополнение": "Dépôt",
    "Вывод": "Retrait",
    "Пополнений пока нет.": "Aucun dépôt pour le moment.",
    "Выводов пока нет.": "Aucun retrait pour le moment.",
    "Обменов пока нет.": "Aucun échange pour le moment.",
    "Статус": "Statut",
    "Комиссия": "Frais",
    "pending": "En attente",
    "detected": "Détecté",
    "confirming": "Confirmation en cours",
    "confirmed": "Confirmé",
    "rejected": "Refusé",
    "expired": "Expiré",
    "under_review": "En vérification",
    "approved": "Approuvé",
    "processing": "En cours",
    "completed": "Terminé",
    "cancelled": "Annulé",
    "quoted": "Cours calculé",
    "Запросы на недостающие карточки": "Demandes de cartes manquantes",
    "Коллекция и редкие серии": "Collection et séries rares",
    "Пригласить друга и награды": "Inviter des amis et gagner des récompenses",
    "Личные данные и настройки": "Données personnelles et paramètres",
    "Связаться со службой поддержки": "Contacter le support",
    "Управление платформой": "Gestion de la plateforme",
  },
}

  const t = value => translations[language]?.[value] || value

  async function handleInstall() {
    if (isInstalled) {
      setNotice(t('Приложение уже установлено'))
      return
    }
    if (installPrompt) {
      try {
        await installPrompt.prompt()
        setInstallPrompt(null)
        setNotice(t('Установка приложения запущена'))
      } catch (error) {
        setNotice(t('Откройте меню браузера и выберите «Добавить на главный экран» или «Установить приложение».'))
      }
      return
    }
    setNotice(t('Откройте меню браузера и выберите «Добавить на главный экран» или «Установить приложение».'))
  }

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

  async function resendConfirmation() {
    if (busy) return
    const cleanEmail = email.trim()
    if (!cleanEmail || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(cleanEmail)) {
      setNotice('Сначала укажите правильный адрес электронной почты.')
      return
    }
    setBusy(true)
    setNotice('Отправляем письмо подтверждения...')
    try {
      const emailRedirectTo = new URL(import.meta.env.BASE_URL, location.origin).toString()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: { emailRedirectTo }
      })
      if (error) throw error
      setNotice('Если аккаунт ожидает подтверждения, письмо отправлено. Проверьте входящие и папку «Спам».')
    } catch (error) {
      console.error('Ошибка повторной отправки подтверждения:', error)
      setNotice('Не удалось отправить письмо: ' + (error.message || 'ошибка сервера'))
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
      await supabase.auth.signOut({ scope: 'local' })
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
      const emailRedirectTo = new URL(import.meta.env.BASE_URL, location.origin).toString()
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo,
          data: { referral_code: ref, push_consent_status: 'pending', push_notifications_enabled: false }
        }
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
      setEmail('')
      setPassword('')
      setPasswordConfirm('')
      setShowPassword(false)
      setAuthMode('login')
      setNotice('Вы вышли из аккаунта.')
    } catch (error) {
      setNotice('Ошибка выхода: ' + (error.message || 'неизвестная ошибка'))
    } finally {
      setBusy(false)
    }
  }

  async function deleteAccount(e) {
    e.preventDefault()
    if (!user || deleteBusy) return
    if (deletePhrase.trim().toUpperCase() !== 'УДАЛИТЬ') {
      setNotice('Для подтверждения введите слово УДАЛИТЬ.')
      return
    }
    setDeleteBusy(true)
    try {
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw error
      await supabase.auth.signOut({ scope: 'local' })
      setUser(null)
      setIsAdmin(false)
      setPushEnabled(false)
      setDeleteDialogOpen(false)
      setDeletePhrase('')
      setEmail('')
      setPassword('')
      setPasswordConfirm('')
      setAuthMode('login')
      setTab('home')
      setNotice('Аккаунт и связанные с ним данные удалены.')
    } catch (error) {
      setNotice('Не удалось удалить аккаунт: ' + (error.message || 'серверная операция не настроена'))
    } finally {
      setDeleteBusy(false)
    }
  }


  async function addListing(e) {
    e.preventDefault()
    if (!user) { setNotice('Чтобы выставить юнит, войдите в аккаунт.'); return }
    const q = 1
    const p = Number(price)
    if (!['USDT','BTC','ETH','TON','USDC'].includes(assetCode)) {
      setNotice('Выберите криптовалюту для объявления.')
      return
    }
    if (!Number.isFinite(p) || p <= 0) {
      setNotice('Укажите корректную цену за одну карточку.')
      return
    }
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('create_market_listing_with_currency', {
        p_quantity: q, p_price: p, p_asset_code: assetCode
      })
      if (error) throw error
      setNotice('Объявление создано. Выставлена одна карточка. Пока объявление активно, этот юнит нельзя перевести другому пользователю.')
      setListingPage(1)
      setSelectedListing(null)
      await Promise.all([loadMarketplace(1), loadFinancialData()])
    } catch (error) {
      setNotice('Не удалось выставить юниты: ' + (error.message || 'ошибка операции'))
    } finally {
      setBusy(false)
    }
  }

  async function cancelOwnListing(item) {
    if (!user || !item?.id || !item.isMine || busy) return
    if (!window.confirm(t('Удалить это объявление? Юниты вернутся в вашу коллекцию.'))) return
    setBusy(true)
    try {
      // The secure database action marks the listing as cancelled and releases its cards.
      // Keeping the record preserves the transaction/audit history.
      const { error } = await supabase.rpc('cancel_own_market_listing', { p_listing_id: item.id })
      if (error) throw error
      setNotice(t('Объявление удалено. Юниты возвращены в вашу коллекцию.'))
      await Promise.all([loadMarketplace(listingPage), loadFinancialData()])
    } catch (error) {
      setNotice(t('Не удалось удалить объявление: ') + (error.message || 'ошибка операции'))
    } finally {
      setBusy(false)
    }
  }

  const nav = [
    ['home', t('Обзор'), Home],
    ['market', t('Маркетплейс'), Store],
    ['wanted', t('Ищу карточку'), Search],
    ['rare', t('Редкие карточки'), Gem],
    ['referrals', t('Рефералы'), Users],
    ['profile', t('Профиль'), UserRound],
    ['support', t('Поддержка'), Mail]
  ]
  const title = nav.find(x => x[0] === tab)?.[1] || (tab === 'admin' ? 'Администратор' : 'Обзор')
  const listingUnitPrice = Math.max(0, Number(price) || 0)
  const listingQuantity = 1
  const showListingPreview = Number.isInteger(listingQuantity) && listingQuantity > 0 && Number.isFinite(listingUnitPrice) && listingUnitPrice > 0 && ['USDT','BTC','ETH','TON','USDC'].includes(assetCode)
  const listingUnitNet = Math.round(listingUnitPrice * 0.95 * 100) / 100
  const listingGross = Math.round(listingUnitPrice * listingQuantity * 100) / 100
  const listingFee = Math.round(listingGross * 0.05 * 100) / 100
  const listingNet = Math.round((listingGross - listingFee) * 100) / 100
  const money = value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })

  const page = <div className="app-shell">
    <header className="topbar">
      <button className="icon-btn mobile-only" type="button" onClick={() => setMenu(!menu)}>
        {menu ? <X /> : <Menu />}
      </button>
      <div className="brand-mark">
        <span className="brand-gem" aria-hidden="true"><svg viewBox="0 0 512 512" focusable="false"><path d="M256 64 424 160v192L256 448 88 352V160z" fill="none" stroke="#8b5cf6" strokeWidth="24"/><path d="m150 188 106 62 106-62M256 250v124" fill="none" stroke="#25e6d2" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
        <span>VORTEX <b>UNIT</b></span>
      </div>
      <div className="top-actions">
        <label className="language-picker" aria-label="Language"><span>🌐</span><select value={language} onChange={e => setLanguage(e.target.value)}><option value="uk">Українська</option><option value="ru">Русский</option><option value="en">English</option><option value="de">Deutsch</option><option value="fr">Français</option></select></label>
        <span className="status"><i /> ONLINE</span>

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
        <div className="sidebar-foot">VORTEX UNIT <span>v1.0 PWA</span></div>
      </aside>

      <main className="main">
        <div className="page-head">
          <div><div className="eyebrow">{t('VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО')}</div><h1>{title}</h1></div>
          <div className="avatar">{user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="Аватар" /> : (user?.email?.[0]?.toUpperCase() || 'G')}</div>
        </div>

        {notice && <div className="notice" role="status">
          <span>{notice}</span><button type="button" aria-label="Закрыть" onClick={() => setNotice('')}>×</button>
        </div>}

        {tab === 'home' && <>
          <section className="hero">
            <div className="hero-copy">
              <div className="pill"><Sparkles size={13} /> VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО</div>
              <h2>Одна единица.<br /><span>Своя ценность.</span></h2>
              <p>Управляй юнитами, приглашай друзей и торгуй на P2P-маркетплейсе VORTEX UNIT.</p>
              <button type="button" className="primary" onClick={() => setTab('market')}>
                Открыть маркетплейс <ArrowLeftRight size={17} />
              </button>
            </div>
            <div className="hero-card">
              <div className="card-top"><span>VORTEX</span><span>GENESIS / 001</span></div>
              <div className="card-geometry" aria-hidden="true">
                <svg viewBox="0 0 64 64" focusable="false">
                  <path d="M32 4 54 17v30L32 60 10 47V17L32 4Z" />
                  <path d="M32 4v27m22-14L32 31 10 17m44 30L32 31 10 47m22-16v29" />
                  <path d="m20 23 12-7 12 7v18l-12 7-12-7V23Z" />
                  <path d="m20 23 12 8 12-8M32 31v17" />
                </svg>
              </div>
              <div className="card-bottom"><b>VORTEX UNIT</b><span>OWN THE DIGITAL FLOW</span></div>
            </div>
          </section>
          <div className="section-title">{t('БЫСТРЫЕ ДЕЙСТВИЯ')}</div>
          <div className="quick-grid">
            <Quick icon={<Store />} title={t('Маркетплейс')} desc={t('Покупка и продажа')} click={() => setTab('market')} />
            <Quick icon={<Search />} title={t('Ищу карточку')} desc={t('Запросы на недостающие карточки')} click={() => setTab('wanted')} />
            <Quick icon={<Gem />} title={t('Редкие карточки')} desc={t('Коллекция и редкие серии')} click={() => setTab('rare')} />
            <Quick icon={<Users />} title={t('Рефералы')} desc={t('Пригласить друга и награды')} click={() => setTab('referrals')} />
            <Quick icon={<UserRound />} title={t('Профиль')} desc={t('Личные данные и настройки')} click={() => setTab('profile')} />
            <Quick icon={<Mail />} title={t('Поддержка')} desc={t('Связаться со службой поддержки')} click={() => setTab('support')} />
            {isAdmin && <Quick icon={<Shield />} title={t('Администрирование')} desc={t('Управление платформой')} click={() => setTab('admin')} />}
            {!isInstalled && <Quick className="install-quick" icon={<Download />} title={t('Скачать приложение VORTEX UNIT')} desc={t('Установите приложение на устройство')} click={handleInstall} />}
          </div>
        </>}

        {tab === 'rare' && <section className="rare-archive">
          <div className="rare-hero">
            <div className="rare-kicker"><Gem size={15} /> VORTEX UNIT · {t('COLLECTOR ARCHIVE')}</div>
            <h2>{t('Редкие карточки')}</h2>
            <p>{t('Коллекционные номера, ограниченные тиражи и история карточек VORTEX UNIT.')}</p>
            <div className="rare-hero-stats">
              <div><b>001–010</b><span>{t('Резерв основателей')}</span></div>
              <div><b>LIMITED</b><span>{t('Ограниченные серии')}</span></div>
            </div>
          </div>
          <div className="rare-tabs" role="tablist" aria-label={t('Разделы редких карточек')}>
            <button type="button" className={rareView === 'gallery' ? 'active' : ''} onClick={() => setRareView('gallery')}><Gem size={16}/> {t('Галерея')}</button>
            <button type="button" className={rareView === 'collection' ? 'active' : ''} onClick={() => setRareView('collection')}><CreditCard size={16}/> {t('Моя коллекция')}</button>
            <button type="button" className={rareView === 'sets' ? 'active' : ''} onClick={() => setRareView('sets')}><Layers size={16}/> {t('Комплекты')}</button>
            <button type="button" className={rareView === 'history' ? 'active' : ''} onClick={() => setRareView('history')}><History size={16}/> {t('История')}</button>
          </div>
          {rareView === 'gallery' && <>
            <div className="rare-section-heading"><div><h3>{t('Категории редкости')}</h3><p>{t('Предварительная структура коллекционного архива')}</p></div></div>
            <div className="rare-category-grid">
              <article className="rare-category legendary"><span>LEGENDARY</span><b>001–010</b><small>{t('Резерв основателей')}</small><p>{t('Самые редкие первые номера. В дальнейшем могут быть переданы пользователям.')}</p></article>
              <article className="rare-category elite"><span>ELITE</span><b>011–050</b><small>{t('Элитные номера')}</small><p>{t('Особые карточки с отдельными ограниченными тиражами.')}</p></article>
              <article className="rare-category special"><span>SPECIAL</span><b>051–100</b><small>{t('Коллекционные номера')}</small><p>{t('Редкость определяется установленным тиражом каждого номера.')}</p></article>
              <article className="rare-category limited"><span>LIMITED SERIES</span><b>LIMITED</b><small>{t('Специальные серии')}</small><p>{t('Отдельные тематические выпуски с собственными правилами и тиражами.')}</p></article>
            </div>
            <div className="rare-note"><Trophy size={19}/><div><b>{t('Правило тиража')}</b><p>{t('У каждого номера заранее задаётся максимальное количество экземпляров. После утверждения тираж не увеличивается. Одинаковые номера могут существовать в пределах этого тиража.')}</p></div></div>
          </>}
          {rareView === 'collection' && <div className="panel rare-empty"><CreditCard size={28}/><h3>{t('Моя коллекция')}</h3><p>{t('Здесь будут отображаться редкие карточки, которыми владеет пользователь. Подключение реестра карточек будет выполнено отдельным этапом.')}</p></div>}
          {rareView === 'sets' && <div className="panel rare-empty"><Layers size={28}/><h3>{t('Комплекты')}</h3><p>{t('Здесь появятся собранные наборы, например из трёх заданных номеров. Условия комплектов и возможного выкупа будут опубликованы до запуска.')}</p></div>}
          {rareView === 'history' && <div className="panel rare-empty"><History size={28}/><h3>{t('История')}</h3><p>{t('Здесь будет доступна история выпуска и смены владельцев каждой карточки после подключения реестра.')}</p></div>}
          {isAdmin && <div className="rare-admin-hint"><Shield size={17}/><span>{t('Административное управление резервом 001–010, тиражами и передачами будет добавлено в отдельную панель после утверждения правил выпуска.')}</span></div>}
          <p className="rare-disclaimer">{t('Раздел создан как коллекционный каталог. Продажа, аукцион и денежный выкуп здесь пока не активны.')}</p>
        </section>}

        {tab === 'wanted' && <WantedSection supabase={supabase} user={user} language={language} onNotice={setNotice} onMarketplace={() => setTab('market')} />}

        {tab === 'support' && <SupportCenter userEmail={user?.email} language={language} />}

        {tab === 'market' && <>
          {selectedListing ? <section className="market-detail panel">
            <div className="market-detail-top">
              <button type="button" className="outline" onClick={() => setSelectedListing(null)}>← {t('Назад к объявлениям')}</button>
              <span className="market-detail-status">{t('Активное объявление')}</span>
            </div>
            <div className="market-detail-title">
              <div className="market-detail-emblem"><Gem size={30} /></div>
              <div><h2>{t('Предложение VORTEX UNIT')}</h2><p className="muted">{t('Подробная информация об объявлении')}</p></div>
            </div>
            <div className="market-detail-grid">
              <div><span>{t('Продавец')}</span><b>{selectedListing.seller}</b></div>
              <div><span>Номер карточки</span><b>{selectedListing.serialNumbers?.[0] || 'Номер уточняется'}</b></div>
              <div><span>{t('Цена за один юнит')}</span><b>{selectedListing.price.toLocaleString('en-US', { maximumFractionDigits: 8 })} {selectedListing.assetCode}</b></div>
              <div><span>{t('Стоимость всего предложения')}</span><b>{(selectedListing.price * selectedListing.qty).toLocaleString('en-US', { maximumFractionDigits: 8 })} {selectedListing.assetCode}</b></div>
              <div><span>{t('Дата размещения')}</span><b>{new Date(selectedListing.createdAt).toLocaleString(language === 'ru' ? 'ru-RU' : language === 'uk' ? 'uk-UA' : language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : 'en-US')}</b></div>
              <div><span>{t('Номера юнитов')}</span><b>{selectedListing.serialNumbers.length ? selectedListing.serialNumbers.join(', ') : t('Будут показаны после синхронизации реестра')}</b></div>
            </div>
            <div className="market-detail-seller">
              {selectedListing.avatarUrl ? <img src={selectedListing.avatarUrl} alt="" /> : <UserRound size={22} />}
              <div><small>{t('Объявление размещено пользователем')}</small><b>{selectedListing.seller}</b></div>
            </div>
            {selectedListing.isMine && <button type="button" className="outline" disabled={busy} onClick={() => cancelOwnListing(selectedListing)}>{t('Удалить объявление')}</button>}
            <p className="disclaimer">{t('Покупка и расчёты станут доступны после подключения безопасного механизма сделки.')}</p>
          </section> : <>
            <div className="market-head">
              <div><h2>P2P маркетплейс</h2><p className="muted">Пользователи устанавливают собственные цены.</p></div>
            </div>
            <div className="panel">
              <h3><Plus size={18} /> Создать объявление</h3>
              <form className="listing-form" onSubmit={addListing}>
                <label>Цена за юнит<input type="number" min="0.00000001" step="any" placeholder="Введите цену" value={price} onChange={e => setPrice(e.target.value)} /></label>
                <label>Криптовалюта<select value={assetCode} onChange={e => setAssetCode(e.target.value)} required><option value="">Выберите криптовалюту</option><option value="USDT">USDT</option><option value="BTC">BTC</option><option value="ETH">ETH</option><option value="TON">TON</option><option value="USDC">USDC</option></select></label>
                {showListingPreview && <div className="seller-net-preview">
                  <div><span>Вы получите за одну карточку</span><b>{money(listingUnitNet)} {assetCode}</b></div>
                  <div><span>Цена одной карточки</span><b>{money(listingGross)} {assetCode}</b></div>
                  <div><span>Удержание при продаже</span><b>{money(listingFee)} {assetCode}</b></div>
                  <div className="seller-net-total"><span>Всего к получению</span><b>{money(listingNet)} {assetCode}</b></div>
                </div>}
                <button className="primary" type="submit" disabled={busy || !showListingPreview}>{busy ? 'Выставляем...' : 'Выставить'}</button>
              </form>
            </div>
            <div className="section-title">ЮНИТЫ В ПРОДАЖЕ</div>
            <div className="listing-list">
              {marketLoading ? <p className="muted">Загружаем предложения...</p>
                : marketError ? <p className="muted">Не удалось загрузить предложения: {marketError}</p>
                : listings.length === 0 ? <div className="panel"><h3>Пока нет юнитов в продаже</h3><p className="muted">Когда пользователи разместят реальные юниты, предложения появятся здесь.</p></div>
                : listings.map(item => <div className="listing market-card market-card-compact" key={item.id}>
                  <div className="listing-avatar">{item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : <UserRound />}</div>
                  <div className="listing-info"><b>{item.seller}</b><span>VORTEX UNIT · № {item.serialNumbers?.[0] || 'Номер уточняется'}</span></div>
                  <div className="listing-price"><b>{item.price.toLocaleString('en-US', { maximumFractionDigits: 8 })} {item.assetCode}</b><span>за одну карточку</span></div>
                  <button type="button" className="outline market-open-detail" onClick={() => setSelectedListing(item)}>{t('Подробнее')}</button>
                  {item.isMine && <button type="button" className="outline" disabled={busy} onClick={() => cancelOwnListing(item)}>{t('Удалить объявление')}</button>}
                </div>)}
            </div>
            {listingCount > 5 && <nav className="market-pagination" aria-label={t('Страницы объявлений')}>
              <button type="button" className="outline" disabled={listingPage <= 1 || marketLoading} onClick={() => { const next = listingPage - 1; setListingPage(next); loadMarketplace(next) }}>{t('Назад')}</button>
              <span>{t('Страница')} {listingPage} {t('из')} {Math.ceil(listingCount / 5)}</span>
              <button type="button" className="outline" disabled={listingPage >= Math.ceil(listingCount / 5) || marketLoading} onClick={() => { const next = listingPage + 1; setListingPage(next); loadMarketplace(next) }}>{t('Далее')}</button>
            </nav>}
            <button type="button" className="outline" onClick={() => loadMarketplace(listingPage)} disabled={marketLoading}>Обновить предложения</button>
            <p className="disclaimer">В витрине отображаются только реальные активные объявления из базы данных. Покупка и расчёты будут доступны после подключения безопасного механизма сделки.</p>
          </>}
        </>}

        {tab === 'referrals' && <>
          <div className="panel referral-panel">
            <div className="ref-icon"><Users /></div>
            <h2>Расти вместе с VORTEX</h2>
            <p className="muted">Пригласивший получает 1 дополнительный юнит после подтверждённой регистрации реферала. Новый пользователь получает стартовый юнит.</p>
            <div className="ref-link">
              <span>{referralLink}</span>
              <button type="button" onClick={() => navigator.clipboard?.writeText(referralLink).then(() => setNotice('Ссылка скопирована')).catch(() => setNotice('Не удалось скопировать ссылку'))}><Copy size={17} /></button>
            </div>
            <div className="stats mini">
              <Stat label="ПРИГЛАШЕНО" value={referrals} icon={<Users />} />
              <Stat label="НАГРАДА" value="+1 UNIT" icon={<CreditCard />} />
            </div>
          </div>
        </>}

        {tab === 'profile' && <div className="profile-dashboard">
          <section className="panel auth-panel profile-account">
            <h2>{user ? t('Аккаунт') : t('Вход или регистрация')}</h2>
            {user && authMode !== 'reset' ? <>
              <div className="profile-summary-card">
                <div className="profile-avatar-preview">
                  {user.user_metadata?.avatar_url
                    ? <img src={user.user_metadata.avatar_url} alt={t('Аватар профиля')} />
                    : <UserRound size={38} />}
                </div>
                <div className="profile-summary-copy">
                  <b>{user.user_metadata?.username || t('Пользователь')}</b>
                  <span>{user.email}</span>
                  <button type="button" className="primary" onClick={() => setProfileSettingsOpen(true)}>{t('Настройки профиля')}</button>
                </div>
              </div>
              {profileSettingsOpen && <section className="profile-settings-panel">
                <div className="profile-settings-heading">
                  <h3>{t('Настройки профиля')}</h3>
                  <button type="button" className="outline" onClick={() => setProfileSettingsOpen(false)}>{t('Назад')}</button>
                </div>
                <div className="profile-avatar-card">
                  <div className="profile-avatar-preview">
                    {user.user_metadata?.avatar_url
                      ? <img src={user.user_metadata.avatar_url} alt={t('Аватар профиля')} />
                      : <UserRound size={38} />}
                  </div>
                  <div className="profile-avatar-copy">
                    <b>{t('Фото профиля')}</b>
                    <span>{t('Загрузите изображение JPG, PNG или WEBP до 5 МБ. Его увидят другие пользователи.')}</span>
                    <div className="profile-avatar-actions">
                      <label className="primary avatar-upload-label">
                        {avatarBusy ? t('Загружаем...') : user.user_metadata?.avatar_url ? t('Изменить фото') : t('Загрузить аватар')}
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={avatarBusy} />
                      </label>
                      {user.user_metadata?.avatar_url && <button type="button" className="outline" onClick={removeAvatar} disabled={avatarBusy}>{t('Удалить')}</button>}
                    </div>
                  </div>
                </div>
                <form className="username-settings" onSubmit={saveUsername}>
                  <label>{t('Имя пользователя (псевдоним)')}
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder={t('Например, VORTEX')} minLength="2" maxLength="24" autoComplete="nickname" />
                  </label>
                  <p className="muted">{t('Придумайте любое имя. Не указывайте здесь email или настоящее имя, если хотите сохранить приватность.')}</p>
                  <button type="submit" className="primary full" disabled={usernameBusy}>{usernameBusy ? t('Сохраняем...') : t('Сохранить имя пользователя')}</button>
                </form>
                <p className="muted">{t('Email аккаунта (виден только вам):')} {user.email}</p>
                <div className="push-settings-row">
                  <div className="push-settings-copy">
                    <b>{t('Push-уведомления')}</b>
                    <span>{pushServerReady ? t('Получать важные сообщения VORTEX UNIT на этом устройстве.') : t('Разрешение сохраняется. Сервер отправки будет подключён отдельно.')}</span>
                  </div>
                  <label className="push-switch" aria-label={t('Получать push-уведомления')}>
                    <input type="checkbox" checked={pushEnabled} disabled={pushBusy} onChange={event => savePushPreference(event.target.checked)} />
                    <span className="push-switch-track"></span>
                  </label>
                </div>
                <div className="account-danger-actions">
                  <button type="button" className="outline" onClick={logout} disabled={busy || deleteBusy}>{t('Выйти')}</button>
                  <button type="button" className="delete-account-btn" onClick={() => { setDeleteDialogOpen(true); setDeletePhrase('') }} disabled={busy || deleteBusy}>{t('Удалить аккаунт')}</button>
                </div>
                {deleteDialogOpen && <div className="delete-dialog-backdrop" role="presentation">
                  <section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
                    <h3 id="delete-account-title">{t('Удалить аккаунт навсегда?')}</h3>
                    <p>{t('Будет удалена ваша учётная запись VORTEX UNIT и связанные с ней данные. Доступ к аккаунту с сайта и установленного приложения прекратится. Это действие нельзя отменить.')}</p>
                    <p className="delete-dialog-warning">{t('Если у вас есть юниты, объявления или финансовая история, они также могут быть удалены вместе с аккаунтом.')}</p>
                    <form onSubmit={deleteAccount}>
                      <label>{t('Для подтверждения напишите УДАЛИТЬ')}
                        <input value={deletePhrase} onChange={event => setDeletePhrase(event.target.value)} autoComplete="off" placeholder="УДАЛИТЬ" />
                      </label>
                      <div className="delete-dialog-actions">
                        <button type="button" className="outline" disabled={deleteBusy} onClick={() => { setDeleteDialogOpen(false); setDeletePhrase('') }}>{t('Отмена')}</button>
                        <button type="submit" className="delete-account-btn" disabled={deleteBusy || deletePhrase.trim().toUpperCase() !== 'УДАЛИТЬ'}>{deleteBusy ? t('Удаляем...') : t('Удалить навсегда')}</button>
                      </div>
                    </form>
                  </section>
                </div>}
              </section>}
            </> : authMode === 'forgot' ? <form onSubmit={sendPasswordReset}>
              <p className="muted">{t('Укажите email, который использовали при регистрации. Мы отправим на него ссылку для восстановления доступа.')}</p>
              <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
              <button type="submit" className="primary full" disabled={busy}>{busy ? t('Отправляем...') : t('Отправить ссылку')}</button>
              <button type="button" className="outline full" disabled={busy} onClick={() => { setAuthMode('login'); setNotice('') }}>{t('Вернуться ко входу')}</button>
            </form> : authMode === 'reset' ? <form onSubmit={saveNewPassword}>
              <p className="muted">{t('Придумайте новый пароль для своего аккаунта.')}</p>
              <label>{t('Новый пароль')}<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} minLength="6" required autoComplete="new-password" /><button type="button" className="password-toggle" aria-label={showPassword ? t('Скрыть пароль') : t('Показать пароль')} onClick={() => setShowPassword(v => !v)}><Eye size={18} /></button></div></label>
              <label>{t('Повторите новый пароль')}<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} minLength="6" required autoComplete="new-password" /><button type="button" className="password-toggle" aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShowPassword(v => !v)}><Eye size={18} /></button></div></label>
              <button type="submit" className="primary full" disabled={busy}>{busy ? t('Сохраняем...') : t('Сохранить новый пароль')}</button>
            </form> : <form onSubmit={signIn}>
              <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
              <label>{t('Пароль')}<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} minLength="6" required autoComplete="current-password" /><button type="button" className="password-toggle" aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShowPassword(v => !v)}><Eye size={18} /></button></div></label>
              <button type="submit" className="primary full" disabled={busy}>{busy ? t('Подождите...') : t('Войти')}</button>
              <button type="button" className="outline full" disabled={busy} onClick={signUp}>{busy ? t('Подождите...') : t('Создать аккаунт')}</button>
              <button type="button" className="outline full" disabled={busy} onClick={resendConfirmation}>{busy ? t('Отправляем...') : t('Отправить письмо подтверждения повторно')}</button>
              <button type="button" className="outline full" disabled={busy} onClick={() => { setAuthMode('forgot'); setNotice('') }}>{t('Забыли пароль?')}</button>
            </form>}
          </section>
          {user && <>
            <section className="panel">
              <h3>{t('Передать юниты')}</h3>
              <p className="muted">{t('Укажите email получателя и количество свободных юнитов. Юниты, выставленные на маркетплейс, передать нельзя.')}</p>
              <form onSubmit={transferCards}>
                <label>{t('Email получателя')}<input type="email" value={transferEmail} onChange={e => setTransferEmail(e.target.value)} placeholder="user@example.com" required /></label>
                <label>{t('Количество юнитов')}<input type="number" min="1" max="100" step="1" value={transferQuantity} onChange={e => setTransferQuantity(e.target.value)} required /></label>
                <button type="submit" className="primary full" disabled={busy}>{busy ? t('Выполняется...') : t('Передать юниты')}</button>
              </form>
            </section>
            <section className="panel profile-financial">
              <div className="admin-head"><Wallet /><h3>{t('Финансовый кабинет')}</h3></div>
              <p className="muted">{t('Данные загружаются из Supabase. Балансы рассчитываются по записям финансового журнала; заявки сами по себе не означают поступление или выплату средств.')}</p>
              {financial.loading ? <p className="muted">{t('Загрузка данных...')}</p> : financial.error ? <p className="muted">{t('Ошибка загрузки:')} {financial.error}</p> : <>
                <h3>{t('Баланс по активам')}</h3>
                <div className="admin-stats-grid">
                  {['USDT','BTC','ETH','TON','USDC','VTX'].map(asset => {
                    const total = financial.ledger.filter(entry => entry.asset_code === asset).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
                    return <Stat key={asset} label={asset} value={total.toFixed(6)} icon={<Wallet />} />
                  })}
                </div>
                <div className="financial-history">
                  <h3>{t('История операций')}</h3>
                  <div className="financial-history-tabs" role="tablist" aria-label={t('История операций')}>
                    <button type="button" role="tab" aria-selected={historyTab === 'deposits'} className={historyTab === 'deposits' ? 'active' : ''} onClick={() => setHistoryTab('deposits')}>{t('Пополнения')} ({financial.deposits.length})</button>
                    <button type="button" role="tab" aria-selected={historyTab === 'withdrawals'} className={historyTab === 'withdrawals' ? 'active' : ''} onClick={() => setHistoryTab('withdrawals')}>{t('Выводы')} ({financial.withdrawals.length})</button>
                    <button type="button" role="tab" aria-selected={historyTab === 'exchanges'} className={historyTab === 'exchanges' ? 'active' : ''} onClick={() => setHistoryTab('exchanges')}>{t('Обмен VTX')} ({financial.exchanges.length})</button>
                  </div>
                  {historyTab === 'deposits' && (financial.deposits.length === 0
                    ? <p className="muted">{t('Пополнений пока нет.')}</p>
                    : financial.deposits.map(item => <div className="financial-history-item" key={item.id}>
                      <div><b>{item.asset_code} · {t('Пополнение')}</b><span>{item.network} · {new Date(item.created_at).toLocaleString()}</span></div>
                      <div className="financial-history-amount"><b>{Number(item.amount_received ?? item.amount_expected ?? 0).toFixed(6)} {item.asset_code}</b><span className={'history-status status-' + item.status}>{t('Статус')}: {t(item.status)}</span></div>
                    </div>))}
                  {historyTab === 'withdrawals' && (financial.withdrawals.length === 0
                    ? <p className="muted">{t('Выводов пока нет.')}</p>
                    : financial.withdrawals.map(item => <div className="financial-history-item" key={item.id}>
                      <div><b>{item.asset_code} · {t('Вывод')}</b><span>{item.network} · {new Date(item.created_at).toLocaleString()}</span></div>
                      <div className="financial-history-amount"><b>{Number(item.amount).toFixed(6)} {item.asset_code}</b><span>{t('Комиссия')}: {Number(item.fee || 0).toFixed(6)} {item.asset_code}</span><span className={'history-status status-' + item.status}>{t('Статус')}: {t(item.status)}</span></div>
                    </div>))}
                  {historyTab === 'exchanges' && (financial.exchanges.length === 0
                    ? <p className="muted">{t('Обменов пока нет.')}</p>
                    : financial.exchanges.map(item => <div className="financial-history-item" key={item.id}>
                      <div><b>{t('Обмен VTX')}</b><span>{new Date(item.created_at).toLocaleString()}</span></div>
                      <div className="financial-history-amount"><b>{Number(item.amount_in).toFixed(6)} {item.from_asset} → {item.amount_out == null ? '—' : Number(item.amount_out).toFixed(6) + ' VTX'}</b><span className={'history-status status-' + item.status}>{t('Статус')}: {t(item.status)}</span></div>
                    </div>))}
                </div>
              </>}
              <button type="button" className="outline" onClick={loadFinancialData} disabled={financial.loading}>{t('Обновить финансовые данные')}</button>
            </section>
            <section className="panel profile-cards">
              <div className="admin-head"><CreditCard /><h3>{t('Мои юниты')}</h3></div>
              <p className="muted">{t('Ваши юниты, зарегистрированные в реестре VORTEX UNIT.')}</p>
              <div className="owned-card-count">{financial.cards.filter(card => card.status !== 'retired').length} <span>{t('карточек')}</span></div>
              {financial.loading ? <p className="muted">{t('Загрузка юнитов...')}</p> : financial.error ? <p className="muted">{t('Юниты пока не удалось загрузить.')}</p> : financial.cards.filter(card => card.status !== 'retired').length === 0
                ? <div className="empty-cards"><CreditCard size={30} /><b>{t('Пока нет юнитов')}</b><span>{t('Когда юниты будут выпущены и закреплены за вашим аккаунтом, они появятся здесь.')}</span></div>
                : <div className="owned-cards-grid">
                  {financial.cards.filter(card => card.status !== 'retired').map((card, index) => <div className="owned-card" key={card.id}>
                    <div className="owned-card-top"><span>VORTEX</span><span>№ {String(index + 1).padStart(3, '0')}</span></div>
                    <div className="owned-card-symbol">V</div>
                    <div className="owned-card-bottom"><b>{card.serial_number}</b><span>{card.status === 'listed' ? 'На продаже' : card.status === 'reserved' ? 'Зарезервирована' : card.status === 'sold' ? 'Продана' : 'Владелец'}</span></div>
                  </div>)}
                </div>}
              <button type="button" className="outline" onClick={loadFinancialData} disabled={financial.loading}>{t('Обновить юниты')}</button>
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
            <h3>Выпустить юнит пользователю</h3>
            <p className="muted">Укажите UUID пользователя из таблицы user_accounts и уникальный серийный номер. Выпуск создаёт запись в реестре карточек.</p>
            <form className="listing-form" onSubmit={issueCard}>
              <label>UUID пользователя<input value={issueOwnerId} onChange={e => setIssueOwnerId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required /></label>
              <label>Серийный номер<input value={issueSerial} onChange={e => setIssueSerial(e.target.value)} placeholder="VTX-000001" required /></label>
              <button type="submit" className="primary" disabled={adminActionBusy}>{adminActionBusy ? 'Выполняется...' : 'Выпустить юнит'}</button>
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
                              {table.name === 'disputes' && row.status !== 'resolved' && <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_resolve_dispute', { p_dispute_id: row.id, p_resolution: 'Решено администратором VORTEX UNIT' }, 'Спор закрыт. Решение записано.')}>Закрыть спор</button>}
                              {table.name === 'buyback_requests' && !['approved','rejected'].includes(row.status) && <>
                                <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_review_buyback', { p_request_id: row.id, p_approved: true, p_note: 'Заявка одобрена. Выплата не произведена.' }, 'Заявка на выкуп одобрена без проведения выплаты.')}>Одобрить</button>
                                <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_review_buyback', { p_request_id: row.id, p_approved: false, p_note: 'Заявка отклонена администратором.' }, 'Заявка на выкуп отклонена.')}>Отклонить</button>
                              </>}
                              {table.name === 'card_inventory' && row.status !== 'sold' && <button type="button" className="outline admin-row-action" disabled={adminActionBusy} onClick={() => runAdminAction('admin_set_card_retired', { p_card_id: row.id, p_retired: row.status !== 'retired' }, row.status === 'retired' ? 'Юнит восстановлен.' : 'Юнит выведен из обращения.')}>{row.status === 'retired' ? 'Восстановить' : 'Вывести из обращения'}</button>}
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
            <h2 id="push-consent-title">Разрешить уведомления VORTEX UNIT?</h2>
            <p>Будем присылать важные сообщения о вашем аккаунте и работе платформы. Вы сможете в любой момент отключить их в настройках профиля.</p>
            <button type="button" className="primary full" disabled={pushBusy} onClick={() => savePushPreference(true)}>{pushBusy ? 'Сохраняем...' : 'Согласен получать'}</button>
            <button type="button" className="outline full" disabled={pushBusy} onClick={() => savePushPreference(false)}>Не согласен</button>
          </section>
        </div>}
        <footer>© 2026 VORTEX UNIT <span>VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО</span></footer>
      </main>
    </div>
  </div>

  if (authLoading) return <div className="public-loading"><div className="brand-mark"><span className="brand-gem" aria-hidden="true"><svg viewBox="0 0 512 512" focusable="false"><path d="M256 64 424 160v192L256 448 88 352V160z" fill="none" stroke="#8b5cf6" strokeWidth="24"/><path d="m150 188 106 62 106-62M256 250v124" fill="none" stroke="#25e6d2" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span>VORTEX <b>UNIT</b></span></div><p>Проверяем вход в аккаунт...</p></div>

  if (!user) {
    const openPublicAuth = mode => {
      setAuthMode(mode)
      setPublicAuthOpen(true)
      setNotice('')
    }
    const publicPage = <div className="public-shell">
      <header className="public-topbar">
        <div className="brand-mark"><span className="brand-gem" aria-hidden="true"><svg viewBox="0 0 512 512" focusable="false"><path d="M256 64 424 160v192L256 448 88 352V160z" fill="none" stroke="#8b5cf6" strokeWidth="24"/><path d="m150 188 106 62 106-62M256 250v124" fill="none" stroke="#25e6d2" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span>VORTEX <b>UNIT</b></span></div>
        <div className="public-top-actions">
          <label className="language-picker" aria-label="Language"><span>🌐</span><select value={language} onChange={e => setLanguage(e.target.value)}><option value="uk">Українська</option><option value="ru">Русский</option><option value="en">English</option><option value="de">Deutsch</option><option value="fr">Français</option></select></label>
          <button type="button" className="outline" onClick={() => openPublicAuth('login')}>Войти</button>
          <button type="button" className="primary" onClick={() => openPublicAuth('signup')}>Зарегистрироваться</button>
        </div>
      </header>
      <main className="public-main">
        {publicInfoPage ? <section className="public-info-page">
          <button type="button" className="outline public-back" onClick={() => setPublicInfoPage('')}>← На главную</button>
          {publicInfoPage === 'terms' ? <>
            <h1>Пользовательское соглашение</h1>
            <p>На этой странице будет размещён полный текст пользовательского соглашения VORTEX UNIT.</p>
            <p>Документ подготовим отдельно, чтобы точно описать правила использования платформы, аккаунтов, цифровых юнитов и доступных функций.</p>
          </> : <>
            <h1>FAQ — Частые вопросы</h1>
            <div className="public-faq-list">
              <article><h3>Что такое VORTEX UNIT?</h3><p>VORTEX UNIT — платформа для управления цифровыми юнитами, участия в сообществе и использования доступных функций маркетплейса.</p></article>
              <article><h3>Как создать аккаунт?</h3><p>Нажмите «Зарегистрироваться» в верхней части сайта и следуйте инструкциям на экране.</p></article>
              <article><h3>Как войти в свой аккаунт?</h3><p>Нажмите «Войти» и укажите email и пароль, использованные при регистрации.</p></article>
              <article><h3>Где обратиться за помощью?</h3><p>Войдите в аккаунт и откройте раздел «Поддержка» в меню сайта.</p></article>
              <article><h3>Как установить приложение?</h3><p>Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран», если такая возможность доступна.</p></article>
            </div>
          </>}
        </section> : <>
        <section className="public-hero">
          <div className="public-copy">
            <div className="pill"><Sparkles size={14} /> VORTEX · COLLECTOR COMMUNITY</div>
            <h1>Твоя коллекция.<br /><span>Твои правила.</span></h1>
            <p>Находи редкие карточки, публикуй запросы, общайся с коллекционерами и развивай свою коллекцию вместе с VORTEX.</p>
            <div className="public-cta">
              <button type="button" className="primary" onClick={() => openPublicAuth('signup')}>Создать аккаунт</button>
              <button type="button" className="outline" onClick={() => openPublicAuth('login')}>У меня уже есть аккаунт</button>
            </div>
          </div>
          <div className="hero-card public-card">
            <div className="card-top"><span>VORTEX</span><span>COLLECTOR COMMUNITY</span></div>
            <div className="card-geometry" aria-hidden="true">
              <svg viewBox="0 0 64 64" focusable="false">
                <path d="M32 4 54 17v30L32 60 10 47V17L32 4Z" />
                <path d="M32 4v27m22-14L32 31 10 17m44 30L32 31 10 47m22-16v29" />
                <path d="m20 23 12-7 12 7v18l-12 7-12-7V23Z" />
                <path d="m20 23 12 8 12-8M32 31v17" />
              </svg>
            </div>
            <div className="card-bottom"><b>VORTEX</b><span>COLLECT · CONNECT · TRADE</span></div>
          </div>
        </section>
        <section className="public-features">
          <article><Store /><b>P2P-маркетплейс</b><span>Просмотр предложений и торговые функции для пользователей.</span></article>
          <article><Users /><b>Сообщество</b><span>Приглашайте друзей и развивайтесь вместе с VORTEX.</span></article>
        </section>
        {notice && <div className="notice" role="status"><span>{notice}</span><button type="button" aria-label="Закрыть" onClick={() => setNotice('')}>×</button></div>}
        {publicAuthOpen && <div className="public-auth-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) { setPublicAuthOpen(false); setNotice('') } }}>
          <section className="panel auth-panel public-auth-panel" id="public-auth" role="dialog" aria-modal="true" aria-labelledby="public-auth-title">
          <div className="public-auth-heading"><h2 id="public-auth-title">{authMode === 'signup' ? 'Регистрация VORTEX UNIT' : authMode === 'forgot' ? 'Восстановление пароля' : authMode === 'reset' ? 'Новый пароль' : 'Вход в аккаунт'}</h2><button type="button" className="outline" onClick={() => { setPublicAuthOpen(false); setNotice('') }}>Закрыть</button></div>
          {authMode === 'forgot' ? <form onSubmit={sendPasswordReset}>
            <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
            <button type="submit" className="primary full" disabled={busy}>{busy ? 'Отправляем...' : 'Отправить ссылку'}</button>
            <button type="button" className="outline full" onClick={() => setAuthMode('login')}>Вернуться ко входу</button>
          </form> : authMode === 'reset' ? <form onSubmit={saveNewPassword}>
            <label>Новый пароль<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} minLength="6" required autoComplete="new-password" /><button type="button" className="password-toggle" aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShowPassword(v => !v)}><Eye size={18} /></button></div></label>
            <label>Повторите новый пароль<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} minLength="6" required autoComplete="new-password" /><button type="button" className="password-toggle" aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShowPassword(v => !v)}><Eye size={18} /></button></div></label>
            <button type="submit" className="primary full" disabled={busy}>{busy ? 'Сохраняем...' : 'Сохранить новый пароль'}</button>
          </form> : <form onSubmit={authMode === 'signup' ? e => { e.preventDefault(); signUp() } : signIn}>
            <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
            <label>Пароль<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} minLength="6" required autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} /><button type="button" className="password-toggle" aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShowPassword(v => !v)}><Eye size={18} /></button></div></label>
            <button type="submit" className="primary full" disabled={busy}>{busy ? 'Подождите...' : authMode === 'signup' ? 'Зарегистрироваться' : 'Войти'}</button>
            {authMode === 'login' && <button type="button" className="outline full" disabled={busy} onClick={() => setAuthMode('forgot')}>Забыли пароль?</button>}
            <button type="button" className="outline full" disabled={busy} onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setNotice('') }}>{authMode === 'signup' ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}</button>
          </form>}
          </section>
        </div>}
        </>}
      </main>
      <footer className="public-footer">
        <nav className="public-footer-links" aria-label="Информация">
          <button type="button" onClick={() => setPublicFooterOpen(v => v === 'contacts' ? '' : 'contacts')}>Контакты</button>
          <button type="button" onClick={() => setPublicFooterOpen(v => v === 'support' ? '' : 'support')}>Служба поддержки</button>
          <button type="button" onClick={() => { setPublicInfoPage('terms'); setPublicFooterOpen(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Пользовательское соглашение</button>
          <button type="button" onClick={() => { setPublicInfoPage('faq'); setPublicFooterOpen(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>FAQ</button>
        </nav>
        {publicFooterOpen === 'contacts' && <div className="public-footer-detail">
          <b>Контакты</b>
          <a href="mailto:support@vortexunit.com">support@vortexunit.com</a>
        </div>}
        {publicFooterOpen === 'support' && <div className="public-footer-detail">
          <b>Служба поддержки</b>
          <p>Форма обращения доступна после входа в аккаунт, в разделе «Поддержка».</p>
          <button type="button" className="outline" onClick={() => { setPublicFooterOpen(''); openPublicAuth('login') }}>Войти в аккаунт</button>
        </div>}
        <div className="public-footer-copy">© 2026 VORTEX UNIT <span>VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО</span></div>
      </footer>
    </div>
    return translateTree(publicPage, language, translations)
  }

  return translateTree(page, language, translations)
}


function SupportCenter({ userEmail = '', language = 'ru' }) {
  const [replyEmail, setReplyEmail] = useState(userEmail || '')
  const [topic, setTopic] = useState('Вопрос по аккаунту')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const copy = {
    ru: {title:'Центр поддержки',sub:'Мы на связи и готовы помочь.',email:'Ваш email для ответа',topic:'Тема обращения',message:'Опишите, чем мы можем помочь',send:'Написать в поддержку',direct:'Или напишите нам напрямую',hint:'При отправке откроется почтовое приложение с уже подготовленным письмом.',success:'Почтовое приложение открыто. Завершите отправку письма.',topics:['Вопрос по аккаунту','Проблема с входом','Юниты и переводы','Маркетплейс','Сообщить об ошибке','Другое'],required:'Укажите email и сообщение.'},
    uk: {title:'Центр підтримки',sub:'Ми на зв’язку та готові допомогти.',email:'Ваш email для відповіді',topic:'Тема звернення',message:'Опишіть, чим ми можемо допомогти',send:'Написати до підтримки',direct:'Або напишіть нам напряму',hint:'Відкриється поштова програма з підготовленим листом.',success:'Поштову програму відкрито. Завершіть надсилання листа.',topics:['Питання щодо акаунта','Проблема зі входом','Юніти та перекази','Маркетплейс','Повідомити про помилку','Інше'],required:'Вкажіть email і повідомлення.'},
    en: {title:'Support Center',sub:'We are here and ready to help.',email:'Your reply email',topic:'Request topic',message:'Tell us how we can help',send:'Contact support',direct:'Or email us directly',hint:'Your email app will open with a prepared message.',success:'Email app opened. Please finish sending your message.',topics:['Account question','Login problem','Units and transfers','Marketplace','Report a bug','Other'],required:'Enter your email and message.'},
    de: {title:'Support-Center',sub:'Wir sind für Sie da und helfen gerne.',email:'Ihre Antwort-E-Mail',topic:'Thema der Anfrage',message:'Wie können wir Ihnen helfen?',send:'Support kontaktieren',direct:'Oder schreiben Sie uns direkt',hint:'Ihre E-Mail-App öffnet sich mit einer vorbereiteten Nachricht.',success:'E-Mail-App geöffnet. Bitte senden Sie die Nachricht ab.',topics:['Frage zum Konto','Anmeldeproblem','Units und Übertragungen','Marktplatz','Fehler melden','Sonstiges'],required:'E-Mail und Nachricht eingeben.'},
    fr: {title:'Centre d’assistance',sub:'Nous sommes là pour vous aider.',email:'Votre adresse e-mail',topic:'Sujet de la demande',message:'Comment pouvons-nous vous aider ?',send:'Contacter le support',direct:'Ou écrivez-nous directement',hint:'Votre application e-mail s’ouvrira avec un message préparé.',success:'Application e-mail ouverte. Veuillez envoyer le message.',topics:['Question sur le compte','Problème de connexion','Units et transferts','Marketplace','Signaler un bug','Autre'],required:'Saisissez votre e-mail et votre message.'}
  }
  const c = copy[language] || copy.ru
  function submit(e) {
    e.preventDefault()
    if (!replyEmail.trim() || !message.trim()) { window.alert(c.required); return }
    const subject = '[VORTEX UNIT] ' + topic
    const body = 'Email для ответа: ' + replyEmail.trim() + '\\n\\n' + message.trim()
    window.location.href = 'mailto:support@vortexunit.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body)
    setSent(true)
  }
  return <section className="support-center">
    <div className="support-heading"><div className="support-mark"><Mail size={25} /></div><div><div className="eyebrow">VORTEX UNIT · CARE</div><h2>{c.title}</h2><p>{c.sub}</p></div></div>
    <form className="support-form" onSubmit={submit}>
      <label>{c.email}<input type="email" value={replyEmail} onChange={e=>setReplyEmail(e.target.value)} placeholder="name@example.com" required /></label>
      <label>{c.topic}<select value={topic} onChange={e=>setTopic(e.target.value)}>{c.topics.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>{c.message}<textarea value={message} onChange={e=>setMessage(e.target.value)} rows="6" required placeholder="..." /></label>
      <button className="primary full" type="submit"><Mail size={17}/>{c.send}</button>
      {sent && <p className="support-success">{c.success}</p>}
    </form>
    <div className="support-direct"><span>{c.direct}</span><a href="mailto:support@vortexunit.com">support@vortexunit.com</a></div>
    <p className="support-hint">{c.hint}</p>
  </section>
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

function Quick({ icon, title, desc, click, className = '' }) {
  return <button type="button" className={`quick ${className}`} onClick={click}>
    <div className="quick-icon">{icon}</div>
    <div><b>{title}</b><span>{desc}</span></div>
    <span className="arrow">↗</span>
  </button>
}

createRoot(document.getElementById('root')).render(<App />)
              
