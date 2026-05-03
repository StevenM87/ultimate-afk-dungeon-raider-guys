const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.message ?? 'Request failed'
    throw new Error(message)
  }

  return payload
}

// Auth 

export async function authenticateUser(username, password) {
  if (!username || !password) {
    throw new Error('Username and password are required.')
  }
  const users = await request('/users/roles/player')
  const found = users.find(
    (u) => u.username === username && u.password === password,
  )
  if (!found) {
    throw new Error('Invalid username or password.')
  }
  return {
    user_id: found.user_id,
    username: found.username,
    role: found.role,
    gold: found.gold,
    status: found.status,
  }
}

export async function createUser(username, password) {
  if (!username || !password) {
    throw new Error('Username and password are required.')
  }
  // Check username not already taken
  const existing = await request('/users')
  const taken = existing.some(
    (u) => u.username.toLowerCase() === username.toLowerCase(),
  )
  if (taken) {
    throw new Error('That username is already taken.')
  }
  return request('/users', {
    method: 'POST',
    body: JSON.stringify({ username, password, role: 'player' }),
  })
}

//Data fetching

export async function fetchAllUsers() {
  return request('/users')
}

export async function fetchPotions() {
  return request('/potions')
}

export async function fetchEquips() {
  return request('/equips')
}

export async function fetchCharacterEquips(characterId) {
  return request(`/characters/${characterId}/equips`)
}

export async function equipItem(userId, characterId, slot, itemId) {
  return request(`/users/${userId}/characters/${characterId}/equip/${slot}/${itemId}`, {
    method: 'POST',
  })
}

export async function unequipItem(userId, characterId, slot) {
  return request(`/users/${userId}/characters/${characterId}/equip/${slot}/0`, {
    method: 'POST',
  })
}


export async function fetchUserCharacters(userId) {
  return request(`/users/${userId}/characters`)
}

export async function fetchUserEquips(userId) {
  return request(`/users/${userId}/equips`)
}

export async function fetchUserPotions(userId) {
  return request(`/users/${userId}/potions`)
}


export async function buyItem(userId, type, itemId) {
  return request(`/users/${userId}/buy/${type}/${itemId}`, {
    method: 'POST',
  })
}

export async function fetchCharacters() {
  return request('/characters')
}

export async function fetchCharacterRecords() {
  return request('/characters/records')
}