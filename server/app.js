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
app.set('port', process.env.PORT || 3000 );
// set up some middleware to handle processing body requests
app.use(express.json())
// set up some midlleware to handle cors
app.use(cors())

const stats = ["max_hp", "attack", "defense", "speed", "heal_rate"]

// base route
app.get('/', (req, res) => {
    res.send("Welcome to Ultimate AFK Dungeon Raider Guys API!")
})

// up route
app.get('/up', (req, res) => {
  res.json({status: 'up'})
})

/**
  * POST route that adds a certain number of rounds to run the simulation for
  * Takes the number of rounds
  */
app.post('/rounds', (req, res) => {
  const body = req.body
  const rounds = Number(body.rounds)
  if(!rounds || !(Number.isInteger(rounds) && rounds > 0)) {
    return res.status(400).json({message: "rounds must be a positive integer"})
  }
  if(updating) {
    return res.status(503).json({message: "Wait until previous rounds are finished before sending more rounds"})
  }
  console.log(`Adding ${rounds} rounds`)
  forceRounds += Number(rounds)
  return res.json([])
})

// Import routes
characterRoutes(app)
userRoutes(app)
itemRoutes(app)

// Listen on port
app.listen(app.get('port'), () => {
    console.log('App is running at http://localhost:%d in %s mode', app.get('port'), app.get('env'))
    console.log('  Press CTRL-C to stop\n')
})

// Boolean that indicates if any backend is running the simulation
let updating = null
// Boolean that indicates if THIS SPECIFIC backend is running the simulation
let thisUpdating = false
// Object that holds some data about the simulation, such as the time of last update, the next round number, and the number of rounds to run
let simData = {}
// Number of rounds that have been forced to the backend by the rounds route
let forceRounds = 0

// Function that pings the backend and checks if enough time has passed for more rounds, and how many rounds should be run
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

/**
 * Function that checks in the database if a backend is running the simulation
 * If no backend has updated the updating table in over a minute, this indicates
 * that something failed and the backend no longer needs to be held, so this
 * sets running back to false in the database
 */
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

/**
 * Prints out to the console who is updating
 * If this backend is the one doing the updating, update the updating
 * table last time to show that the updating is still going on
 */
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
  }
}

/**
 * Function that checks if there are rounds to run and if anyone is running them
 * If there are rounds to run, and no one is running them, this backend will run them
 */
async function checkForBattles() {
  // Create a client in the pool, which will be used to lock the updating table while checking it
  const client = await getClient()
  // Start the transaction to check the table
  await client.query("BEGIN")
  try {
    // Get a write lock on the table, wait until the lock can be obtained
    await client.query("LOCK TABLE updating IN ACCESS EXCLUSIVE MODE")
    // Call this function to set updating, to check if the sim should run
    await checkUpdating(client)
    // If no one is updating, check if there are any battles to run
    if(!updating) {
      await numBattles()
      // If there are rounds to run from either time passing or the rounds route, start running rounds
      if(simData.newRounds > 0 || forceRounds > 0) {
        // This backend is now running, set both updating bools to true and update the updating table
        updating = true
        thisUpdating = true
        let qs = "UPDATE updating SET running = true, last = $1"
        await client.query(qs, [new Date()])
        // End the transaction once we've set updating, releasing the lock
        await client.query("COMMIT")
        console.log("Expected rounds:", simData.newRounds)
        // Loop, running the number of rounds needed to catch the game up to the current time
        for(let i = 0; i < simData.newRounds; i++) {
          // Create a client for this specific round, starting a transaction
          const client = await getClient()
          // This transaction can be rolled back if something goes wrong
          await client.query("BEGIN")
          try {
            console.log(`Running round ${i + 1} / ${simData.newRounds}`)
            // Run this round of the simulation, passing the connection to the helper function
            await runRound(simData.next_round, client)
            // When the round finishes, update the table to indicate that a round has completed
            simData.time = new Date(simData.time.getTime() + (1000*60*30))
            simData.next_round++
            qs = "UPDATE last_update SET time = $1, next_round = $2"
            await client.query(qs, [simData.time, simData.next_round])
            // End the transaction
            await client.query("COMMIT")
          } catch(err) {
            // If there is an error, rollback
            console.log(err)
            await client.query("ROLLBACK")
          } finally {
            // Release the round's connection
            client.release()
          }
        }
        for(let i = 0; i < forceRounds; i++) {
          // Create a client for this specific round, starting a transaction
          const client = await getClient()
          // This transaction can be rolled back if something goes wrong
          await client.query("BEGIN")
          try {
            console.log(`Running round ${i + 1} / ${forceRounds}`)
            // Run this round of the simulation, passing the connection to the helper function
            await runRound(simData.next_round, client)
            // When the round finishes, update the table to indicate that a round has completed
            simData.next_round++
            // Time is not updated as these rounds were forced to backend, not time dependent
            qs = "UPDATE last_update SET next_round = $1"
            await client.query(qs, [simData.next_round])
            // End the transaction
            await client.query("COMMIT")
          } catch(err) {
            // If there is an error, rollback
            console.log(err)
            await client.query("ROLLBACK")
          } finally {
            // Release the round's connection
            client.release()
          }
        }
        // Print the time of the final round of the updating belongs to
        console.log(simData.time)
        // Set rounds to 0 as they've been executed
        simData.newRounds = 0
        forceRounds = 0
        // Release the updating table
        qs = "UPDATE updating SET running = false, last = NULL"
        await query(qs)
        // Set bools to false
        updating = false
        thisUpdating = false
      // If no rounds to run, commit now
      } else {
        await client.query("COMMIT")
      }
    // If someone is updating, commit now
    } else {
      await client.query("COMMIT")
    }
  // If there is an error, log it and commit now
  } catch(err) {
    console.log(err)
    await client.query("COMMIT")
  }
  // Release the connection that was used to check the updating table
  client.release()
}

