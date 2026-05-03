import express from 'express'
import cors from 'cors'
import 'dotenv/config'


import { query, getClient } from './db/postgres.js'

import characterRoutes from './routes/characterRoutes.js'
import userRoutes from './routes/userRoutes.js'
import itemRoutes from './routes/itemRoutes.js'

// create the app
const app = express()
// it's nice to set the port number so it's always the same
app.set('port', process.env.PORT || 3000);
// set up some middleware to handle processing body requests
app.use(express.json())
// set up some midlleware to handle cors
app.use(cors())

const stats = ["max_hp", "attack", "defense", "speed", "heal_rate"]

// base route
app.get('/', (req, res) => {
    res.send("Dumbass route for bozo idiots")
})

app.get('/up', (req, res) => {
  res.json({status: 'up'})
})

characterRoutes(app)
userRoutes(app)
itemRoutes(app)

app.listen(app.get('port'), () => {
    console.log('App is running at http://localhost:%d in %s mode', app.get('port'), app.get('env'))
    console.log('  Press CTRL-C to stop\n')
})

let updating = null
let thisUpdating = false

let simData = {}
async function numBattles() {
  let qs = "SELECT * FROM last_update"
  simData = (await query(qs)).rows[0]
  simData.time = new Date(simData.time)
  console.log(simData.time)
  let now = new Date()
  let rounds = Math.floor((now-simData.time)/(1000*60*30))
  simData.newRounds = rounds > 0 ? rounds : 0
  simData.next_round = Number(simData.next_round)
}

async function checkUpdating(client) {
  let qs = "SELECT * FROM updating"
  let upd = (await client.query(qs)).rows[0]
  updating = upd.running
  if(updating && new Date() - new Date(upd.last) > 1000 * 60) {
    updating = false
    qs = "UPDATE updating SET running = false, last = NULL"
    await client.query(qs)
  }
}

async function pingUpdating() {
  if(updating && thisUpdating) {
    console.log("I am updating")
  }
  if(updating && !thisUpdating) {
    console.log("Someone else is updating")
  }
  if(!updating && !thisUpdating) {
    console.log("No one is updating")
  }
  if(thisUpdating) {
    let qs = "UPDATE updating SET running = true, last = $1"
    await query(qs, [new Date()])
    await query("COMMIT")
  }
}

async function checkForBattles() {
  const client = await getClient()
  try {
    let qs = "BEGIN"
    await client.query(qs)
    qs = "LOCK TABLE updating IN ACCESS EXCLUSIVE MODE"
    await client.query(qs)
    await checkUpdating(client)
    if(!updating ) {
      await numBattles()
      if(simData.newRounds > 0) {
        updating = true
        thisUpdating = true
        qs = "UPDATE updating SET running = true, last = $1"
        await client.query(qs, [new Date()])
        await client.query("COMMIT")
        console.log("Expected rounds:", simData.newRounds)
        for(let i = 0; i < simData.newRounds; i++) {
          console.log(`Running round ${i + 1} / ${simData.newRounds}`)
          await runRound(simData.next_round)
          simData.time = new Date(simData.time.getTime() + (1000*60*30))
          simData.next_round++
          qs = "UPDATE last_update SET time = $1, next_round = $2"
          await query(qs, [simData.time, simData.next_round])
        }
        console.log(simData.time)
        simData.newRounds = 0
        qs = "UPDATE updating SET running = false, last = NULL"
        await query(qs)
        updating = false
        thisUpdating = false
      } else {
        await client.query("COMMIT")
      }
    } else {
      await client.query("COMMIT")
    }
  } catch(err) {
    console.log(err)
    await client.query("COMMIT")
  }
  client.release()
}

