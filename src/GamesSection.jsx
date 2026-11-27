import React, { useMemo, useState } from 'react'
import { Brain, LockKeyhole, Trophy, RotateCcw, Sparkles, Target, Zap } from 'lucide-react'

function makeSecret() {
  const digits = ['0','1','2','3','4','5','6','7','8','9']
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[digits[i], digits[j]] = [digits[j], digits[i]]
  }
  return digits.slice(0, 4).join('')
}

function makeDeck() {
  const symbols = ['◆','✦','⬡','◈','✧','●']
  return [...symbols, ...symbols]
    .map((symbol, index) => ({ id: index, symbol }))
    .sort(() => Math.random() - 0.5)
}

export default function GamesSection({ user, onNotice }) {
  const [activeGame, setActiveGame] = useState('code')
  const [secret, setSecret] = useState(makeSecret)
  const [guess, setGuess] = useState('')
  const [attempts, setAttempts] = useState([])
  const [codeStatus, setCodeStatus] = useState('playing')
  const [deck, setDeck] = useState(makeDeck)
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [sessionPoints, setSessionPoints] = useState(0)
  const [dailyDone, setDailyDone] = useState(false)

  const memoryComplete = matched.length === deck.length
  const codeHint = useMemo(() => {
    if (!attempts.length) return 'У каждого числа своя позиция. Все четыре цифры разные.'
    return 'П — цифра на своём месте. Н — цифра есть, но стоит не там.'
  }, [attempts.length])

  function resetCode() {
    setSecret(makeSecret())
    setGuess('')
    setAttempts([])
    setCodeStatus('playing')
  }

  function submitGuess(e) {
    e.preventDefault()
    if (guess.length !== 4 || new Set(guess).size !== 4 || codeStatus !== 'playing') return
    const exact = guess.split('').filter((digit, i) => secret[i] === digit).length
    const present = guess.split('').filter(digit => secret.includes(digit)).length - exact
    const next = [...attempts, { value: guess, exact, present }]
    setAttempts(next)
    setGuess('')
    if (exact === 4) {
      setCodeStatus('won')
      setSessionPoints(value => value + Math.max(20, 100 - (next.length - 1) * 10))
    } else if (next.length >= 8) {
      setCodeStatus('lost')
    }
  }

  function flipCard(id) {
    if (flipped.includes(id) || matched.includes(id) || flipped.length === 2 || memoryComplete) return
    const next = [...flipped, id]
    setFlipped(next)
    if (next.length === 2) {
      setMoves(value => value + 1)
      const first = deck.find(card => card.id === next[0])
      const second = deck.find(card => card.id === next[1])
      if (first.symbol === second.symbol) {
        setMatched(value => [...value, ...next])
        setFlipped([])
        if (matched.length + 2 === deck.length) setSessionPoints(value => value + 60)
      } else {
        window.setTimeout(() => setFlipped([]), 700)
      }
    }
  }

  function resetMemory() {
    setDeck(makeDeck())
    setFlipped([])
    setMatched([])
    setMoves(0)
  }

  function completeDaily() {
    if (dailyDone) return
    setDailyDone(true)
    setSessionPoints(value => value + 25)
  }

  return (
    <div className="games-page">
      <section className="games-hero">
        <div className="games-hero-copy">
          <span className="games-kicker"><Sparkles size={14} /> VORTEX ENTERTAINMENT</span>
          <h2>VORTEX <span>GAMES</span></h2>
          <p>Испытай логику, память и внимательность. Играй, улучшай результаты и готовься к турнирам сообщества.</p>
          <div className="games-session-score"><Trophy size={18} /><div><b>{sessionPoints}</b><small>Очки в этой игровой сессии</small></div></div>
        </div>
        <div className="games-hero-emblem"><Zap size={54} /></div>
      </section>

      {!user && <div className="games-login-note">Играть можно прямо сейчас. Для будущих турниров и получения наград понадобится войти в аккаунт VORTEX.</div>}

      <div className="games-tabs">
        <button type="button" className={activeGame === 'code' ? 'active' : ''} onClick={() => setActiveGame('code')}><LockKeyhole size={17}/> Взлом кода</button>
        <button type="button" className={activeGame === 'memory' ? 'active' : ''} onClick={() => setActiveGame('memory')}><Brain size={17}/> Найди пару</button>
      </div>

      {activeGame === 'code' && <section className="games-panel">
        <div className="games-panel-heading"><div><span className="games-kicker">ИГРА 01 · ЛОГИКА</span><h3>Взлом кода</h3><p>Найди секретную комбинацию из четырёх разных цифр за восемь попыток.</p></div><div className="games-icon"><LockKeyhole size={25}/></div></div>
        <div className="code-slots">{[0,1,2,3].map(i => <span key={i}>{guess[i] || '·'}</span>)}</div>
        <form className="code-entry" onSubmit={submitGuess}>
          <input aria-label="Четыре цифры кода" inputMode="numeric" autoComplete="off" maxLength={4} value={guess} disabled={codeStatus !== 'playing'} onChange={e => setGuess(e.target.value.replace(/[^0-9]/g, '').split('').filter((v,i,a) => a.indexOf(v) === i).slice(0,4).join(''))} placeholder="Введи 4 цифры"/>
          <button className="primary" type="submit" disabled={guess.length !== 4 || codeStatus !== 'playing'}>Проверить</button>
        </form>
        <div className="games-hint">{codeHint}</div>
        <div className="code-history">
          <div className="code-history-head"><b>Попытки</b><span>{attempts.length} / 8</span></div>
          {attempts.length === 0 ? <p className="games-empty">Здесь появятся результаты твоих попыток.</p> : attempts.map((item,index) => <div className="code-attempt" key={index}><b>{item.value.split('').join(' ')}</b><span><i>{item.exact} П</i><i>{item.present} Н</i></span></div>)}
        </div>
        {codeStatus !== 'playing' && <div className={`games-result ${codeStatus}`}>{codeStatus === 'won' ? 'Код взломан! Отличная работа. + очки за результат.' : `Попытки закончились. Секретный код: ${secret}`}</div>}
        <button type="button" className="outline games-reset" onClick={resetCode}><RotateCcw size={16}/> Новая комбинация</button>
      </section>}

      {activeGame === 'memory' && <section className="games-panel">
        <div className="games-panel-heading"><div><span className="games-kicker">ИГРА 02 · ПАМЯТЬ</span><h3>Найди пару</h3><p>Открывай карточки по две и собери все шесть совпадающих пар.</p></div><div className="games-icon teal"><Brain size={25}/></div></div>
        <div className="memory-stats"><span>ХОДЫ <b>{moves}</b></span><span>ПАРЫ <b>{matched.length / 2} / 6</b></span></div>
        <div className="memory-grid">{deck.map(card => {
          const open = flipped.includes(card.id) || matched.includes(card.id)
          return <button type="button" key={card.id} className={`memory-card ${open ? 'revealed' : ''} ${matched.includes(card.id) ? 'matched' : ''}`} onClick={() => flipCard(card.id)} aria-label={open ? `Символ ${card.symbol}` : 'Открыть карточку'}>{open ? card.symbol : 'V'}</button>
        })}</div>
        {memoryComplete && <div className="games-result won">Все пары найдены! +60 очков за результат.</div>}
        <button type="button" className="outline games-reset" onClick={resetMemory}><RotateCcw size={16}/> Перемешать карточки</button>
      </section>}

      <section className="games-daily">
        <div className="games-daily-icon"><Target size={22}/></div>
        <div className="games-daily-copy"><span className="games-kicker">ЕЖЕДНЕВНОЕ ИСПЫТАНИЕ</span><h3>Тренировка коллекционера</h3><p>Собери все пары в игре «Найди пару» и получи 25 очков игровой сессии.</p></div>
        <button type="button" className="outline" disabled={!memoryComplete || dailyDone} onClick={completeDaily}>{dailyDone ? 'Выполнено' : memoryComplete ? 'Забрать 25 очков' : 'Сначала найди пары'}</button>
      </section>

      <div className="games-reward-note"><Trophy size={17}/><p><b>Следующий этап — настоящие награды.</b> Сейчас очки считаются только в открытой игровой сессии. Подключение серверного рейтинга и выдачи уникальных карточек будет включено после настройки защищённых правил в Supabase.</p></div>
    </div>
  )
}