async function runRound(round, client) {
  // Get a list of characters who don't have enough hp to battle
  let qs = "SELECT * FROM characters WHERE current_hp / max_hp < 0.5"
  let resting = (await client.query(qs)).rows
  // Get a list of characters who do have enough hp to battle
  qs = "SELECT * FROM characters WHERE current_hp / max_hp >= 0.5"
  let ready = (await client.query(qs)).rows
  /**
   * For runtime optimization, instead of awaiting every battle,
   * since they don't interfere, we put every promise of this round
   * in an array, and then wait until they all conclude with a Promise.all
   */
  let calls = []
  // If we have an odd number of characters ready to battle, move one to resting
  if(ready.length % 2 == 1) {
    // If there are bots ready, randomly select one to force to rest
    const bots = ready.filter(char => char.character_type === "bot")
    console.log("bots length" + bots.length)
    // If not, randomly select any character to force to rest
    const leaveOut = bots.length > 0 ? bots[Math.floor(Math.random()*bots.length)] : ready[Math.floor(Math.random()*ready.length)]
    // Remove this character from ready and push to resting
    ready = ready.filter(char => char.character_id !== leaveOut.character_id)
    resting.push(leaveOut)
  }
  console.log("Round: " + round)
  /** 
   * If there are any characters ready to battle, start pairing them using the pairing algorithm
   * Pairing algorithm tries to pair characters with similar level characters,
   * with opponents being randomly selected from the most similarly leveled characters
   */
  if(ready.length > 1) {
    // Order by level
    ready.sort((a, b) => a.level - b.level)
    // Compute the reach range, or how far out past the current index the algorithm can look for an opponent
    const range = Math.floor(ready.length / 10) + 3
    // Boolean array parallel to ready indicating which characters have been paired
    let charMap = new Array(ready.length).fill(false)
    // Algorithm works from both ends inward, swapping from left to right each iteration
    let left = true
    // Initial indices are the ends of the ready array
    let leftInd = 0
    let rightInd = ready.length-1
    // We need to make ready.length/2 matches
    for(let i = 0; i < ready.length/2; i++) {
      // If we are on the left side right now:
      if(left) {
        // Shift until over an unpaired character
        while(charMap[leftInd]) {
          leftInd++
        }
        let cands = []
        // Add any unpaired opponents in range to the candidates
        for(let j = leftInd+1; j < leftInd+range+1; j++) {
          if(!charMap[j] && j < charMap.length) {
            cands.push(j)
          }
        }
        // Set the index of the opponent
        let opp = 0
        // If no players are in range (rare but possible towards middle of array), just select the closest leveled opponent remaining
        if(cands.length == 0) {
          opp = leftInd+range+1
          while(charMap[opp]) {
            opp++
          }
        // Otherwise, select an opponent randomly from the candidates
        } else {
          opp = cands[Math.floor(Math.random()*cands.length)]
        }
        // Set the paired characters' bools to true
        charMap[leftInd] = true
        charMap[opp] = true
        // Start running the async battle, pushing it's promise to calls
        calls.push(battle(ready[leftInd], ready[opp], round, client))
        console.log("(" + ready[leftInd].character_name + ", " + ready[opp].character_name + ")")
      // If we are on the right side right now:
      } else {
        // Shift until over an unpaired character
        while(charMap[rightInd]) {
          rightInd--
        }
        let cands = []
        // Add any unpaired opponents in range to the candidates
        for(let j = rightInd-1; j > rightInd-range-1; j--) {
          if(!charMap[j] && j > -1) {
            cands.push(j)
          }
        }
        // Set the index of the opponent
        let opp = 0
        // If no players are in range (rare but possible towards middle of array), just select the closest leveled opponent remaining
        if(cands.length == 0) {
          opp = rightInd-range-1
          while(charMap[opp]) {
            opp--
          }
        // Otherwise, select an opponent randomly from the candidates
        } else {
          opp = cands[Math.floor(Math.random()*cands.length)]
        }
        // Set the paired characters' bools to true
        charMap[rightInd] = true
        charMap[opp] = true
        // Start running the async battle, pushing it's promise to calls
        calls.push(battle(ready[opp], ready[rightInd], round, client))
        console.log("(" + ready[opp].character_name + ", " + ready[rightInd].character_name + ")")
      }
      // Switch which side of the array we are working from
      left = !left
    }
  }
  // Also query a heal for for all the resting players, add these to the list of promises
  for(let i = 0; i < resting.length; i++) {
    const newHP = Number(resting[i].current_hp) + Number(resting[i].heal_rate)
    const maxHP = Number(resting[i].max_hp)
    resting[i].current_hp = newHP < maxHP ? newHP : maxHP
    let qs = "UPDATE characters SET current_hp = $2 WHERE character_id = $1"
    calls.push(client.query(qs, [resting[i].character_id, resting[i].current_hp]))
  }
  // Await all queries
  await Promise.all(calls)
}

