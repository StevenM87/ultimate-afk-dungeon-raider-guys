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

export async function fetchUsers() {
  return request('/users')
}

export async function fetchUsersByRole(role) {
  return request(`/users/roles/${role}`)
}

export async function authenticateAdmin(username, password) {
  if (!username || !password) {
    throw new Error('Username and password are required.')
  }

  const users = await fetchUsersByRole('admin')
  const adminUser = users.find(
    (user) => user.username === username && user.password === password,
  )

  if (!adminUser) {
    throw new Error('Invalid admin credentials.')
  }

  return {
    user_id: adminUser.user_id,
    username: adminUser.username,
    role: adminUser.role,
  }
}

export async function fetchEquips() {
  return request('/equips')
}

export async function createPotion(potion) {
  return request('/potions', {
    method: 'POST',
    body: JSON.stringify(potion),
  })
}

export async function createEquip(equip) {
  return request('/equips', {
    method: 'POST',
    body: JSON.stringify(equip),
  })
}

export async function banUser(userId) {
  return request(`/users/${userId}/ban`, {
    method: 'PUT',
  })
}

export async function deleteUser(userId) {
  return request(`/users/${userId}`, {
    method: 'DELETE',
  })
}