async function runRound(round) {
  let qs = "SELECT * FROM characters WHERE current_hp / max_hp < 0.5"
  let resting = (await query(qs)).rows
  qs = "SELECT * FROM characters WHERE current_hp / max_hp >= 0.5"
  let ready = (await query(qs)).rows
  let calls = []
  if(ready.length % 2 == 1) {
    const bots = ready.filter(char => char.character_type === "bot")
    const leaveOut = bots.length > 0 ? bots[Math.floor(Math.random()*bots.length)] : ready[Math.floor(Math.random()*ready.length)]
    ready = ready.filter(char => char.character_id !== leaveOut.character_id)
    resting.push(leaveOut)
  }
  console.log("Round: " + round)
  if(ready.length > 1) {
    ready.sort((a, b) => a.level - b.level)
    const range = Math.floor(ready.length / 10) + 3
    let charMap = new Array(ready.length).fill(false)
    let left = true
    let leftInd = 0
    let rightInd = ready.length-1
    for(let i = 0; i < ready.length/2; i++) {
      if(left) {
        while(charMap[leftInd]) {
          leftInd++
        }
        let cands = []
        for(let j = leftInd+1; j < leftInd+range+1; j++) {
          if(!charMap[j] && j < charMap.length) {
            cands.push(j)
          }
        }
        let opp = 0
        if(cands.length == 0) {
          opp = leftInd+range+1
          while(charMap[opp]) {
            opp++
          }
        } else {
          opp = cands[Math.floor(Math.random()*cands.length)]
        }
        charMap[leftInd] = true
        charMap[opp] = true
        calls.push(battle(ready[leftInd], ready[opp], round))
        console.log("(" + ready[leftInd].character_name + ", " + ready[opp].character_name + ")")
      } else {
        while(charMap[rightInd]) {
          rightInd--
        }
        let cands = []
        for(let j = rightInd-1; j > rightInd-range-1; j--) {
          if(!charMap[j] && j > -1) {
            cands.push(j)
          }
        }
        let opp = 0
        if(cands.length == 0) {
          opp = rightInd-range-1
          while(charMap[opp]) {
            opp--
          }
        } else {
          opp = cands[Math.floor(Math.random()*cands.length)]
        }
        charMap[rightInd] = true
        charMap[opp] = true
        calls.push(battle(ready[opp], ready[rightInd], round))
        console.log("(" + ready[opp].character_name + ", " + ready[rightInd].character_name + ")")
      }
      left = !left
    }
  }
  for(let i = 0; i < resting.length; i++) {
    const newHP = Number(resting[i].current_hp) + Number(resting[i].heal_rate)
    const maxHP = Number(resting[i].max_hp)
    resting[i].current_hp = newHP < maxHP ? newHP : maxHP
    let qs = "UPDATE characters SET current_hp = $2 WHERE character_id = $1"
    calls.push(query(qs, [resting[i].character_id, resting[i].current_hp]))
  }
  await Promise.all(calls)
}

