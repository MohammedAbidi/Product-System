  /////////////
 // Imports //
/////////////
const SECRETS = require("./secrets");

const pg = require("pg")
const mariadb = require("mariadb");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());


  //////////////
 // Database //
//////////////
const legacyPool = mariadb.createPool({
    host: SECRETS.LEGACY_HOST,
    port: SECRETS.LEGACY_PORT,
    user: SECRETS.LEGACY_USER,
    password: SECRETS.LEGACY_PASSWORD,
    database: SECRETS.LEGACY_DATABASE,
});

// Setup local database (pool)
let DB_INFO = {
    host: "127.0.0.1", // wtf... SECRETS.DB_HOST,
    user: SECRETS.DB_USER,
    password: SECRETS.DB_PASSWORD,
//  database: SECRETS.DB_DATABASE,  // this will be added into here LATER
//  port: SECRETS.DB_PORT
};

async function createDatabase() {
    console.log("Connecting to the local database...");

    let client;
    try {
        client = new pg.Client(DB_INFO);
        await client.connect();
        console.log("Connected. Loading database...");

        // Create database if it does not exist
        await client.query(`DROP DATABASE IF EXISTS ${SECRETS.DB_DATABASE}`);
        await client.query(`CREATE DATABASE ${SECRETS.DB_DATABASE}`);

    } catch (err) {
        console.error("Local Database connection failed.", err.toString());
        throw err;

    } finally {
        await client.end();
    }

    // Success, add db and create a new pool with it
    console.log("Local database loaded.");
    try {
        // Create tables if they dont exist
        DB_INFO["database"] = SECRETS.DB_DATABASE;
        client = new pg.Client(DB_INFO);
        await client.connect();

        // This DROP statement is only for testing, you can delete these later
        await client.query("DROP TABLE IF EXISTS shipping, order_items, orders, customers, quantities"); // For testing (delete this later)

        // Hardcoded (for now)
        await client.query(
            `CREATE TABLE quantities (
                part_number  INT PRIMARY KEY,
                quantity     INT NOT NULL
            )`
        );

        await client.query(`
            CREATE TABLE customers (
                id       INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                name     VARCHAR(50),
                email    VARCHAR(50),
                address  VARCHAR(50)
            )`
        );

        await client.query( // statuses: "Open", "Filled", "Authorized", "Shipped"
            `CREATE TABLE orders (
                id           INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                customer_id  INT NOT NULL,
                timestamp    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                shipping     NUMERIC(8,2) NOT NULL DEFAULT 0,
                status       VARCHAR(10) NOT NULL DEFAULT 'Open',

                CONSTRAINT fk_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id)
            )`
        );

        await client.query(
            `CREATE TABLE order_items (
                order_id     INT NOT NULL,
                part_number  INT NOT NULL,
                quantity     INT NOT NULL,

            PRIMARY KEY (order_id, part_number),
            CONSTRAINT fk_order_id FOREIGN KEY (order_id) REFERENCES orders(id)
            )`
        );

        await client.query(
            `CREATE TABLE shipping (
                weight  NUMERIC(4,2) NOT NULL PRIMARY KEY,
                price   NUMERIC(8,2) NOT NULL
            )`
        );

        // Now, get legacy data to...
        let legacyData;
        let legacyConnection;
        try {
            legacyConnection = await legacyPool.getConnection();
            legacyData = await legacyConnection.query("SELECT * FROM parts");
        } catch (err) {
            console.error("Error closing the legacy connection during setup.", err);
            throw err;
        } finally {
            if (legacyConnection) legacyConnection.end();
        }

        // ...fill our database with random values accurately (for testing)
        let first_flag = true
        let random_values = "";

        // Quantities Mock - randomly generating a random list of available quantities for all of the objects
        for (const dict of legacyData) {
            if (first_flag)
                first_flag = false;
            else
                random_values += ',';

            random_values += '(' + dict.number + ',' + Math.floor(Math.random() * 51) + ')'; // Generates a random integer between 0 and 50
        }
        await client.query(`INSERT INTO quantities (part_number, quantity) VALUES ${random_values};`);

        // Customers (hard coded) [name, email, address]
        await client.query(`
            INSERT INTO
                customers (name, email, address)
            VALUES
                ('John Doe',     'jdoe@pizza.com',     '100 Apple St. Rock, WI 60000'),
                ('Jane Doe',     'janedoe@pizza.com',  '102 Apple St. Rock, WI 60000'),
                ('Bob Roberts',  'bbob@boba.com',      '1010 Jane Ave. Pearl, MI 66000');
        `);

        // Orders (hard coded) [customer_id, shipping, status]
        await client.query(`
            INSERT INTO
                orders (customer_id, shipping, status)
            VALUES
                (1,  5.00, 'Open'),
                (2, 10.00, 'Open'),
                (3, 15.00, 'Open');
        `);

        // Order Items (hard coded) [order_id, part_number, quantity]
        await client.query(`
            INSERT INTO
                order_items (order_id, part_number, quantity)
            VALUES 
                (1, 1, 2),
                (1, 2, 5),
                (2, 1, 2),
                (3, 2, 5);
        `);

        // Shipping (hard coded) [weight, price]
        await client.query(`
            INSERT INTO
                shipping (weight, price)
            VALUES
                ( 0.00,  0.00),
                ( 5.00,  5.00),
                (10.00, 10.00),
                (15.00, 15.00),
                (99.99, 20.00);
        `);

    } catch (err) {
        console.error("Error setting up tables", err.toString());
        throw err; // At this point just crash on purpose, idk what's going on with this

    } finally {
        await client.end();
    }
}
createDatabase();
DB_INFO["database"] = SECRETS.DB_DATABASE;
// DB_INFO["port"] = SECRETS.DB_PORT; // Not needed?
const pool = new pg.Pool(DB_INFO); // Main pool with everything setup (node-postgres.com/apis/pool)
// Helper functions


  /////////
 // API //
