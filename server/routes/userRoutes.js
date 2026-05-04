import { query, getClient } from '../db/postgres.js'

// These arrays are sets of valid values for certain columns in database tables
const roles = ["player", "admin", "bot"]
const types = ["player", "bot"]
const items = ["potion", "equip"]
const slots = ["weapon", "armor", "accessory_1", "accessory_2"]

const userRoutes = (app) => {
  /**
   * GET route that gets all users
   */
  app.get('/users', (req, res) => {
    try {
      let qs = "SELECT * FROM users ORDER BY user_id"
      query(qs).then(data => res.status(200).json(data.rows))  
    } catch(err) {
      console.log(err)
      res.status(500).json({ message: `Failed to get users, server error: ${err}` })
    }
  })
  
  /**
   * POST route for users
   * Takes a username, password, and role
   */
  app.post('/users', (req, res) => {
    const body = req.body
    const username = body.username
    const password = body.password
    const role = body.role
    if(!roles.includes(role)) {
      return res.status(404).json({message: "Invalid role"})
    }
    if(!username || !password) {
      return res.status(400).json({message: "username and password are required"})
    }
    try {
      let qs = "INSERT into users (username, password, role) values ($1, $2, $3)"
      query(qs, [username, password, role]).then(data => res.status(201).json(data.rows))  
    } catch(err) {
      console.log(err)
      res.status(500).json({ message: `Failed to create user, server error: ${err}` })
    }
  })
  
  /**
   * GET route that gets all users of a specified role
   */
  app.get('/users/roles/:role', (req, res) => {
    const role = req.params.role
    if(!roles.includes(role)) {
      return res.status(404).json({message: "Invalid role"})
    }
    try {
      let qs = "SELECT * FROM users WHERE role = $1"
      query(qs, [role]).then(data => res.status(200).json(data.rows))
    } catch(err) {
      console.log(err)
      res.status(500).json({ message: `Failed to get users, server error: ${err}` })
    }
  })
  
  /**
   * GET route that gets the user with id user_id
   */
  app.get('/users/:user_id', async (req, res) => {
    const id = req.params.user_id
    try {
      let qs = "SELECT * FROM users WHERE user_id = $1"
      const data = await query(qs, [id])
      if(data.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' })
      }
      res.status(200).json(data.rows) 
    } catch(err) {
      console.log(err)
      res.status(500).json({ message: `Failed to get user with id ${id}, server error: ${err}` })
    }
  })
  
  /**
   * DELETE route that deletes the user with id user_id
   * Database recursively deletes everything dependent on the user
   */
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
      return res.status(200).json({ deleted_user_id: result.rows[0].user_id })
    } catch(err) {
      console.log(err)
      res.status(500).json({ message: `Failed to delete user, server error: ${err}` })
    }
  })
  
  /**
   * PUT route that bans the user with id user_id
   */
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
      res.status(500).json({ message: `Failed to ban user, server error: ${err}` })
    }
  })
  
  /**
   * The buy function allow users to buy things in the store
   * Every necessary values is in the params, not the body
   * Since this function has multiple database writes
   * (two UPDATEs and up to one INSERT) it is written
   * as a full transaction
   */
  const buy = async (req, res) => {
    const id = req.params.user_id
    const item = req.params.type
    const iid = req.params.item_id
    if(!items.includes(item)) {
      return res.status(404).json({message: "Item type must be equip or potion"})
    }
    const client = await getClient()
    client.query("BEGIN")
    try {
      let qs = `SELECT cost FROM ${item}s WHERE ${item}_id = $1`
      let cost = await client.query(qs, [iid])
      if(cost.rows.length === 0) {
        await client.query("COMMIT")
        return res.status(404).json({message: `${item} with this index does not exist`})
      }
      cost = cost.rows[0].cost
      qs = "SELECT gold FROM users WHERE user_id = $1"
      let gold = await client.query(qs, [id])
      if(gold.rows.length === 0) {
        await client.query("COMMIT")
        return res.status(404).json({ message: 'User not found' })
      }
      gold = gold.rows[0].gold
      if(Number(gold) < Number(cost)) {
        await client.query("COMMIT")
        return res.status(402).json({ message: "User does not have enough gold to buy this"})
      }
      qs = `SELECT * FROM user_${item}s WHERE user_id = $1 AND ${item}_id = $2`
      const exist = (await client.query(qs, [id, iid])).rows.length != 0
      if(!exist) {
        qs = `INSERT into user_${item}s (user_id, ${item}_id) values ($1, $2)`
        await client.query(qs, [id, iid])
      }
      qs = `UPDATE user_${item}s SET count = count + 1 WHERE user_id = $1 AND ${item}_id = $2`
      await client.query(qs, [id, iid])
      qs = "UPDATE users SET gold = gold - $2 WHERE user_id = $1"
      const data = await client.query(qs, [id, cost])
      await client.query("COMMIT")
      res.status(201).json(data.rows)
    } catch(err) {
      console.log(err)
      await client.query("ROLLBACK")
      res.status(500).json({message: `Failed to buy item, server error: ${err}`})
    } finally {
      client.release()
    }
  }
  
  /**
   * PUT/POST routes for having the player with id user_id
   * buy item of type (either equip or potion) with equip_id
   * or potion_id of item_id
   */
  app.post('/users/:user_id/buy/:type/:item_id', buy)
  app.put('/users/:user_id/buy/:type/:item_id', buy)
  
  /**
   * GET route for characters of user with id user_id
   */
  app.get('/users/:user_id/characters', async (req, res) => {
    const id = req.params.user_id
    try {
      let qs = "SELECT * FROM characters WHERE user_id = $1"
      const data = await query(qs, [id])
      if(data.rows.length === 0) {
        return res.status(404).json({ message: `No characters found for user with user_id ${id}` })
      }
      res.json(data.rows)
    } catch(err) {
      console.log(err)
      res.status(500).json({ message: `Failed to get characters, server error: ${err}` })
    }
  })

  /**
   * POST route for characters
   * user_id is in the params
   * Takes a character_name and character_type in the body
   * Since this function has multiple database writes
   * (5 INSERTs) it is written as a full transaction
   */
  app.post('/users/:user_id/characters', async (req, res) => {
    const id = req.params.user_id
    const body = req.body
    const name = body.character_name
    const type = body.character_type ?? "player"
    if(!types.includes(type)) {
      return res.status(404).json({message: "Invalid character type"})
    }
    if(!name) {
      return res.status(400).json({message: "character_name is required"})
    }
    const client = await getClient()
    client.query("BEGIN")
    try {
      let qs = "INSERT into characters (user_id, character_name, character_type) values ($1, $2, $3)"
      await client.query(qs, [id, name, type])
      qs = "SELECT character_id FROM characters WHERE character_name = $1"
      const data = await client.query(qs, [name])
      const cid = data.rows[0].character_id
      await Promise.all(
        slots.map(slot => {
          qs = "INSERT into character_equips (character_id, equip_slot) values ($1, $2)"
          return client.query(qs, [cid, slot])
        })
      )
      await client.query("COMMIT")
      res.status(201).json(data.rows) 
    } catch(err) {
      console.log(err)
      await client.query("ROLLBACK")
      res.status(500).json({ message: `Failed to create character, server error: ${err}` })
    } finally {
      client.release()
    }
  })
  
  /**
   * GET route for character with id character_id of user with id user_id
   */
  app.get('/users/:user_id/characters/:character_id', async (req, res) => {
    const id = req.params.user_id
    const cid = req.params.character_id
    try {
      let qs = "SELECT * FROM characters WHERE user_id = $1 AND character_id = $2"
      const data = await query(qs, [id, cid])
      if(data.rows.length === 0) {
        return res.status(404).json({ message: `No character with character_id ${cid} found for user_id ${id}` })
      }
      res.status(200).json(data.rows)
    } catch(err) {
      console.log(err)
      return res.status(500).json({ message: `Failed to get character with character_id ${cid} and user_id ${id}, server error: ${err}` })
    }
  })
  
  /**
   * DELETE route that deletes the character with id character_id of user with id user_id
   * Database recursively deletes everything dependent on the character
   * Since this function has multiple database writes
   * (up to four INSERTs, up to four UPDATEs and a DELETE) it is written
   * as a full transaction
   */
  app.delete('/users/:user_id/characters/:character_id', async (req, res) => {
    const id = req.params.user_id
    const cid = req.params.character_id
    const client = await getClient()
    client.query("BEGIN")
    try {
      let qs = "SELECT equip_id FROM character_equips WHERE character_id = $1"
      let items = (await client.query(qs, [cid])).rows
      for(let item of items) {
        if(item.equip_id!=0) {
          qs = "SELECT * FROM user_equips WHERE user_id = $1 AND equip_id = $2"
          const exist = (await client.query(qs, [id, iid])).rows.length != 0
          if(!exist) {
            qs = "INSERT into user_equips (user_id, equip_id) values ($1, $2)"
            await client.query(qs, [id, iid])
          }
          qs = "UPDATE user_equips SET count = count + 1 WHERE user_id = $1 AND equip_id = $2"
          await client.query(qs, [id, item.equip_id])
        }
      }
      qs = "DELETE FROM characters WHERE character_id = $1"
      const data = await client.query(qs, [cid])
      await client.query("COMMIT")
      res.status(200).json(data.rows)
    } catch(err) {
      console.log(err)
      await client.query("ROLLBACK")
      res.json({message: `Failed to delete character with character_id ${cid}, server error: ${err}`})
    } finally {
      client.release()
    }
  })
  
  /**
   * The equip function allow users to equip their characters
   * with equips they own
   * Every necessary values is in the params, not the body
   * Since this function has multiple database writes
   * (one to five UPDATEs) it is written as a full transaction
   */
  const equip = async (req, res) => {
    const id = req.params.user_id
    const cid = req.params.character_id
    const iid = req.params.item_id
    const slot = req.params.slot
    let open = false
    if(!slots.includes(slot)) {
      return res.send("Invalid equip slot")
    }
    const client = await getClient()
    try {
      let qs = "SELECT equip_type FROM equips WHERE equip_id = $1"
      let type = await client.query(qs, [iid])
      if(type.rows.length === 0) {
        return res.status(404).json({message: "Equip with this id does not exist"})
      }
      qs = "SELECT * FROM users WHERE user_id = $1"
      let usr = await client.query(qs, [id])
      if(usr.rows.length === 0) {
        return res.status(404).send("User with this id does not exist")
      }
      type = type.rows[0].equip_type
      if(!((type==="weapon" && slot==="weapon") || (type==="armor" && slot==="armor") || (type==="accessory" && (slot==="accessory_1" || slot==="accessory_2")) || type==="nothing")) {
        return res.status(403).json({message: "Equip with this id does not equip to this slot"})
      }
      if(iid!=0) {
        qs = "SELECT count FROM user_equips WHERE user_id = $1 AND equip_id = $2"
        let count = await client.query(qs, [id, iid])
        if(count.rows.length === 0 || count.rows[0].count == 0) {
          return res.status(403).json({message: "User with this id does not have any of specified equip"})
        }
      }
      qs = "SELECT equip_id FROM character_equips WHERE character_id = $1 AND equip_slot = $2"
      let old = await client.query(qs, [cid, slot])
      if(old.rows.length === 0) {
        return res.status(404).json({message: "Character with this id does not exist"})
      }
      old = old.rows[0].equip_id
      if(old==iid) {
        return res.status(403).json({message: "Character already has an item of this type equipped in this slot"})
      }
      client.query("BEGIN")
      open = true
      if(old!=0) {
        qs = "UPDATE user_equips SET count = count + 1 WHERE user_id = $1 AND equip_id = $2"
        await client.query(qs, [id, old])
        qs = "SELECT boost_type, boost_amount FROM equips WHERE equip_id = $1"
        let boosts = (await client.query(qs, [old])).rows[0]
        let sets = "SET"
        for(let i = 0; i < boosts.boost_type.length; i++) {
          sets = `${sets} ${boosts.boost_type[i]} = ${boosts.boost_type[i]} - ${boosts.boost_amount[i]},`
          if(boosts.boost_type[i] === "max_hp") {
            sets = `${sets} current_hp = GREATEST(current_hp - ${boosts.boost_amount[i]}, 0),`
          }
        }
        sets = sets.slice(0, -1)
        qs = `UPDATE characters ${sets} WHERE character_id = $1`
        await client.query(qs, [cid])
      }
      if(iid!=0) {
        qs = "UPDATE user_equips SET count = count - 1 WHERE user_id = $1 AND equip_id = $2"
        await client.query(qs, [id, iid])
        qs = "SELECT boost_type, boost_amount FROM equips WHERE equip_id = $1"
        let boosts = (await client.query(qs, [iid])).rows[0]
        let sets = "SET"
        for(let i = 0; i < boosts.boost_type.length; i++) {
          sets = `${sets} ${boosts.boost_type[i]} = ${boosts.boost_type[i]} + ${boosts.boost_amount[i]},`
          if(boosts.boost_type[i] === "max_hp") {
            sets = `${sets} current_hp = current_hp + ${boosts.boost_amount[i]},`
          }
        }
        sets = sets.slice(0, -1)
        qs = `UPDATE characters ${sets} WHERE character_id = $1`
        await client.query(qs, [cid])
      }
      qs = "UPDATE character_equips SET equip_id = $3 WHERE character_id = $1 AND equip_slot = $2"
      const data = await client.query(qs, [cid, slot, iid])
      await client.query("COMMIT")
      res.status(200).json(data.rows)
    } catch(err) {
      console.log(err)
      if(open) {
        await client.query("ROLLBACK")
      }
      res.status(500).json({message: `Failed to equip item with equip_id ${iid} to character with character_id ${cid}, server error: ${err}`})
    } finally {
      client.release()
    }
  }
  
  /**
   * PUT/POST routes for having the player with id user_id
   * equip character with id character_id
   * with equip with id item_id
   */
  app.post('/users/:user_id/characters/:character_id/equip/:slot/:item_id', equip)
  app.put('/users/:user_id/characters/:character_id/equip/:slot/:item_id', equip)
  
  /**
   * The potion function allow users to use on their characters
   * the potions they own
   * Every necessary values is in the params, not the body
   * Since this function has multiple database writes
   * (two UPDATEs) it is written as a full transaction
   */
  const potion = async (req, res) => {
    const id = req.params.user_id
    const cid = req.params.character_id
    const iid = req.params.item_id
    let open = false
    const client = await getClient()
    try {
      let qs = "SELECT heal_raw, heal_percent FROM potions WHERE potion_id = $1"
      let potion = await client.query(qs, [iid])
      if(potion.rows.length === 0) {
        return res.status(404).json({message: "Potion with this index does not exist"})
      }
      const heal_raw = Number(potion.rows[0].heal_raw)
      const heal_percent = Number(potion.rows[0].heal_percent)
      qs = "SELECT * FROM users WHERE user_id = $1"
      let usr = await client.query(qs, [id])
      if(usr.rows.length === 0) {
        return res.status(404).json({message: "User with this index does not exist"})
      }
      qs = "SELECT count FROM user_potions WHERE user_id = $1 AND potion_id = $2"
      let count = await client.query(qs, [id, iid])
      if(count.rows.length === 0 || count.rows[0].count == 0) {
        return res.status(403).json({message: "User with this index does not have any of specified item"})
      }
      qs = "SELECT max_hp, current_hp FROM characters WHERE character_id = $1"
      let hp = await client.query(qs, [cid])
      if(hp.rows.length === 0) {
        return res.status(404).json({message: "Character with this index does not exist"})
      }
      const max = Number(hp.rows[0].max_hp)
      const current = Number(hp.rows[0].current_hp)
      if(current == max) {
        return res.status(403).json({message: "Character is already at full hp"})
      }
      let heal = heal_raw
      heal += Math.round(max*heal_percent*(0.8+Math.random()*0.4))
      heal = heal + current < max ? heal : current - max
      client.query("BEGIN")
      open = true
      qs = "UPDATE user_potions SET count = count - 1 WHERE user_id = $1 AND potion_id = $2"
      await client.query(qs, [id, iid])
      qs = "UPDATE characters SET current_hp = current_hp + $2 WHERE character_id = $1"
      const data = await client.query(qs, [heal])
      await client.query("COMMIT")
      res.status(200).json(data.rows)
    } catch(err) {
      console.log(err)
      if(open) {
        await client.query("ROLLBACK")
      }
      res.status(500).json({message: `Failed to use potion with potion_id ${iid} on character with character_id ${cid}, server error: ${err}`})
    } finally {
      client.release()
    }
  }
  
  /**
   * PUT/POST routes for having the player with id user_id
   * user on character with id character_id
   * a potion with id item_id
   */
  app.post('/users/:user_id/characters/:character_id/potion/:item_id', potion)
  app.put('/users/:user_id/characters/:character_id/potion/:item_id', potion)
  
  /**
   * PUT route for earning gold
   * Adds gold from the body to user's gold
   */
  app.put('/users/:user_id/earn', (req, res) => {
    const id = req.params.user_id
    const body = req.body
    const gold = body.gold
    try {
      let qs = "UPDATE users SET gold = gold + $2 WHERE user_id = $1"
      query(qs, [id, gold]).then(data => res.status(200).json(data.rows))  
    } catch(err) {
      console.log(err)
      res.status(500).json({message: `Failed to add gold, server error: ${err}`})
    }
  })

  /**
   * GET route that gets the equips of the user with id user_id
   */
  app.get('/users/:user_id/equips', async (req, res) => {
    const id = req.params.user_id
    try {
      let qs = "SELECT * FROM user_equips WHERE user_id = $1 AND count > 0"
      const data = await query(qs, [id])
      if(data.rows.length === 0) {
        return res.status(404).json({ message: `No equips found for user with user_id ${id}` })
      }
      res.status(200).json(data.rows) 
    } catch(err) {
      console.log(err)
      res.status(500).json({ message: `Failed to get equips, server error: ${err}` })
    }
  })

  /**
   * GET route that gets the potions of the user with id user_id
   */
  app.get('/users/:user_id/potions', async (req, res) => {
    const id = req.params.user_id
    try {
      let qs = "SELECT * FROM user_potions WHERE user_id = $1 AND count > 0"
      const data = await query(qs, [id])
      if(data.rows.length === 0) {
        return res.status(404).json({ message: `No potions found for user with user_id ${id}` })
      }
      res.status(200).json(data.rows) 
    } catch(err) {
      console.log(err)
      res.status(500).json({ message: `Failed to get potions, server error: ${err}` })
    }
  })
  
  /**
   * PUT route for setting gold
   * Sets user's gold to value in body
   */
  app.put('/users/:user_id/gold', (req, res) => {
    const id = req.params.user_id
    const body = req.body
    const gold = body.gold
    try {
      let qs = "UPDATE users SET gold = $2 WHERE user_id = $1"
      query(qs, [id, gold]).then(data => res.status(200).json(data.rows))  
    } catch(err) {
      console.log(err)
      res.status(500).json({message: `Failed to set gold, server error: ${err}`})
    }
  })
}

export default userRoutes