async function battle(c1, c2, round) {
  c1.attack = Number(c1.attack)
  c2.attack = Number(c2.attack)
  c1.defense = Number(c1.defense)
  c2.defense = Number(c2.defense)
  c1.current_hp = Number(c1.current_hp)
  c2.current_hp = Number(c2.current_hp)
  c1.max_hp = Number(c1.max_hp)
  c2.max_hp = Number(c2.max_hp)
  c1.heal_rate = Number(c1.heal_rate)
  c2.heal_rate = Number(c2.heal_rate)
  c1.speed = Number(c1.speed)
  c2.speed = Number(c2.speed)
  c1.level = Number(c1.level)
  c2.level = Number(c2.level)
  c1.exp = Number(c1.exp)
  c2.exp = Number(c2.exp)
  c1.exp_for_next_level = Number(c1.exp_for_next_level)
  c2.exp_for_next_level = Number(c2.exp_for_next_level)
  let e1 = 0
  let e2 = 0
  let p1 = c1.speed / c2.speed > 1 ? 1 : c1.speed / c2.speed
  let p2 = c2.speed / c1.speed > 1 ? 1 : c2.speed / c1.speed
  let rRange = 2*(Math.sqrt(1.25)-1)
  let d1 = 0
  let d2 = 0
  while(c1.current_hp > 0 && c2.current_hp > 0) {
    let t1 = (1-e1)/p1
    let t2 = (1-e2)/p2
    let c1Attacking = t1 < t2
    if(t1 == t2) {
      c1Attacking = Math.random() < 0.5
    }
    if(c1Attacking) {
      e1 = 0
      e2 += t1*p2
    } else {
      e2 = 0
      e1 += t2*p1
    }
    let roll1 = Math.random()*rRange + 2 - Math.sqrt(1.25)
    let roll2 = Math.random()*rRange + 2 - Math.sqrt(1.25)
    if(c1Attacking) {
      let damage = Math.round((c1.attack-c2.defense/2)*roll1*roll2)
      damage = damage > 1 ? damage : 1
      console.log(`${c1.character_name} deals ${damage} damage`)
      c2.current_hp -= damage
      d2 += damage
    } else {
      let damage = Math.round((c2.attack-c1.defense/2)*roll1*roll2)
      damage = damage > 1 ? damage : 1
      console.log(`${c2.character_name} deals ${damage} damage`)
      c1.current_hp -= damage
      d1 += damage
    }
  }
  if(c1.current_hp < 0) {
    d1 += c1.current_hp
    c1.current_hp = 0
  }
  if(c2.current_hp < 0) {
    d2 += c2.current_hp
    c2.current_hp = 0
  }
  const c1Win = c1.current_hp > 0
  c1.exp += Math.floor((c1Win ? 4 : 2)*((c2.level + 1) ** 1.5))
  c2.exp += Math.floor((c1Win ? 2 : 4)*((c1.level + 1) ** 1.5))
  if(c1.exp >= c1.exp_for_next_level) {
    let boosts = [0, 0, 0, 0, 0, 0]
    while(c1.exp >= c1.exp_for_next_level) {
      c1.exp -= c1.exp_for_next_level
      c1.exp_for_next_level = Math.floor(c1.exp_for_next_level*1.6)
      c1.level++
      let ups = [...stats]
      ups.push("max_hp")
      for(let i = 0; i < 6; i++) {
        let boost = Math.floor(Math.random()*(c1.level+1))
        console.log(`${ups[i]}: ${boost}`)
        c1[ups[i]] += boost
        boosts[i] = boost
      }
    }
    let qs = "UPDATE characters SET level = $2, exp = $3, exp_for_next_level = $4, max_hp = max_hp + $5, current_hp = current_hp - $6, attack = attack + $7, defense = defense + $8, speed = speed + $9, heal_rate = heal_rate + $10 WHERE character_id = $1"
    await query(qs, [c1.character_id, c1.level, c1.exp, c1.exp_for_next_level, boosts[0]+boosts[5], d1, boosts[1], boosts[2], boosts[3], boosts[4]])
  } else {
    let qs = "UPDATE characters SET current_hp = current_hp - $2, exp = $3 WHERE character_id = $1"
    await query(qs, [c1.character_id, d1, c1.exp])
  }
  if(c2.exp >= c2.exp_for_next_level) {
    let boosts = [0, 0, 0, 0, 0, 0]
    while(c2.exp >= c2.exp_for_next_level) {
      c2.exp -= c2.exp_for_next_level
      c2.exp_for_next_level = Math.floor(c2.exp_for_next_level*1.6)
      c2.level++
      let ups = [...stats]
      ups.push("max_hp")
      for(let i = 0; i < 6; i++) {
        let boost = Math.floor(Math.random()*(c2.level+1))
        console.log(`${ups[i]}: ${boost}`)
        c2[ups[i]] += boost
        boosts[i] = boost
      }
    }
    let qs = "UPDATE characters SET level = $2, exp = $3, exp_for_next_level = $4, max_hp = max_hp + $5, current_hp = current_hp - $6, attack = attack + $7, defense = defense + $8, speed = speed + $9, heal_rate = heal_rate + $10 WHERE character_id = $1"
    await query(qs, [c2.character_id, c2.level, c2.exp, c2.exp_for_next_level, boosts[0]+boosts[5], d2, boosts[1], boosts[2], boosts[3], boosts[4]])
  } else {
    let qs = "UPDATE characters SET current_hp = current_hp - $2, exp = $3 WHERE character_id = $1"
    await query(qs, [c2.character_id, d2, c2.exp])
  }
  let qs = "INSERT into battles (winner_id, loser_id, round) values ($1, $2, $3)"
  await query(qs, [c1Win ? c1.character_id : c2.character_id, c1Win ? c2.character_id : c1.character_id, round])
  qs = "UPDATE users SET gold = gold + $2 WHERE user_id = $1"
  await query(qs, [c1Win ? c1.user_id : c2.user_id, 3*((c1Win ? c2.level : c1.level)+1)])
  console.log(c1)
  console.log(c2)
}

setInterval(checkForBattles, 1000*20)
setInterval(pingUpdating, 1000*5)