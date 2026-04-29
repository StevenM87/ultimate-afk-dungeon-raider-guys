import { useEffect, useState } from 'react'
import {
  fetchAllUsers,
  fetchPotions,
  fetchEquips,
  fetchUserCharacters,
  fetchUserPotions,
  fetchUserEquips,
  fetchCharacters,          
  fetchCharacterRecords,    
  buyItem,
} from '../services/userApi'

const TABS = ['leaderboard', 'shop', 'inventory']

function UserDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [allUsers, setAllUsers] = useState([])
  const [potions, setPotions] = useState([])
  const [equips, setEquips] = useState([])
  const [characters, setCharacters] = useState([])
  const [userPotions, setUserPotions] = useState([])
  const [userEquips, setUserEquips] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [buyingId, setBuyingId] = useState(null)
  const [allChars, setAllChars] = useState([])
  const [records, setRecords]   = useState([])

  const currentUser =
  allUsers.find((u) => Number(u.user_id) === Number(user.user_id)) || user

  const loadAll = async () => {
    setIsLoading(true)
    setError('')
    try {
        const [users, pots, eqs, chars, uPots, uEqs, allCharacters, charRecords] =
        await Promise.all([
            fetchAllUsers(),
            fetchPotions(),
            fetchEquips(),
            fetchUserCharacters(user.user_id).catch(() => []),
            fetchUserPotions(user.user_id),
            fetchUserEquips(user.user_id),
            fetchCharacters().catch(() => []), 
            fetchCharacterRecords().catch(() => []),   
        ])
        setAllUsers(users)
        setPotions(pots)
        setEquips(eqs)
        setCharacters(chars)
        setUserPotions(uPots)
        setUserEquips(uEqs)
        setAllChars(allCharacters)                    
        setRecords(Array.isArray(charRecords) ? charRecords : []) 
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const handleBuy = async (type, itemId, itemName) => {
    setBuyingId(`${type}-${itemId}`)
    setActionMessage('')
    setError('')
    try {
      await buyItem(user.user_id, type, itemId)
      setActionMessage(`Purchased ${itemName}!`)
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setBuyingId(null)
    }
  }

  /// Build leaderboard — join characters + records + users
    const myCharIds = characters.map((c) => Number(c.character_id))

    const leaderboard = allChars
    .map((char) => {
        const record = records.find((r) => Number(r.character_id) === Number(char.character_id))
        const owner  = allUsers.find((u) => Number(u.user_id) === Number(char.user_id))
        const wins   = Number(record?.wins   ?? 0)
        const losses = Number(record?.losses ?? 0)
        const total  = wins + losses
        const ratio  = total === 0 ? 0 : wins / total
        return {
            character_id:   char.character_id,
            username:       owner?.username ?? '—',   
            level:          char.level ?? 1,
            character_type: char.character_type,
            wins,
            losses,
            total,
            ratio,
        }
    })
    .sort((a, b) => b.wins - a.wins || b.ratio - a.ratio)

    const formatEquipBoosts = (boostAmount, boostType) => {
  // Split numeric values like "36-2" into ["3", "6", "-2"] since route retunrs raw cocatenated nums
  const amounts =
    String(boostAmount).match(/-?\d+/g) || []

  // Split stat names like "attackdefensespeed" that route returns 
  const types =
    String(boostType).match(/attack|defense|speed|max_hp/gi) || []

  return amounts
    .map((amount, i) => {
      const sign = Number(amount) > 0 ? '+' : ''
      return `${sign}${amount} ${types[i] ?? ''}`
    })
    .join(' | ')
}

  return (
    <div className="dash-shell">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-brand">
            <span className="dash-emblem">⚔</span>
            <div>
                <h1 className="dash-title">Ultimate AFK Dungeon Raider Guys</h1>
                <p className="dash-subtitle">
                    {user.username} &nbsp;·&nbsp;
                    <span className="gold-chip">✦ {currentUser.gold ?? 0} gold</span>
                </p>
                {characters.length > 0 && (
                    <div className="header-chars">
                        {characters.map((c) => (
                            <div key={c.character_id} className="header-char-row">
                                <span className="header-char-name">
                                    {c.character_type === 'bot' ? 'Bot' : 'Player'} {c.character_name}
                                </span>
                                <span className="header-char-stats">
                                    Lv{c.level ?? 1} &nbsp;·&nbsp;
                                    ❤ {c.current_hp}/{c.max_hp} &nbsp;·&nbsp;
                                    ⚔ {c.attack} &nbsp;·&nbsp;
                                    🛡 {c.defense} &nbsp;·&nbsp;
                                    💨 {c.speed}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        <div className="dash-hdr-actions">
          <button
            className="hdr-btn"
            type="button"
            onClick={loadAll}
            disabled={isLoading}
          >
            {isLoading ? '↻' : '↻ Refresh'}
          </button>
          <button
            className="hdr-btn hdr-btn--danger"
            type="button"
            onClick={onLogout}
          >
            Leave Realm
          </button>
        </div>
      </header>

      {/* diff nav tabs */}
      <nav className="dash-nav">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab-btn ${activeTab === tab ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'leaderboard' && '🏆 '}
            {tab === 'shop' && '🛒 '}
            {tab === 'inventory' && '🎒 '}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {/* Feedback banners */}
      {error ? <p className="banner banner--error">{error}</p> : null}
      {actionMessage ? <p className="banner banner--success">{actionMessage}</p> : null}

      {/* Leaderboard */}
        {activeTab === 'leaderboard' && (
        <section className="panel">
            <h2 className="panel-title">Battle Leaderboard</h2>
            <p className="panel-hint">
            All characters ranked by wins. Your characters are highlighted.
            </p>

            {leaderboard.length === 0 ? (
            <p className="empty-msg">No battle records yet.</p>
            ) : (
            <>
                <div className="lb-header-row">
                <span className="lb-col-rank">Rank</span>
                <span className="lb-col-name">Username</span>
                <span className="lb-col-stat">Lvl</span>
                <span className="lb-col-stat">W</span>
                <span className="lb-col-stat">L</span>
                <span className="lb-col-ratio">Win %</span>
            </div>

            <div className="lb-list">
            {leaderboard.map((entry, idx) => {
                const isMe  = myCharIds.includes(Number(entry.character_id))
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                const winPct = entry.total === 0 ? '—' : `${Math.round(entry.ratio * 100)}%`

                return (
                    <div key={entry.character_id} className={`lb-row ${isMe ? 'lb-row--me' : ''}`}>
                        <span className="lb-col-rank lb-rank">
                            {medal ?? `#${idx + 1}`}
                        </span>
                        <span className="lb-col-name lb-name">
                            {entry.username}
                            <span className="lb-type-badge">
                                {entry.character_type === 'bot' ? 'Bot' : 'Player'}
                            </span>
                            {isMe && <span className="you-badge">YOU</span>}
                        </span>
                        <span className="lb-col-stat">{entry.level}</span>
                        <span className="lb-col-stat lb-wins">{entry.wins}</span>
                        <span className="lb-col-stat lb-losses">{entry.losses}</span>
                        <span className="lb-col-ratio lb-ratio">{winPct}</span>
                    </div>
                )
            })}
            </div>
            </>
            )}
        </section>
        )}

      {/*Shop */}
      {activeTab === 'shop' && (
        <section className="panel">
          <h2 className="panel-title">Item Shop</h2>
          <p className="panel-hint">
            Your balance: <strong className="gold-text">✦ {currentUser.gold ?? 0} gold</strong>
          </p>

          {potions.length > 0 && (
            <>
              <h3 className="section-label">🧪 Potions</h3>
              <div className="shop-grid">
                {potions.map((p) => (
                  <div key={p.potion_id} className="shop-card">
                    <div className="shop-icon">🧪</div>
                    <div className="shop-info">
                      <h4 className="shop-name">{p.potion_name}</h4>
                      <p className="shop-stats">
                        +{p.heal_raw} HP &nbsp;·&nbsp; +{Math.round(p.heal_percent * 100)}% max HP
                      </p>
                    </div>
                    <div className="shop-buy">
                      <span className="shop-cost">✦ {p.cost}</span>
                      <button
                        type="button"
                        className="buy-btn"
                        disabled={buyingId === `potion-${p.potion_id}` || Number(currentUser.gold) < Number(p.cost)}
                        onClick={() => handleBuy('potion', p.potion_id, p.potion_name)}
                      >
                        {buyingId === `potion-${p.potion_id}` ? '...' : 'Buy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {equips.length > 0 && (
            <>
              <h3 className="section-label">⚔ Equipment</h3>
              <div className="shop-grid">
                {equips.map((e) => (
                  <div key={e.equip_id} className="shop-card">
                    <div className="shop-icon">
                      {e.equip_type === 'weapon' ? '⚔' : e.equip_type === 'armor' ? '🛡' : '💍'}
                    </div>
                    <div className="shop-info">
                        <h4 className="shop-name">{e.equip_name}</h4>
                    <p className="shop-stats">
                        {e.equip_type} &nbsp;·&nbsp;
                        {formatEquipBoosts(e.boost_amount, e.boost_type)}
                    </p>
                    </div>
                    <div className="shop-buy">
                      <span className="shop-cost">✦ {e.cost}</span>
                      <button
                        type="button"
                        className="buy-btn"
                        disabled={buyingId === `equip-${e.equip_id}` || Number(currentUser.gold) < Number(e.cost)}
                        onClick={() => handleBuy('equip', e.equip_id, e.equip_name)}
                      >
                        {buyingId === `equip-${e.equip_id}` ? '...' : 'Buy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {potions.length === 0 && equips.length === 0 && (
            <p className="empty-msg">The shop is empty right now.</p>
          )}
        </section>
      )}

      {/*Inventory */}
        {activeTab === 'inventory' && (
        <section className="panel">
            <h2 className="panel-title">Your Inventory</h2>

            {/* Characters */}
            <h3 className="section-label">🧙 Characters</h3>
            {characters.length === 0 ? (
            <p className="empty-msg">No characters yet.</p>
            ) : (
            <div className="char-grid">
                {characters.map((c) => {
                const record = records.find((r) => Number(r.character_id) === Number(c.character_id))
                const wins   = Number(record?.wins   ?? 0)
                const losses = Number(record?.losses ?? 0)

                return (
                    <div key={c.character_id} className="char-card">
                    <div className="char-avatar">
                        {c.character_type === 'bot' ? 'Bot' : 'Player'}
                    </div>
                    <div className="char-info">
                        <h4 className="char-name">{c.character_name}</h4>
                        <p className="char-type">{c.character_type}</p>

                        {/* Stats */}
                        <div className="char-stats">
                        <span>❤ {c.current_hp}/{c.max_hp}</span>
                        <span>⚔ {c.attack}</span>
                        <span>🛡 {c.defense}</span>
                        <span>💨 {c.speed}</span>
                        </div>

                        {/* Win/loss record */}
                        <div className="char-record">
                        <span className="char-wins">▲ {wins}W</span>
                        <span className="char-losses">▼ {losses}L</span>
                        </div>
                    </div>
                    </div>
                )
                })}
            </div>
            )}

            {/* Potions owned */}
            <h3 className="section-label">🧪 Potions</h3>
            {userPotions.length === 0 ? (
            <p className="empty-msg">No potions in bag.</p>
            ) : (
            <div className="inv-list">
                {userPotions.map((up) => {
                const details = potions.find((p) => p.potion_id == up.potion_id)
                return (
                    <div key={up.potion_id} className="inv-row">
                    <span className="inv-icon">🧪</span>
                    <span className="inv-name">
                        {details ? details.potion_name : `Potion #${up.potion_id}`}
                    </span>
                    {details && (
                        <span className="inv-stats">
                        +{details.heal_raw} HP · +{Math.round(details.heal_percent * 100)}%
                        </span>
                    )}
                    <span className="inv-count">×{up.count}</span>
                    </div>
                )
                })}
            </div>
            )}

            {/* Equips owned */}
            <h3 className="section-label">⚔ Equipment</h3>
            {userEquips.length === 0 ? (
            <p className="empty-msg">No equipment in bag.</p>
            ) : (
            <div className="inv-list">
                {userEquips.map((ue) => {
                const details = equips.find((e) => e.equip_id == ue.equip_id)
                return (
                    <div key={ue.equip_id} className="inv-row">
                    <span className="inv-icon">
                        {details?.equip_type === 'weapon' ? '⚔'
                        : details?.equip_type === 'armor' ? '🛡'
                        : '💍'}
                    </span>
                    <span className="inv-name">
                        {details ? details.equip_name : `Equip #${ue.equip_id}`}
                    </span>
                        {details && (
                        <span className="inv-stats">
                            {details.equip_type} · {formatEquipBoosts(details.boost_amount, details.boost_type)}
                        </span>
                        )}
                    <span className="inv-count">×{ue.count}</span>
                    </div>
                )
                })}
            </div>
            )}
        </section>
        )}
    </div>
  )
}

export default UserDashboard
