// Imports
require('dotenv').config()
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // for testing locally (delete when pushing, npm start)

const express = require("express")
const cors = require("cors");

const app = express()
app.use(cors());
app.use(express.json())


// LEGACY (mariadb): Sending the parts (excluding the available quantity) from the legacy DB
const mariadb = require("mariadb");
const legacyPool = mariadb.createPool({
    host: process.env.LEGACY_HOST,
    port: process.env.LEGACY_PORT,
    user: process.env.LEGACY_USER,
    password: process.env.LEGACY_PASSWORD,
    database: process.env.LEGACY_DATABASE,
});
app.get("/api/shop/items", async (req, res) => {
    let connection;
    try {
        connection = await legacyPool.getConnection();
        const rows = await connection.query("SELECT * FROM parts");

        res.json(rows);
        console.log("Server: Sending legacy items");

    } catch (err) {
        console.log(err);
        res.status(500).send({ error: 'Database query failed' });
        return; // Error?

    } finally {
        if (connection)
            connection.end();
    }
});


// Api
const dbRouter = require('./routes/db.router')
app.use("/api", dbRouter)


// Server Main Page (debug info)
const pg = require("pg")
const pool = new pg.Pool({
    connectionString: process.env.POSTGRES_URL + "?sslmode=require",
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
});
async function get_query(sql) {
    let client = await pool.connect();
    try {
        let res = await client.query(sql);
        return res.rows;

    } catch (err) {
        console.log("Database Error:", err);
        return null;

    } finally {
        client.release();
    }
}

app.get("/", async (req, res) => {
//  res.writeHead(200, { 'Content-Type': 'text/plain' });
//  res.end('Hello World!\n');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const a = await get_query("SELECT * FROM customers");
    const b = await get_query("SELECT * FROM orders");
    const c = await get_query("SELECT * FROM order_items");
    const d = await get_query("SELECT * FROM shipping");
    const e = await get_query("SELECT * FROM quantities");
    res.end(JSON.stringify([
        "---     CUSTOMERS     ---", a,
        "---      ORDERS       ---", b,
        "---   ORDER ITEMS     ---", c,
        "--- SHIPPING BRACKETS ---", d,
        "---    QUANTITIES     ---", e.map(row => row.quantity)
    ]));
});

app.listen(process.env.PORT, () => console.log(`Server is running on port ${process.env.PORT}`))
