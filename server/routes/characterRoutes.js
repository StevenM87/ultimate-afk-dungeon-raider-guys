import { query } from '../db/postgres.js'

const characterRoutes = (app) => {
  /**
   * GET route that gets all characters
   */
  app.get('/characters', (req, res) => {
    try {
      let qs = "SELECT * FROM characters ORDER BY character_id"
      query(qs).then(data => res.status(200).json(data.rows))  
    } catch(err) {
      console.log(err)
      res.status(500).json({message: `Failed to get characters, server error: ${err}`})
    }
  })
  
  /**
   * GET route that gets all battles
   */
  app.get('/characters/battles', (req, res) => {
    try {
      let qs = "SELECT * FROM battles ORDER BY round, winner_id"
      query(qs).then(data => res.status(200).json(data.rows))  
    } catch(err) {
      console.log(err)
      res.status(500).json({message: `Failed to get battles, server error: ${err}`})
    }
  })
  
  /**
   * GET route that gets all battles for character with id character_id
   */
  app.get('/characters/battles/:character_id', async (req, res) => {
    const cid = req.params.character_id
    try {
      let qs = "SELECT * FROM battles WHERE winner_id = $1 OR loser_id = $1 ORDER BY round"
      const data = await query(qs, [cid])
      if(data.rows.length === 0) {
        return res.status(404).json({message: `No battles recorded for character with id ${cid}`})
      }
      res.status(200).json(data.rows)
    } catch(err) {
      console.log(err)
      res.status(500).json({message: `Failed to get battles for character with id ${cid}, server error: ${err}`})
    }
  })
  
  /**
   * GET route that gets all records
   */
  app.get('/characters/records', async (req, res) => {
    try {
      let qs = "SELECT winner_id, COUNT(*) as wins FROM battles GROUP BY winner_id ORDER BY winner_id"
      const wins = (await query(qs)).rows
    
      if (wins.length === 0) {
        return res.status(404).json({message: "No battles logged yet"})
      }
      qs = "SELECT loser_id, COUNT(*) as losses FROM battles GROUP BY loser_id ORDER BY loser_id"
      const losses = (await query(qs)).rows
      qs = "SELECT character_id from characters ORDER BY character_id"
      const characters = (await query(qs)).rows
      let out = characters.map(char => {return {character_id: char.character_id, wins: "0", losses: "0"}})
      let wi = 0
      let li = 0
      for (let i = 0; i < out.length; i++) {
        if (wi < wins.length && Number(out[i].character_id) === Number(wins[wi].winner_id)) {
            out[i].wins = wins[wi].wins
            wi++
        }
        if (li < losses.length && Number(out[i].character_id) === Number(losses[li].loser_id)) {
            out[i].losses = losses[li].losses
            li++
        }
    }
      res.status(200).json(out)
    } catch(err) {
      console.log(err)
      res.status(500).json({message: `Failed to get records, server error: ${err}`})
    }
  })
  
  /**
   * GET route that gets all records for character with id character_id
   */
  app.get('/characters/records/:character_id', async (req, res) => {
    const cid = req.params.character_id
    try {
      let qs = "SELECT COUNT(*) as wins FROM battles WHERE winner_id = $1"
      const wins = (await query(qs, [cid])).rows[0].wins
      qs = "SELECT COUNT(*) as losses FROM battles WHERE loser_id = $1"
      const losses = (await query(qs, [cid])).rows[0].losses
      res.status(200).json([{character_id: cid, wins: wins, losses: losses}])
    } catch(err) {
      console.log(err)
      res.status(500).json({message: `Failed to get record for character with id ${cid}, server error: ${err}`})
    }
  })

  /**
   * GET route that gets the character with id character_id
   */
  app.get('/characters/:character_id', async (req, res) => {
    const cid = req.params.character_id
    try {
      let qs = "SELECT * FROM characters WHERE character_id = $1"
      const data = await query(qs, [cid])
      if(data.rows.length === 0) {
        return res.status(404).json({message: `No character with id ${cid}`})
      }
      res.status(200).json(data.rows)
    } catch(err) {
      console.log(err)
      res.status(500).json({message: `Failed to get character with id ${cid}, server error: ${err}`})
    }
  })
  
  /**
   * GET route that gets all equips on character with id character_id
   */
  app.get('/characters/:character_id/equips', async (req, res) => {
    const cid = req.params.character_id
    try {
      const qs = "SELECT * FROM character_equips WHERE character_id = $1 ORDER BY equip_slot"
      const data = await query(qs, [cid])
      if(data.rows.length === 0) {
        return res.status(404).json({message: `No character with id ${cid}`})
      }
      res.status(200).json(data.rows)
    } catch (err) {
      console.log(err)
      res.status(500).json({message: `Failed to get equips for character with id ${cid}, server error: ${err}`})
    }
  })
}

export default characterRoutes