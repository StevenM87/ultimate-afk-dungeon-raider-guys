import express from 'express'
import cors from 'cors'
import 'dotenv/config'


import { query } from './db/postgres.js';

// create the app
const app = express()
// it's nice to set the port number so it's always the same
app.set('port', process.env.PORT || 3000);
// set up some middleware to handle processing body requests
app.use(express.json())
// set up some midlleware to handle cors
app.use(cors())

const roles = ["player", "admin", "bot"]
const types = ["player", "bot"]
const equips = ["weapon", "armor", "accessory"]
const items = ["potion", "equip"]
const slots = ["weapon", "armor", "accessory_1", "accessory_2"]
const stats = ["max_hp", "attack", "defense", "speed", "heal_rate"]

// base route
app.get('/', (req, res) => {
    res.send("Dumbass route for bozo idiots")
})

app.get('/users', (req, res) => {
  try {
    let qs = "SELECT * FROM users"
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
    let qs = "INSERT into users (username, password, role, status) values ($1, $2, $3, $4)"
    query(qs, [username, password, role, 'active']).then(data => res.json(data.rows))  
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

app.get('/users/:user_id/characters', (req, res) => {
  const id = req.params.user_id
  try {
    let qs = "SELECT * FROM characters WHERE user_id = $1"
    query(qs, [id]).then(data => res.json(data.rows))  
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
        return res.send("User with this index does not have any of specified item")
      }
    }
    qs = "SELECT equip_id FROM character_equips WHERE character_id = $1 AND equip_slot = $2"
    let old = await query(qs, [cid, slot])
    if(old.rows.length === 0) {
      return res.send("Character with this index does not exist")
    }
    old = old.rows[0].equip_id
    if(old!=0) {
      qs = "UPDATE user_equips SET count = count + 1 WHERE user_id = $1 AND equip_id = $2"
      await query(qs, [id, old])
    }
    if(iid!=0) {
      qs = "UPDATE user_equips SET count = count - 1 WHERE user_id = $1 AND equip_id = $2"
      await query(qs, [id, iid])
    }
    qs = "UPDATE character_equips SET equip_id = $3 WHERE character_id = $1 AND equip_slot = $2"
    query(qs, [cid, slot, iid]).then(data => res.json(data.rows))
  } catch(err) {
    console.log(err)
  }
}

app.post('/users/:user_id/characters/:character_id/equip/:slot/:item_id', equip)
app.put('/users/:user_id/characters/:character_id/equip/:slot/:item_id', equip)

app.post('/potions', (req, res) => {
  const body = req.body
  const name = body.potion_name
  const cost = body.cost
  const hraw = body.heal_raw
  const hper = body.heal_percent
  if(!name || cost == undefined || hraw == undefined || hper == undefined) {
    return res.send("potion_name, cost, heal_raw, and heal_percent are required")
  }
  if(cost < 1) {
    return res.send("cost must be positive")
  }
  if(hraw < 1) {
    return res.send("hraw must be positive")
  }
  if(hper > 1.0 || hper < 0.0) {
    return res.send("hper must be between 0 and 1")
  }
  try {
    let qs = "INSERT into potions (potion_name, cost, heal_raw, heal_percent) values ($1, $2, $3, $4)"
    query(qs, [name, cost, hraw, hper]).then(data => res.json(data.rows))  
  } catch(err) {
    console.log(err)
  }
})

app.get('/equips', (req, res) => {
  try {
    let qs = "SELECT * FROM equips"
    query(qs).then(data => res.json(data.rows))  
  } catch(err) {
    console.log(err)
  }
})

app.post('/equips', (req, res) => {
  const body = req.body
  const name = body.equip_name
  const etype = body.equip_type
  const btype = body.boost_type
  const amt = body.boost_amount
  const cost = body.cost
  if(!name || !etype || !btype || !amt || btype.length == 0 || amt.length == 0 || cost == undefined) {
    return res.send("equip_name, equip_type, boost_type, boost_amount, and cost are required")
  }
  if(cost < 1) {
    return res.send("cost must be positive")
  }
  if(btype.length != amt.length) {
    return res.send("boost_type and boost_amount must be same length")
  }
  if(!equips.includes(etype)) {
    return res.send("Invalid equipment type")
  }
  if(!btype.every(val => stats.includes(val)))
  {
    return res.send("One or more stats in boost_type is invalid")
  }
  try {
    let qs = "INSERT into equips (equip_name, equip_type, boost_type, boost_amount, cost) values ($1, $2, $3, $4, $5)"
    query(qs, [name, etype, btype, amt, cost]).then(data => res.json(data.rows))  
  } catch(err) {
    console.log(err)
  }
})

app.get('/up', (req, res) => {
  res.json({status: 'up'})
})


app.listen(app.get('port'), () => {
    console.log('App is running at http://localhost:%d in %s mode', app.get('port'), app.get('env'));
    console.log('  Press CTRL-C to stop\n');
  });