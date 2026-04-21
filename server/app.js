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
    let qs = "INSERT into users (username, password, role) values ($1, $2, $3)"
    query(qs, [username, password, role]).then(data => res.json(data.rows))  
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
    query(qs, [id, name, type])
    qs = "SELECT character_id FROM characters WHERE character_name = $1"
    let cid = await query(qs, [name]).then(data => Number(data.rows[0].character_id))
    slots.forEach(slot => {
      qs = "INSERT into character_equips (character_id, equip_slot) values ($1, $2)"
      query(qs, [cid, slot])
    })
    res.json([]) 
  } catch(err) {
    console.log(err)
  }
})

app.get('/characters', (req, res) => {
  try {
    let qs = "SELECT * FROM characters"
    query(qs).then(data => res.json(data.rows))  
  } catch(err) {
    console.log(err)
  }
})

app.get('/characters/types/:character_type', (req, res) => {
  const type = req.params.character_type
  if(!types.includes(type)) {
    return res.send("Invalid type")
  }
  try {
    let qs = "SELECT * FROM characters WHERE character_type = $1"
    query(qs, [type]).then(data => res.json(data.rows))  
  } catch(err) {
    console.log(err)
  }
})

app.get('/potions', (req, res) => {
  try {
    let qs = "SELECT * FROM potions"
    query(qs).then(data => res.json(data.rows))  
  } catch(err) {
    console.log(err)
  }
})

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