// Function that runs each battle
async function battle(c1, c2, round, client) {
  // Cast all numeric battle values to numbers
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
  // "Energy" values e1 and e2 are increased based on the speed ratio, a character attacks when it's energy reaches 1
  let e1 = 0
  let e2 = 0
  // Speed can technically become negative if the character has too much heavy equipment
  // Setting it to 1 in battle stops everything from breaking
  let speed1 = c1.speed > 0 ? c1.speed : 1
  let speed2 = c2.speed > 0 ? c2.speed : 1
  // "Pace" is the rate at which a character gains energy
  let p1 = speed1 / speed2 > 1 ? 1 : speed1 / speed2
  let p2 = speed2 / speed1 > 1 ? 1 : speed2 / speed1
  // rRange is a constant used to calculate the range of damage rolls
  let rRange = 2*(Math.sqrt(1.25)-1)
  // d1 and d2 are damage totals for updating the database
  let d1 = 0
  let d2 = 0
  // While both characters are above 0 hp, run the battle
  while(c1.current_hp > 0 && c2.current_hp > 0) {
    // Compute how much "time" is needed for each character to have full energy
    let t1 = (1-e1)/p1
    let t2 = (1-e2)/p2
    // Character 1 is attacking if they need less time to have full energy
    let c1Attacking = t1 < t2
    // If both characters are ready simultaneously, pick on at random
    if(t1 == t2) {
      c1Attacking = Math.random() < 0.5
    }
    // If character 1 is attacking:
    if(c1Attacking) {
      // Set energy back to 0
      e1 = 0
      // Update p2s energy based on how much time was needed
      e2 += t1*p2
    // If character 2 is attacking:
    } else {
      // Set energy back to 0
      e2 = 0
      // Update p1s energy based on how much time was needed
      e1 += t2*p1
    }
    // Two damage rolls multiplied together creates a distribution that is more normal than uniform
    let roll1 = Math.random()*rRange + 2 - Math.sqrt(1.25)
    let roll2 = Math.random()*rRange + 2 - Math.sqrt(1.25)
    // Calculate and apply damage, if less than 1, set to 1
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
  // If a character goes below 0, set hp to 0, remove excess damage from d1 and d2 to not break database
  if(c1.current_hp < 0) {
    d1 += c1.current_hp
    c1.current_hp = 0
  }
  if(c2.current_hp < 0) {
    d2 += c2.current_hp
    c2.current_hp = 0
  }
  // Boolean that indicates who won
  const c1Win = c1.current_hp > 0
  // Winner gets more exp (relative to level) than loser
  c1.exp += Math.floor((c1Win ? 4 : 2)*((c2.level + 1) ** 1.5))
  c2.exp += Math.floor((c1Win ? 2 : 4)*((c1.level + 1) ** 1.5))
  // If a character is ready to level up, start leveling them up
  if(c1.exp >= c1.exp_for_next_level) {
    let boosts = [0, 0, 0, 0, 0, 0]
    // Keep leveling until no more leveling is needed
    while(c1.exp >= c1.exp_for_next_level) {
      // Update current and next experience
      c1.exp -= c1.exp_for_next_level
      c1.exp_for_next_level = Math.floor(c1.exp_for_next_level*1.6)
      // Increase level
      c1.level++
      // Every stat gets a random boost, hp is there twice because it gets two boosts
      let ups = [...stats]
      ups.push("max_hp")
      // Increase every stat by a random amount between 0 and level (inclusive)
      for(let i = 0; i < 6; i++) {
        let boost = Math.floor(Math.random()*(c1.level+1))
        console.log(`${ups[i]}: ${boost}`)
        c1[ups[i]] += boost
        boosts[i] = boost
      }
    }
    // Update stats
    let qs = "UPDATE characters SET level = $2, exp = $3, exp_for_next_level = $4, max_hp = max_hp + $5, current_hp = current_hp - $6, attack = attack + $7, defense = defense + $8, speed = speed + $9, heal_rate = heal_rate + $10 WHERE character_id = $1"
    await client.query(qs, [c1.character_id, c1.level, c1.exp, c1.exp_for_next_level, boosts[0]+boosts[5], d1, boosts[1], boosts[2], boosts[3], boosts[4]])
  } else {
    // If no level up, just update hp and exp
    let qs = "UPDATE characters SET current_hp = current_hp - $2, exp = $3 WHERE character_id = $1"
    await client.query(qs, [c1.character_id, d1, c1.exp])
  }
  if(c2.exp >= c2.exp_for_next_level) {
    let boosts = [0, 0, 0, 0, 0, 0]
    // Keep leveling until no more leveling is needed
    while(c2.exp >= c2.exp_for_next_level) {
      // Update current and next experience
      c2.exp -= c2.exp_for_next_level
      c2.exp_for_next_level = Math.floor(c2.exp_for_next_level*1.6)
      // Increase level
      c2.level++
      // Every stat gets a random boost, hp is there twice because it gets two boosts
      let ups = [...stats]
      ups.push("max_hp")
      // Increase every stat by a random amount between 0 and level (inclusive)
      for(let i = 0; i < 6; i++) {
        let boost = Math.floor(Math.random()*(c2.level+1))
        console.log(`${ups[i]}: ${boost}`)
        c2[ups[i]] += boost
        boosts[i] = boost
      }
    }
    // Update stats
    let qs = "UPDATE characters SET level = $2, exp = $3, exp_for_next_level = $4, max_hp = max_hp + $5, current_hp = current_hp - $6, attack = attack + $7, defense = defense + $8, speed = speed + $9, heal_rate = heal_rate + $10 WHERE character_id = $1"
    await client.query(qs, [c2.character_id, c2.level, c2.exp, c2.exp_for_next_level, boosts[0]+boosts[5], d2, boosts[1], boosts[2], boosts[3], boosts[4]])
  } else {
    // If no level up, just update hp and exp
    let qs = "UPDATE characters SET current_hp = current_hp - $2, exp = $3 WHERE character_id = $1"
    await client.query(qs, [c2.character_id, d2, c2.exp])
  }
  // Record the battle
  let qs = "INSERT into battles (winner_id, loser_id, round) values ($1, $2, $3)"
  await client.query(qs, [c1Win ? c1.character_id : c2.character_id, c1Win ? c2.character_id : c1.character_id, round])
  // Give earned gold to the winner
  qs = "UPDATE users SET gold = gold + $2 WHERE user_id = $1"
  await client.query(qs, [c1Win ? c1.user_id : c2.user_id, 3*((c1Win ? c2.level : c1.level)+1)])
  console.log(c1)
  console.log(c2)
}

// Set interval to check for battles every 20 seconds
setInterval(checkForBattles, 1000*20)

//Set interval to check if someone is updating every 5 seconds
setInterval(pingUpdating, 1000*5)