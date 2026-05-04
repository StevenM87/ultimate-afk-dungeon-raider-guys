import pg from 'pg'
const { Pool } = pg
 
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DBNAME,
  user: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
})

pool.connect()

export const query = async (text, values) => {
    try{
        const now = new Date()
        console.log("query to be executed:", text)
        const res = await pool.query(text, values)
        const now2 = new Date()
        console.log(`it took ${now2-now}ms to run`)
        return res
    } catch (err) {
        console.error("Problem executing query")
        console.error(err)
        throw err
    }
}

/**
 * Using pooling allowed us to write atomic transactions with multiple queries.
 * This is useful since a lot of our application routes and our simulation functions
 * have multiple queries. If a query fails, we can rollback the whole transaction.
 */
export const getClient = async () => {
  const client = await pool.connect()

  return {
    query: async (...args) => {
      console.log("client query:", args[0])
      return client.query(...args)
    },
    release: () => client.release()
  }
}

/* 
HOW TO USE
    query(qs).then(data) => {res.json(data.rows)}
*/