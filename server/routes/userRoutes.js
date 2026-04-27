import { query } from '../db/postgres.js'

const roles = ["player", "admin", "bot"]
const types = ["player", "bot"]
const items = ["potion", "equip"]
const slots = ["weapon", "armor", "accessory_1", "accessory_2"]

const userRoutes = (app) => {
  app.get('/users', (req, res) => {
    try {
      let qs = "SELECT * FROM users ORDER BY user_id"
      query(qs).then(data => res.json(data.rows))  
    } catch(err) {
      console.log(err)
    }
  })
  
  app.post('/users', (req, res) => {
    const body = req.body
    const username = body.username
    const password = body.password
    const role = body.role
    if(!roles.includes(role)) {
      return res.send("Invalid role")
    }
    if(!username || !password) {
      return res.send("username and password are required")
    }
    try {
      let qs = "INSERT into users (username, password, role) values ($1, $2, $3)"
      query(qs, [username, password, role]).then(data => res.json(data.rows))  
    } catch(err) {
      console.log(err)
    }
  })
  
  app.get('/users/roles/:role', (req, res) => {
    const role = req.params.role
    if(!roles.includes(role)) {
      return res.send("Invalid role")
    }
    try {
      let qs = "SELECT * FROM users WHERE role = $1"
      query(qs, [role]).then(data => res.json(data.rows))  
    } catch(err) {
      console.log(err)
    }
  })
  
  app.get('/users/:user_id', (req, res) => {
    const id = req.params.user_id
    try {
      let qs = "SELECT * FROM users WHERE user_id = $1"
      query(qs, [id]).then(data => res.json(data.rows))  
    } catch(err) {
      console.log(err)
    }
  })
  
  app.delete('/users/:user_id', async (req, res) => {
    const id = Number(req.params.user_id)
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user id' })
    }
    try {
      const currentUser = await query("SELECT user_id, role FROM users WHERE user_id = $1", [id])
      if (currentUser.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' })
      }
      if (currentUser.rows[0].role === 'admin') {
        return res.status(403).json({ message: 'Admin users cannot be deleted' })
      }
  
      const qs = "DELETE FROM users WHERE user_id = $1 RETURNING user_id"
      const result = await query(qs, [id])
      return res.json({ deleted_user_id: result.rows[0].user_id })
    } catch(err) {
      console.log(err)
      return res.status(500).json({ message: 'Failed to delete user' })
    }
  })
  
  app.put('/users/:user_id/ban', async (req, res) => {
    const id = Number(req.params.user_id)
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user id' })
    }
  
    try {
      const currentUser = await query("SELECT user_id, role, status FROM users WHERE user_id = $1", [id])
      if (currentUser.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' })
      }
      if (currentUser.rows[0].role === 'admin') {
        return res.status(403).json({ message: 'Admin users cannot be banned' })
      }
      if (currentUser.rows[0].status === 'banned') {
        return res.status(400).json({ message: 'User is already banned' })
      }
  
      const qs = "UPDATE users SET status = 'banned' WHERE user_id = $1 RETURNING *"
      const result = await query(qs, [id])
      return res.json(result.rows[0])
    } catch(err) {
      console.log(err)
      return res.status(500).json({ message: 'Failed to ban user' })
    }
  })
  
  const buy = async (req, res) => {
    const id = req.params.user_id
    const item = req.params.type
    const iid = req.params.item_id
    if(!items.includes(item)) {
      return res.send("Invalid item type")
    }
    try {
      let qs = `SELECT cost FROM ${item}s WHERE ${item}_id = $1`
      let cost = await query(qs, [iid])
      if(cost.rows.length === 0) {
        return res.send("Item with this index does not exist")
      }
      cost = cost.rows[0].cost
      qs = "SELECT gold FROM users WHERE user_id = $1"
      let gold = await query(qs, [id])
      if(gold.rows.length === 0) {
        return res.send("User with this index does not exist")
      }
      gold = gold.rows[0].gold
      if(Number(gold) < Number(cost)) {
        return res.send("User does not have enough gold to buy this")
      }
      try {
        qs = `INSERT into user_${item}s (user_id, ${item}_id) values ($1, $2)`
        await query(qs, [id, iid])
      } catch(err) {
        console.log("user already has one or more of these, adding to entry")
      }
      qs = `UPDATE user_${item}s SET count = count + 1 WHERE user_id = $1 AND ${item}_id = $2`
      await query(qs, [id, iid])
      qs = "UPDATE users SET gold = $2 WHERE user_id = $1"
      query(qs, [id, gold-cost]).then(data => res.json(data.rows))
    } catch(err) {
      console.log(err)
    }
  }
  
  app.post('/users/:user_id/buy/:type/:item_id', buy)
  app.put('/users/:user_id/buy/:type/:item_id', buy)
  
  app.get('/users/:user_id/characters', (req, res) => {
    const id = req.params.user_id
    try {
      let qs = "SELECT * FROM characters WHERE user_id = $1"
      query(qs, [id]).then(data => res.json(data.rows))  
    } catch(err) {
      console.log(err)
    }
  })
  
  app.post('/users/:user_id/characters', async (req, res) => {
    const id = req.params.user_id
    const body = req.body
    const name = body.character_name
    const type = body.character_type
    if(!types.includes(type)) {
      return res.send("Invalid type")
    }
    if(!name) {
      return res.send("character_name is required")
    }
    try {
      let qs = "INSERT into characters (user_id, character_name, character_type) values ($1, $2, $3)"
      await query(qs, [id, name, type])
      qs = "SELECT character_id FROM characters WHERE character_name = $1"
      let cid = await query(qs, [name]).then(data => data.rows[0].character_id)
      slots.forEach(slot => {
        qs = "INSERT into character_equips (character_id, equip_slot) values ($1, $2)"
        query(qs, [cid, slot])
      })
      res.json([]) 
    } catch(err) {
      console.log(err)
    }
  })
  
  app.get('/users/:user_id/characters/:character_id', (req, res) => {
    const id = req.params.user_id
    const cid = req.params.character_id
    try {
      let qs = "SELECT * FROM characters WHERE user_id = $1 AND character_id = $2"
      query(qs, [id, cid]).then(data => res.json(data.rows))  
    } catch(err) {
      console.log(err)
    }
  })
  
  app.delete('/users/:user_id/characters/:character_id', async (req, res) => {
    const id = req.params.user_id
    const cid = req.params.character_id
    try {
      let qs = "SELECT equip_id FROM character_equips WHERE character_id = $1"
      let items = (await query(qs, [cid])).rows
      for(let item of items) {
        if(item.equip_id!=0) {
          try {
            qs = "INSERT into user_equips (user_id, equip_id) values ($1, $2)"
            await query(qs, [id, item.equip_id])
          } catch(err) {
            console.log("user already has one or more of these, adding to entry")
          }
          qs = "UPDATE user_equips SET count = count + 1 WHERE user_id = $1 AND equip_id = $2"
          await query(qs, [id, item.equip_id])
        }
      }
      qs = "DELETE FROM characters WHERE character_id = $1"
      query(qs, [cid]).then(data => res.json(data.rows))  
    } catch(err) {
      console.log(err)
    }
  })
  
  const equip = async (req, res) => {
    const id = req.params.user_id
    const cid = req.params.character_id
    const iid = req.params.item_id
    const slot = req.params.slot
    if(!slots.includes(slot)) {
      return res.send("Invalid equip slot")
    }
    try {
      let qs = "SELECT equip_type FROM equips WHERE equip_id = $1"
      let type = await query(qs, [iid])
      if(type.rows.length === 0) {
        return res.send("Equip with this index does not exist")
      }
      qs = "SELECT * FROM users WHERE user_id = $1"
      let usr = await query(qs, [id])
      if(usr.rows.length === 0) {
        return res.send("User with this index does not exist")
      }
      type = type.rows[0].equip_type
      if(!((type==="weapon" && slot==="weapon") || (type==="armor" && slot==="armor") || (type==="accessory" && (slot==="accessory_1" || slot==="accessory_2")) || type==="nothing")) {
        return res.send("Equip with this index does not equip to this slot")
      }
      if(iid!=0) {
        qs = "SELECT count FROM user_equips WHERE user_id = $1 AND equip_id = $2"
        let count = await query(qs, [id, iid])
        if(count.rows.length === 0 || count.rows[0].count == 0) {
          return res.send("User with this index does not have any of specified equip")
        }
      }
      qs = "SELECT equip_id FROM character_equips WHERE character_id = $1 AND equip_slot = $2"
      let old = await query(qs, [cid, slot])
      if(old.rows.length === 0) {
        return res.send("Character with this index does not exist")
      }
      old = old.rows[0].equip_id
      if(old==iid) {
        return res.send("Character already has an item of this type equipped in this slot")
      }
      if(old!=0) {
        qs = "UPDATE user_equips SET count = count + 1 WHERE user_id = $1 AND equip_id = $2"
        await query(qs, [id, old])
        qs = "SELECT boost_type, boost_amount FROM equips WHERE equip_id = $1"
        let boosts = (await query(qs, [old])).rows[0]
        let sets = "SET"
        for(let i = 0; i < boosts.boost_type.length; i++) {
          sets = `${sets} ${boosts.boost_type[i]} = ${boosts.boost_type[i]} - ${boosts.boost_amount[i]},`
          if(boosts.boost_type[i] === "max_hp") {
            sets = `${sets} current_hp = GREATEST(current_hp - ${boosts.boost_amount[i]}, 0),`
          }
        }
        sets = sets.slice(0, -1)
        qs = `UPDATE characters ${sets} WHERE character_id = $1`
        await query(qs, [cid])
      }
      if(iid!=0) {
        qs = "UPDATE user_equips SET count = count - 1 WHERE user_id = $1 AND equip_id = $2"
        await query(qs, [id, iid])
        qs = "SELECT boost_type, boost_amount FROM equips WHERE equip_id = $1"
        let boosts = (await query(qs, [iid])).rows[0]
        let sets = "SET"
        for(let i = 0; i < boosts.boost_type.length; i++) {
          sets = `${sets} ${boosts.boost_type[i]} = ${boosts.boost_type[i]} + ${boosts.boost_amount[i]},`
          if(boosts.boost_type[i] === "max_hp") {
            sets = `${sets} current_hp = current_hp + ${boosts.boost_amount[i]},`
          }
        }
        sets = sets.slice(0, -1)
        qs = `UPDATE characters ${sets} WHERE character_id = $1`
        await query(qs, [cid])
      }
      qs = "UPDATE character_equips SET equip_id = $3 WHERE character_id = $1 AND equip_slot = $2"
      await query(qs, [cid, slot, iid]).then(data => res.json(data.rows))
    } catch(err) {
      console.log(err)
    }
  }
  
  app.post('/users/:user_id/characters/:character_id/equip/:slot/:item_id', equip)
  app.put('/users/:user_id/characters/:character_id/equip/:slot/:item_id', equip)
  
  const potion = async (req, res) => {
    const id = req.params.user_id
    const cid = req.params.character_id
    const iid = req.params.item_id
    try {
      let qs = "SELECT heal_raw, heal_percent FROM potions WHERE potion_id = $1"
      let potion = await query(qs, [iid])
      if(potion.rows.length === 0) {
        return res.send("Potion with this index does not exist")
      }
      const heal_raw = Number(potion.rows[0].heal_raw)
      const heal_percent = Number(potion.rows[0].heal_percent)
      qs = "SELECT * FROM users WHERE user_id = $1"
      let usr = await query(qs, [id])
      if(usr.rows.length === 0) {
        return res.send("User with this index does not exist")
      }
      qs = "SELECT count FROM user_potions WHERE user_id = $1 AND potion_id = $2"
      let count = await query(qs, [id, iid])
      if(count.rows.length === 0 || count.rows[0].count == 0) {
        return res.send("User with this index does not have any of specified item")
      }
      qs = "SELECT max_hp, current_hp FROM characters WHERE character_id = $1"
      let hp = await query(qs, [cid])
      if(hp.rows.length === 0) {
        return res.send("Character with this index does not exist")
      }
      const max = Number(hp.rows[0].max_hp)
      let current = Number(hp.rows[0].current_hp)
      if(current == max) {
        return res.send("Character is already at full hp")
      }
      current += heal_raw
      current += Math.round(max*heal_percent*(0.8+Math.random()*0.4))
      qs = "UPDATE user_potions SET count = count - 1 WHERE user_id = $1 AND potion_id = $2"
      await query(qs, [id, iid])
      qs = "UPDATE characters SET current_hp = $2 WHERE character_id = $1"
      await query(qs, [cid, current < max ? current : max]).then(data => res.json(data.rows))
    } catch(err) {
      console.log(err)
    }
  }
  
  app.post('/users/:user_id/characters/:character_id/potion/:item_id', potion)
  app.put('/users/:user_id/characters/:character_id/potion/:item_id', potion)
  
  app.put('/users/:user_id/earn', (req, res) => {
    const id = req.params.user_id
    const body = req.body
    const gold = body.gold
    try {
      let qs = "UPDATE users SET gold = gold + $2 WHERE user_id = $1"
      query(qs, [id, gold]).then(data => res.json(data.rows))  
    } catch(err) {
      console.log(err)
    }
  })
  
  app.put('/users/:user_id/gold', (req, res) => {
    const id = req.params.user_id
    const body = req.body
    const gold = body.gold
    try {
      let qs = "UPDATE users SET gold = $2 WHERE user_id = $1"
      query(qs, [id, gold]).then(data => res.json(data.rows))  
    } catch(err) {
      console.log(err)
    }
  })
}

export default userRoutes