/////////
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

// Safe way of multiple database updates: Transaction pipeline
// node-postgres.com/features/transactions
async function set_queries(sqls) {
    let client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Run statements
        let rows_affected = 0; // Optional counter for debugging
        for (const sql of sqls) {
            let response = await client.query(sql); // Not optimized at all lol
            rows_affected += response.rowCount;
        }

        // Commit Changes
        await client.query("COMMIT");
        return rows_affected;

    } catch (err) {
        console.error("Database transaction error, reverting changes: ", err);
        await client.query("ROLLBACK"); // Undo
        throw err;

    } finally {
        client.end();
    }
}



  /////////
 // API //
/////////
// LEGACY (mariadb): Sending the parts (excluding the available quantity) from the legacy DB
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


// Sending a dictionary of the available quantities for each part
app.get("/api/shop/quantities", async (req, res) => {
    const rows = await get_query("SELECT part_number, quantity FROM quantities"); // [{part_number: 1, quantity: 23}, {part_number: 3, quantity: 43}, ...]
    if (rows) {
        // const no_values = rows.map(row => row.part_number); // If you really wanted it as [1, 3, ...] from [{part_number: 1}, {part_number: 3}, ...]
        const quantities = rows.reduce((result, item) => {
            result[item.part_number] = item.quantity;
            return result;
        }, {});

        res.json(quantities); // {'1': 23, '3': 43, ...}
        console.log("Server: Sending available quantities for each item");
    } else {
        res.status(500).send({ error: 'Database query for quantities failed' });
    }
});


