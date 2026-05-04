import { query } from '../db/postgres.js'

const equips = ["weapon", "armor", "accessory"]
const stats = ["max_hp", "attack", "defense", "speed", "heal_rate"]

const itemRoutes = (app) => {
  app.get('/equips', (req, res) => {
    try {
      let qs = "SELECT * FROM equips WHERE equip_id != 0 ORDER BY cost, equip_id"
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
  
  app.delete('/equips/:equip_id', (req, res) => {
    const iid = req.params.equip_id
    try {
      let qs = "DELETE FROM equips WHERE equip_id = $1"
      query(qs, [iid]).then(data => res.json(data.rows))  
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
  
  app.delete('/potions/:potion_id', (req, res) => {
    const iid = req.params.potion_id
    try {
      let qs = "DELETE FROM potions WHERE potion_id = $1"
      query(qs, [iid]).then(data => res.json(data.rows))  
    } catch(err) {
      console.log(err)
    }
  })
}

export default itemRoutes