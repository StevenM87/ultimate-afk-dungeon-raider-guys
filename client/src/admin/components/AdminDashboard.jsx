import { useEffect, useMemo, useState } from 'react'
import {
  banUser,
  createEquip,
  createPotion,
  deleteUser,
  fetchEquips,
  fetchUsers,
  fetchUsersByRole,
} from '../services/adminApi'

const tabOptions = ['users', 'items', 'bots']
const statOptions = ['max_hp', 'attack', 'defense', 'speed', 'heal_rate']
const equipTypeOptions = ['weapon', 'armor', 'accessory']

const initialPotionForm = {
  potion_name: '',
  cost: '',
  heal_raw: '',
  heal_percent: '',
}

const initialEquipForm = {
  equip_name: '',
  equip_type: 'weapon',
  cost: '',
  boost_type: '',
  boost_amount: '',
}

function AdminDashboard({ adminUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [bots, setBots] = useState([])
  const [equips, setEquips] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [potionForm, setPotionForm] = useState(initialPotionForm)
  const [equipForm, setEquipForm] = useState(initialEquipForm)
  const [actionMessage, setActionMessage] = useState('')
  const [pendingUserActionId, setPendingUserActionId] = useState(null)
  const [userSearch, setUserSearch] = useState('')

  const moderatedUsers = useMemo(() => {
    return users.filter((user) => {
      const normalizedRole = String(user.role ?? '').trim().toLowerCase()
      return normalizedRole !== 'admin' && normalizedRole !== 'bot'
    })
  }, [users])

  const filteredModeratedUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase()
    if (!query) {
      return moderatedUsers
    }

    return moderatedUsers.filter((user) => {
      const username = String(user.username ?? '').toLowerCase()
      const userId = String(user.user_id ?? '').toLowerCase()
      return username.includes(query) || userId.includes(query)
    })
  }, [moderatedUsers, userSearch])

  const refreshData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [allUsers, botUsers, equipItems] = await Promise.all([
        fetchUsers(),
        fetchUsersByRole('bot'),
        fetchEquips(),
      ])
      setUsers(allUsers)
      setBots(botUsers)
      setEquips(equipItems)
    } catch (refreshError) {
      setError(refreshError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
  }, [])

  const handlePotionSubmit = async (event) => {
    event.preventDefault()
    setActionMessage('')
    setError('')

    try {
      await createPotion({
        potion_name: potionForm.potion_name.trim(),
        cost: Number(potionForm.cost),
        heal_raw: Number(potionForm.heal_raw),
        heal_percent: Number(potionForm.heal_percent),
      })
      setPotionForm(initialPotionForm)
      setActionMessage('Potion created successfully.')
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  const handleEquipSubmit = async (event) => {
    event.preventDefault()
    setActionMessage('')
    setError('')

    const boostType = equipForm.boost_type
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const boostAmount = equipForm.boost_amount
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => !Number.isNaN(value))

    try {
      await createEquip({
        equip_name: equipForm.equip_name.trim(),
        equip_type: equipForm.equip_type,
        boost_type: boostType,
        boost_amount: boostAmount,
        cost: Number(equipForm.cost),
      })
      setEquipForm(initialEquipForm)
      setActionMessage('Equipment item created successfully.')
      const equipItems = await fetchEquips()
      setEquips(equipItems)
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  const handleBanUser = async (userId) => {
    setPendingUserActionId(userId)
    setActionMessage('')
    setError('')
    try {
      await banUser(userId)
      setActionMessage('User banned successfully.')
      await refreshData()
    } catch (userActionError) {
      setError(userActionError.message)
    } finally {
      setPendingUserActionId(null)
    }
  }

  const handleDeleteUser = async (userId) => {
    setPendingUserActionId(userId)
    setActionMessage('')
    setError('')
    try {
      await deleteUser(userId)
      setActionMessage('User deleted successfully.')
      await refreshData()
    } catch (userActionError) {
      setError(userActionError.message)
    } finally {
      setPendingUserActionId(null)
    }
  }

  return (
    <section className="admin-card">
      <header className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="admin-subtle-text">
            Signed in as <strong>{adminUser.username}</strong>
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" onClick={refreshData} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" className="admin-danger-button" onClick={onLogout}>
            Log Out
          </button>
        </div>
      </header>

      <nav className="admin-nav">
        {tabOptions.map((tabName) => (
          <button
            key={tabName}
            type="button"
            className={activeTab === tabName ? 'active' : ''}
            onClick={() => setActiveTab(tabName)}
          >
            {tabName.toUpperCase()}
          </button>
        ))}
      </nav>

      {error ? <p className="admin-error">{error}</p> : null}
      {actionMessage ? <p className="admin-success">{actionMessage}</p> : null}

      {activeTab === 'users' ? (
        <section>
          <h2>User Moderation</h2>
          <div className="admin-form">
            <label htmlFor="user-search">Search by username or ID</label>
            <input
              id="user-search"
              type="text"
              placeholder="e.g. pixel_paladin or 7"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
            />
          </div>
          <div className="admin-grid-list">
            {filteredModeratedUsers.length === 0 ? (
              <p className="admin-subtle-text">
                No users match your search.
              </p>
            ) : null}
            {filteredModeratedUsers.map((user) => {
              const normalizedStatus = String(user.status ?? 'active').trim().toLowerCase()
              return (
              <article key={user.user_id} className="admin-panel-row">
                <div>
                  <h3>{user.username}</h3>
                  <p className="admin-subtle-text">
                    User ID: {user.user_id} | Gold: {user.gold} | Status: {normalizedStatus}
                  </p>
                </div>
                <div className="admin-inline-actions">
                  <button
                    type="button"
                    onClick={() => handleBanUser(user.user_id)}
                    disabled={pendingUserActionId === user.user_id || normalizedStatus === 'banned'}
                  >
                    {pendingUserActionId === user.user_id
                      ? 'Processing...'
                      : normalizedStatus === 'banned'
                        ? 'Banned'
                        : 'Ban'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user.user_id)}
                    disabled={pendingUserActionId === user.user_id}
                  >
                    {pendingUserActionId === user.user_id ? 'Processing...' : 'Delete'}
                  </button>
                </div>
              </article>
              )
            })}
          </div>
        </section>
      ) : null}

      {activeTab === 'items' ? (
        <section className="admin-two-column">
          <article>
            <h2>Add Potion</h2>
            <form className="admin-form" onSubmit={handlePotionSubmit}>
              <label htmlFor="potion-name">Potion Name</label>
              <input
                id="potion-name"
                type="text"
                value={potionForm.potion_name}
                onChange={(event) =>
                  setPotionForm((current) => ({
                    ...current,
                    potion_name: event.target.value,
                  }))
                }
                required
              />
              <label htmlFor="potion-cost">Cost</label>
              <input
                id="potion-cost"
                type="number"
                min="1"
                value={potionForm.cost}
                onChange={(event) =>
                  setPotionForm((current) => ({ ...current, cost: event.target.value }))
                }
                required
              />
              <label htmlFor="potion-heal-raw">Heal Raw</label>
              <input
                id="potion-heal-raw"
                type="number"
                min="1"
                value={potionForm.heal_raw}
                onChange={(event) =>
                  setPotionForm((current) => ({
                    ...current,
                    heal_raw: event.target.value,
                  }))
                }
                required
              />
              <label htmlFor="potion-heal-percent">Heal Percent (0 to 1)</label>
              <input
                id="potion-heal-percent"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={potionForm.heal_percent}
                onChange={(event) =>
                  setPotionForm((current) => ({
                    ...current,
                    heal_percent: event.target.value,
                  }))
                }
                required
              />
              <button type="submit">Create Potion</button>
            </form>
          </article>

          <article>
            <h2>Add Equipment</h2>
            <form className="admin-form" onSubmit={handleEquipSubmit}>
              <label htmlFor="equip-name">Equip Name</label>
              <input
                id="equip-name"
                type="text"
                value={equipForm.equip_name}
                onChange={(event) =>
                  setEquipForm((current) => ({
                    ...current,
                    equip_name: event.target.value,
                  }))
                }
                required
              />
              <label htmlFor="equip-type">Equip Type</label>
              <select
                id="equip-type"
                value={equipForm.equip_type}
                onChange={(event) =>
                  setEquipForm((current) => ({
                    ...current,
                    equip_type: event.target.value,
                  }))
                }
              >
                {equipTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <label htmlFor="equip-cost">Cost</label>
              <input
                id="equip-cost"
                type="number"
                min="1"
                value={equipForm.cost}
                onChange={(event) =>
                  setEquipForm((current) => ({ ...current, cost: event.target.value }))
                }
                required
              />
              <label htmlFor="equip-boost-type">
                Boost Type(s), comma-separated
              </label>
              <input
                id="equip-boost-type"
                type="text"
                placeholder={statOptions.join(', ')}
                value={equipForm.boost_type}
                onChange={(event) =>
                  setEquipForm((current) => ({
                    ...current,
                    boost_type: event.target.value,
                  }))
                }
                required
              />
              <label htmlFor="equip-boost-amount">
                Boost Amount(s), comma-separated
              </label>
              <input
                id="equip-boost-amount"
                type="text"
                placeholder="10, 5"
                value={equipForm.boost_amount}
                onChange={(event) =>
                  setEquipForm((current) => ({
                    ...current,
                    boost_amount: event.target.value,
                  }))
                }
                required
              />
              <button type="submit">Create Equipment</button>
            </form>
          </article>

          <article className="admin-span-full">
            <h2>Current Equipment</h2>
            <div className="admin-grid-list">
              {equips.map((equip) => (
                <div key={equip.equip_id} className="admin-panel-row">
                  <div>
                    <h3>{equip.equip_name}</h3>
                    <p className="admin-subtle-text">
                      Type: {equip.equip_type} | Cost: {equip.cost}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === 'bots' ? (
        <section>
          <h2>Bot Management</h2>
          <p className="admin-subtle-text">
            Existing bots are listed below. Add/delete bot actions can be wired
            after bot-management endpoints are added.
          </p>
          <div className="admin-grid-list">
            {bots.map((bot) => (
              <article key={bot.user_id} className="admin-panel-row">
                <div>
                  <h3>{bot.username}</h3>
                  <p className="admin-subtle-text">Bot ID: {bot.user_id}</p>
                </div>
                <div className="admin-inline-actions">
                  <button type="button" disabled>
                    Delete Bot (pending API)
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  )
}

export default AdminDashboard
