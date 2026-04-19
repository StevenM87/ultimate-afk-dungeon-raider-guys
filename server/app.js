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
    res.send("Invalid role")
  }
  if(!username || !password) {
    res.send("username and password are required")
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
    res.send("Invalid role")
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

app.post('/users/:user_id/characters', (req, res) => {
  const id = req.params.user_id
  const body = req.body
  const name = body.character_name
  const type = body.character_type
  if(!types.includes(type)) {
    res.send("Invalid type")
  }
  if(!name) {
    res.send("character_name is required")
  }
  try {
    let qs = "INSERT into characters (user_id, character_name, character_type) values ($1, $2, $3)"
    query(qs, [id, name, type]).then(data => res.json(data.rows))  
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
    res.send("Invalid type")
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
  if(!name || !cost || !hraw || !hper) {
    res.send("potion_name, cost, heal_raw, and heal_percent are required")
  }
  try {
    let qs = "INSERT into potions (potion_name, cost, heal_raw, heal_percent) values ($1, $2, $3, $4)"
    query(qs, [name, cost, hraw, hper]).then(data => res.json(data.rows))  
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
  