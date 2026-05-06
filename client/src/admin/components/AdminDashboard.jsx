import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
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

function AdminDashboard({ adminUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [bots, setBots] = useState([])
  const [equips, setEquips] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [pendingUserActionId, setPendingUserActionId] = useState(null)
  const [userSearch, setUserSearch] = useState('')

  const {
    register: registerPotion,
    handleSubmit: handlePotionSubmitForm,
    reset: resetPotionForm,
  } = useForm()

  const {
    register: registerEquip,
    handleSubmit: handleEquipSubmitForm,
    reset: resetEquipForm,
  } = useForm()

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

  const handlePotionSubmit = async (data) => {
    setActionMessage('')
    setError('')

    try {
      await createPotion({
        potion_name: data.potion_name.trim(),
        cost: Number(data.cost),
        heal_raw: Number(data.heal_raw),
        heal_percent: Number(data.heal_percent),
      })
      resetPotionForm()
      setActionMessage('Potion created successfully.')
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  const handleEquipSubmit = async (data) => {
    setActionMessage('')
    setError('')

    const boostType = data.boost_type
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    const boostAmount = data.boost_amount
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => !Number.isNaN(value))

    try {
      await createEquip({
        equip_name: data.equip_name.trim(),
        equip_type: data.equip_type,
        boost_type: boostType,
        boost_amount: boostAmount,
        cost: Number(data.cost),
      })
      resetEquipForm()
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
            <form className="admin-form" onSubmit={handlePotionSubmitForm(handlePotionSubmit)}>
              <label htmlFor="potion-name">Potion Name</label>
              <input id="potion-name" type="text" {...registerPotion('potion_name', { required: true })} />

              <label htmlFor="potion-cost">Cost</label>
              <input id="potion-cost" type="number" min="1" {...registerPotion('cost', { required: true })} />

              <label htmlFor="potion-heal-raw">Heal Raw</label>
              <input id="potion-heal-raw" type="number" min="1" {...registerPotion('heal_raw', { required: true })} />

              <label htmlFor="potion-heal-percent">Heal Percent (0 to 1)</label>
              <input
                id="potion-heal-percent"
                type="number"
                min="0"
                max="1"
                step="0.01"
                {...registerPotion('heal_percent', { required: true })}
              />

              <button type="submit">Create Potion</button>
            </form>
          </article>

          <article>
            <h2>Add Equipment</h2>
            <form className="admin-form" onSubmit={handleEquipSubmitForm(handleEquipSubmit)}>
              <label htmlFor="equip-name">Equip Name</label>
              <input id="equip-name" type="text" {...registerEquip('equip_name', { required: true })} />

              <label htmlFor="equip-type">Equip Type</label>
              <select id="equip-type" {...registerEquip('equip_type')}>
                {equipTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <label htmlFor="equip-cost">Cost</label>
              <input id="equip-cost" type="number" min="1" {...registerEquip('cost', { required: true })} />

              <label htmlFor="equip-boost-type">
                Boost Type(s), comma-separated
              </label>
              <input
                id="equip-boost-type"
                type="text"
                placeholder={statOptions.join(', ')}
                {...registerEquip('boost_type', { required: true })}
              />

              <label htmlFor="equip-boost-amount">
                Boost Amount(s), comma-separated
              </label>
              <input
                id="equip-boost-amount"
                type="text"
                placeholder="10, 5"
                {...registerEquip('boost_amount', { required: true })}
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