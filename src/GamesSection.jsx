import React, { useState } from 'react'
import { Brain, LockKeyhole, Trophy, RotateCcw, Sparkles, Target, Zap, Award } from 'lucide-react'

function makeDeck() {
  const symbols = ['◆','✦','⬡','◈','✧','●']
  return [...symbols, ...symbols]
    .map((symbol, index) => ({ id: index, symbol }))
    .sort(() => Math.random() - 0.5)
}

export default function GamesSection({ user, onNotice, supabaseClient }) {
  const [activeGame, setActiveGame] = useState('code')
  const [gameId, setGameId] = useState('')
  const [guess, setGuess] = useState('')
  const [attempts, setAttempts] = useState([])
  const [codeStatus, setCodeStatus] = useState('idle')
  const [codeBusy, setCodeBusy] = useState(false)
  const [rewardSerial, setRewardSerial] = useState('')
  const [points, setPoints] = useState(0)
  const [deck, setDeck] = useState(makeDeck)
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [sessionPoints, setSessionPoints] = useState(0)
  const [dailyDone, setDailyDone] = useState(false)

  const memoryComplete = matched.length === deck.length

  async function startCodeGame() {
    if (!user) { onNotice?.('Войди в аккаунт, чтобы начать игру на настоящую карточку.'); return }
    if (codeBusy) return
    setCodeBusy(true)
    setGuess('')
    setAttempts([])
    setRewardSerial('')
    setCodeStatus('loading')
    try {
      const { data, error } = await supabaseClient.rpc('game_start_code')
      if (error) throw error
      setGameId(data.session_id)
      setCodeStatus('playing')
    } catch (error) {
      setGameId('')
      setCodeStatus('unavailable')
      onNotice?.(error.message?.includes('Нет свободных') ? 'Игровые карточки пока закончились. Администратор должен добавить номера в призовой фонд.' : 'Не удалось начать игру: ' + (error.message || 'ошибка сервера'))
    } finally { setCodeBusy(false) }
  }

  async function submitGuess(e) {
    e.preventDefault()
    if (guess.length !== 4 || new Set(guess).size !== 4 || codeStatus !== 'playing' || codeBusy) return
    setCodeBusy(true)
    try {
      const { data, error } = await supabaseClient.rpc('game_submit_code', {
        p_session_id: gameId,
        p_guess: guess
      })
      if (error) throw error
      setAttempts(value => [...value, { value: guess, exact: data.exact, present: data.present }])
      setGuess('')
      if (data.status === 'won') {
        setCodeStatus('won')
        setRewardSerial(data.serial_number || '')
        setPoints(data.points_awarded || 0)
        setSessionPoints(value => value + (data.points_awarded || 0))
      } else if (data.status === 'lost') {
        setCodeStatus('lost')
      }
    } catch (error) {
      onNotice?.('Не удалось проверить код: ' + (error.message || 'ошибка сервера'))
    } finally { setCodeBusy(false) }
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
          <p>Играй, проверяй логику и выигрывай настоящие коллекционные карточки с уникальными серийными номерами.</p>
          <div className="games-session-score"><Trophy size={18}/><div><b>{sessionPoints}</b><small>Очки в этой игровой сессии</small></div></div>
        </div>
        <div className="games-hero-emblem"><Zap size={54}/></div>
      </section>

      {!user && <div className="games-login-note">Тренировочная игра «Найди пару» доступна всем. Для участия в розыгрыше настоящей карточки войди в аккаунт.</div>}

      <div className="games-tabs">
        <button type="button" className={activeGame === 'code' ? 'active' : ''} onClick={() => setActiveGame('code')}><LockKeyhole size={17}/> Взлом кода</button>
        <button type="button" className={activeGame === 'memory' ? 'active' : ''} onClick={() => setActiveGame('memory')}><Brain size={17}/> Найди пару</button>
      </div>

      {activeGame === 'code' && <section className="games-panel">
        <div className="games-panel-heading"><div><span className="games-kicker">ИГРА 01 · КОЛЛЕКЦИОННЫЙ НОМЕР</span><h3>Взлом кода</h3><p>Компьютер загадал номер настоящей карточки VORTEXCARDS. Угадай четыре разные цифры за восемь попыток — и получи эту карточку в свою коллекцию.</p></div><div className="games-icon"><LockKeyhole size={25}/></div></div>
        <div className="code-slots">{[0,1,2,3].map(i => <span key={i}>{guess[i] || '·'}</span>)}</div>
        <form className="code-entry" onSubmit={submitGuess}>
          <input aria-label="Четыре цифры кода" inputMode="numeric" autoComplete="off" maxLength={4} value={guess} disabled={codeStatus !== 'playing' || codeBusy} onChange={e => setGuess(e.target.value.replace(/[^0-9]/g, '').split('').filter((v,i,a) => a.indexOf(v) === i).slice(0,4).join(''))} placeholder="Введи 4 цифры"/>
          <button className="primary" type="submit" disabled={guess.length !== 4 || codeStatus !== 'playing' || codeBusy}>{codeBusy ? 'Проверка…' : 'Проверить'}</button>
        </form>
        {codeStatus === 'idle' || codeStatus === 'unavailable' ? <div className="games-hint">Номер выбирается сервером из отдельного фонда игровых карточек. Он не раскрывается браузеру.</div> : null}
        {codeStatus === 'loading' && <div className="games-hint">Подбираем секретный номер…</div>}
        {codeStatus === 'playing' && <div className="games-hint">П — цифра на своём месте. Н — цифра есть в номере, но стоит не там. 0 — совпадений нет.</div>}
        <div className="code-legend"><span><i className="legend-exact"/> П — на месте</span><span><i className="legend-present"/> Н — не на месте</span><span><i className="legend-none"/> 0 — нет в номере</span></div>
        <div className="code-history">
          <div className="code-history-head"><b>Попытки</b><span>{attempts.length} / 8</span></div>
          {attempts.length === 0 ? <p className="games-empty">После первой проверки здесь появится подсказка.</p> : attempts.map((item,index) => <div className="code-attempt" key={index}><b>{item.value.split('').join(' ')}</b><span><i>{item.exact} П</i><i>{item.present} Н</i><i className="no-match">{4-item.exact-item.present} 0</i></span></div>)}
        </div>
        {codeStatus === 'won' && <div className="games-result won"><Award size={19}/><b>Код взломан! Карточка выиграна.</b><strong>№ {rewardSerial}</strong><span>Карточка уже закреплена за твоим аккаунтом. Начислено {points} очков.</span></div>}
        {codeStatus === 'lost' && <div className="games-result">Попытки закончились. Начни новую игру, чтобы попробовать ещё раз.</div>}
        <button type="button" className="outline games-reset" onClick={startCodeGame} disabled={codeBusy}><RotateCcw size={16}/>{codeStatus === 'playing' ? 'Сдаться и начать заново' : 'Начать игру'}</button>
      </section>}

      {activeGame === 'memory' && <section className="games-panel">
        <div className="games-panel-heading"><div><span className="games-kicker">ИГРА 02 · ПАМЯТЬ</span><h3>Найди пару</h3><p>Открывай карточки по две и собери все шесть совпадающих пар. Тренируй память перед настоящими испытаниями.</p></div><div className="games-icon teal"><Brain size={25}/></div></div>
        <div className="memory-stats"><span>ХОДЫ <b>{moves}</b></span><span>ПАРЫ <b>{matched.length / 2} / 6</b></span></div>
        <div className="memory-grid">{deck.map(card => {
          const open = flipped.includes(card.id) || matched.includes(card.id)
          return <button type="button" key={card.id} className={`memory-card ${open ? 'revealed' : ''} ${matched.includes(card.id) ? 'matched' : ''}`} onClick={() => flipCard(card.id)} aria-label={open ? `Символ ${card.symbol}` : 'Открыть карточку'}>{open ? card.symbol : 'V'}</button>
        })}</div>
        {memoryComplete && <div className="games-result won">Все пары найдены! +60 очков игровой сессии.</div>}
        <button type="button" className="outline games-reset" onClick={resetMemory}><RotateCcw size={16}/> Перемешать карточки</button>
      </section>}

      <section className="games-daily">
        <div className="games-daily-icon"><Target size={22}/></div>
        <div className="games-daily-copy"><span className="games-kicker">ЕЖЕДНЕВНОЕ ИСПЫТАНИЕ</span><h3>Тренировка коллекционера</h3><p>Собери все пары в игре «Найди пару» и получи 25 очков игровой сессии.</p></div>
        <button type="button" className="outline" disabled={!memoryComplete || dailyDone} onClick={completeDaily}>{dailyDone ? 'Выполнено' : memoryComplete ? 'Забрать 25 очков' : 'Сначала найди пары'}</button>
      </section>

      <div className="games-reward-note"><Trophy size={17}/><p><b>Как выдаются призы.</b> Сервер сам проверяет каждую попытку. Выигранный серийный номер атомарно переносится из призового фонда в твою коллекцию. Повторно выиграть или получить уже занятую карточку нельзя.</p></div>
    </div>
  )
}