/*
    Reading the billing information and the items to be purchased,
    and if the transaction is successful, returns the following info:
    - Order ID (for the order number created)
    - Amount
    - Authorization code
    - Name
    - Email
*/
app.post('/api/shop/pay', async (req, res) => {
    // TODO?

    /*
        name: string,
        email: string,
        address: string,
        creditCard: string,
        expiration: string,
        orderItems: [ 1, 2 ],
        quantities: [ 3, 3 ],

        // Probably ignore these (security risk?)
        amount: number,
        shipping: number
    */
    let paymentInfo = req.body;
    console.log(paymentInfo);

    let client = await pool.connect();
    try {
        await client.query("BEGIN");
        let rows_affected = 0; // Optional counter for debugging

        // Add customer
        let response = await client.query(`
            INSERT INTO
                customers (name, email, address)
            VALUES
                ('${paymentInfo.name}', '${paymentInfo.email}', '${paymentInfo.address}')
            RETURNING id;
        `);
        rows_affected += response.rowCount;

        console.log(response);

        // Add Order (timestamp is automatic)
        const CUSTOMER_ID = response.rows[0].id;
        response = await client.query(`
            INSERT INTO
                orders (customer_id, shipping, status)
            VALUES
                (${CUSTOMER_ID}, ${paymentInfo.shipping}, 'Open')
            RETURNING id;
        `);
        rows_affected += response.rowCount;
            
        // Add Order Items
        const ORDER_ID = response.rows[0].id;
        const part_numbers = paymentInfo.orderItems;
        const quantities = paymentInfo.quantities;
        let first_flag = true;
        let random_values = "";
        for (let i = 0; i < part_numbers.length; i++) {
            if (first_flag)
                first_flag = false;
            else
                random_values += ',';

            random_values += `(${ORDER_ID},${part_numbers[i]},${quantities[i]})`; // Generates a random integer between 0 and 50
        }
        response = await client.query(`INSERT INTO order_items (order_id, part_number, quantity) VALUES ${random_values};`);
        rows_affected += response.rowCount;

        // If here, then out database will allow this transaction
        // So NOW we process the credit card
        response = await fetch(SECRETS.CC_WEBSITE, {
            method: "POST",
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            },
            /**
            body: JSON.stringify({
                trans: SECRETS.TRANSACTION_ID,
                vendor: SECRETS.VENDOR_ID,
                name: paymentInfo.name,
                cc: paymentInfo.creditCard,
                exp: paymentInfo.expiration,
                amount: paymentInfo.amount
            })
            //*/
            // For testing, uncomment above when we present this
            body: JSON.stringify({
                trans: "907-275800-296",
                vendor: "VE001-99",
                name: "John Doe",
                cc: "6011 1234 4321 1234",
                exp: "12/2024",
                amount: 654.32
            })
        })

        const data = await response.json();

        if ("errors" in data) {
            // if payment failed - the send() message won't show either way so maybe remove that
            //res.status(402).send( {"status" : "DECLINED"} )
            console.log("Credit Card Transaction failed", data.errors);
            throw data.errors[0];
        } else {
            // Commit Changes ONLY if credit card transaction was successful
            await client.query("COMMIT")

            // transaction is successful - the send() message will show up with the short JSON array below
            //res.status(200).send( {"status" : "APPROVED"} );

            res.status(200).json(data); // only for testing purposes for the Dialog window in frontend
            console.log(`Server: Added new order ${ORDER_ID} and charged cc: ${data.cc}. ${rows_affected} record(s) updated`);
        }

    } catch (err) {
        await client.query("ROLLBACK"); // Undo
        console.error("Transaction error, reverting any database changes: ", err);
        res.status(402).send({"status":"DECLINED"}); // only for testing purposes for the Dialog window in frontend
        throw err;

    } finally {
        client.release();
    }
});


// Sending a JSON array of orders - need to find a way to handle combining Customers, Orders, and Order_Items data together
app.get("/api/orders", async (req, res) => {
    // Extra: I sorted them from oldest to newest
    var orders = await get_query(`
        SELECT
            orders.id         AS id,
            orders.shipping   AS shipping,
            orders.status     AS status,
            customers.name    AS NAME,
            customers.address AS address,
            customers.email   AS email,
            FLOOR(EXTRACT(EPOCH FROM orders.timestamp)) AS timestamp
        FROM
            orders,
            customers
        WHERE
            orders.customer_id = customers.id
        ORDER BY
            orders.timestamp
    `);

    if (orders) {
        // Do items seperately (Unordered): [{id: 1, k: 1, v: 2}, {id: 1, k: 2, v: 3}, {id: 2, k: 43, v: 29}, ...]
        const all_items = await get_query("SELECT order_id AS id, part_number AS k, quantity AS v FROM order_items");

        // Set up
        let temp_lookup = {}; // {order_id: orders[pos]}
        for (let i = 0; i < orders.length; i++) {
            let order = orders[i];
            temp_lookup[order.id] = i;
            order.shipping = parseFloat(order.shipping); // Because postgres returns this as a string for some godam reason
            order.orderDate = parseInt(order.timestamp); // Same for timestamp
            delete order.timestamp; // why is orderDate LOWERCASED??!?!?
        }

        // Combine
        for (const item of all_items) {
            let order = orders[temp_lookup[item.id]];
            if ("items" in order)
                order.items[item.k] = item.v;
            else
                order.items = {[item.k]: item.v};
        }

        // Return
        res.json(orders);
        console.log("Server: Sending the list of orders");
        /* orders = // Array of Dictionaries...
            [{  id: 1,
                items: {
                    1: 2,
                    2: 5
                },
                shipping: 10.0,
                name: "John Doe",
                address: "100 Apple St. Rock, WI 60000",
                email: "jdoe@pizza.com",
                orderDate: 1732856405,
                status: "Open"
            }, ...]
        */
    } else {
        res.status(500).send({ error: 'Database query for orders failed' });
    }
});


// Updating the order to be marked as filled and, based on the filled order's items,
// deducting each ordered item's available quantity by the quantity the customer purchased
app.post("/api/ff/complete", async (req, res) => {
    let completedOrder = req.body.id; // req.body = {id: 1}

    const rows_affected = await set_queries([`
        UPDATE orders
        SET    status = 'Filled'
        WHERE  id = ${completedOrder};
    `,`
        UPDATE
            quantities AS A
        SET
            quantity = A.quantity - B.quantity
        FROM
            order_items AS B
        WHERE
            A.part_number = B.part_number
            AND B.order_id = ${completedOrder};
    `]);

    if (rows_affected) {
        console.log(`Server: Updated order ${completedOrder} to "Filled" and its item's quantities. ${rows_affected} record(s) updated`);
        res.status(200).send();
    } else {
        res.status(500).send({ error: 'Database query for order fulfillment failed' });
    }
});


// Updating a row from the quantity table to reflect the item's new available quantity 
app.post("/api/rcv/available", async (req, res) => {
    const data = req.body; // {id: 3, newQty: 47}

    const rows_affected = await set_queries([`
        UPDATE quantities
        SET    quantity    = ${data.newQty}
        WHERE  part_number = ${data.id};
    `]);

    if (rows_affected) {
        console.log("Server: Updating a row from the quantity table to reflect the new quantity on hand");
        res.status(200).send();
    } else {
        res.status(500).send({ error: 'Database query for quantities failed' });
    }
});


// Sending all of the rows from the shipping backets table
app.get("/api/admin/brackets", async (req, res) => {
    const shipping_brackets = await get_query("SELECT * FROM shipping ORDER BY weight"); // [{"weight": 0.00, "price": 0.00}, ...]
    if (shipping_brackets) {
        let prev = shipping_brackets[0];
        let old_brackets = [];
        for (let i = 1; i < shipping_brackets.length; i++) {
            const bracket = shipping_brackets[i];
            old_brackets[i-1] = {id: i, low: prev.weight, high: bracket.weight, price: parseFloat(prev.price)};
            prev = bracket;
        }

        res.json(old_brackets); // [{"id": 1, "low": 0, "high": 5, "price": 0.0}, ...]
        console.log("Server: Sending the bracket table's rows");
    } else {
        res.status(500).send({ error: 'Database query for shipping brackets failed' });
    }
});


// Adding and updating rows in brackets table for new ranges
app.post("/api/admin/add_bracket", async (req, res) => {
    // TODO
    console.log("TODO: Adding and updating rows in brackets table for new ranges");
});



  ////////////
 // Server //
////////////
// Main page (debug info)
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

app.listen(SECRETS.PORT, () => console.log(`Server is running on port ${SECRETS.PORT}`));
