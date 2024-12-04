  /////////////
 // Imports //
/////////////
const SECRETS = require("./secrets");

const mariadb = require('mariadb');
const sqlite3 = require("sqlite3").verbose();
const express = require('express');
const cors = require('cors');
const fetch = require("node-fetch");

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

// Setup local database (localDB)
const localDB = new sqlite3.Database(`./${SECRETS.LOCAL_DATABASE}.db`, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) return console.log(err);
});

async function createDatabase() {
    console.log("Connected to the local database.");

    // Get legacy data to fill our database with random values accurately later on (for testing)
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

    // Create tables if they dont exist
    localDB.serialize(() => { // Prevent race condition when setting too fast
        // This DROP statement is only for testing (need to do it for each in sqlite)
        localDB.run("DROP TABLE IF EXISTS shipping"); // For testing (delete these later)
        localDB.run("DROP TABLE IF EXISTS order_items");
        localDB.run("DROP TABLE IF EXISTS orders");
        localDB.run("DROP TABLE IF EXISTS customers");
        localDB.run("DROP TABLE IF EXISTS quantities");

        // Hardcoded (for now)
        localDB.run(
            `CREATE TABLE IF NOT EXISTS quantities (
                part_number  INTEGER PRIMARY KEY,
                quantity     INT NOT NULL
            )`
        );

        localDB.run(`
            CREATE TABLE IF NOT EXISTS customers (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                name     VARCHAR(50),
                email    VARCHAR(50),
                address  VARCHAR(50)
            )`
        );

        localDB.run( // statuses: "Open", "Filled", "Authorized", "Shipped"
            `CREATE TABLE IF NOT EXISTS orders (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id  INT NOT NULL,
                timestamp    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                shipping     FLOAT(8,2) NOT NULL DEFAULT 0,
                status       VARCHAR(10) NOT NULL DEFAULT 'Open',

            CONSTRAINT fk_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id)
            )`
        );

        localDB.run(
            `CREATE TABLE IF NOT EXISTS order_items (
                order_id     INT NOT NULL,
                part_number  INT NOT NULL,
                quantity     INT NOT NULL,

            PRIMARY KEY (order_id, part_number),
            CONSTRAINT fk_order_id FOREIGN KEY (order_id) REFERENCES orders(id)
            )`
        );

        localDB.run(
            `CREATE TABLE IF NOT EXISTS shipping (
                weight  FLOAT(4,2) NOT NULL PRIMARY KEY,
                price   FLOAT(8,2) NOT NULL
            )`
        );

        // Quantities Mock - Use legacy database to randomly generate a random list of available quantities for all of the objects
        let first_flag = true
        let random_values = "";
        for (const dict of legacyData) {
            if (first_flag)
                first_flag = false;
            else
                random_values += ',';

            random_values += '(' + dict.number + ',' + Math.floor(Math.random() * 51) + ')'; // Generates a random integer between 0 and 50
        }
        localDB.run(`INSERT INTO quantities (part_number, quantity) VALUES ${random_values};`);

        // Customers (hard coded) [name, email, address]
        localDB.run(`
            INSERT INTO
                customers (name, email, address)
            VALUES
                ("John Doe",     "jdoe@pizza.com",     "100 Apple St. Rock, WI 60000"),
                ("Jane Doe",     "janedoe@pizza.com",  "102 Apple St. Rock, WI 60000"),
                ("Bob Roberts",  "bbob@boba.com",      "1010 Jane Ave. Pearl, MI 66000");
        `);

        // Orders (hard coded) [customer_id, shipping, status]
        localDB.run(`
            INSERT INTO
                orders (customer_id, shipping, status)
            VALUES
                (1,  5.00, "Open"),
                (2, 10.00, "Open"),
                (3, 15.00, "Open");
        `);

        // Order Items (hard coded) [order_id, part_number, quantity]
        localDB.run(`
            INSERT INTO
                order_items (order_id, part_number, quantity)
            VALUES 
                (1, 1, 2),
                (1, 2, 5),
                (2, 1, 2),
                (3, 2, 5);
        `);

        // Shipping (hard coded) [weight, price]
        localDB.run(`
            INSERT INTO
                shipping (weight, price)
            VALUES
                ( 0.00,  0.00),
                ( 5.00,  5.00),
                (10.00, 10.00),
                (15.00, 15.00),
                (99.99, 20.00);
        `);
    });
}
createDatabase();


  ////////////
 // Server //
////////////
// Helper functions (used a lot)
async function get_query(sql) {
    return new Promise((resolve, reject) => {
        localDB.all(sql,(err, row) => {
            if (err) {
                console.log("Database Error:", err);
                reject(err);
            }
            resolve(row);
        });
    });
}

// Safe way of multiple database updates: Transaction pipeline
async function set_queries(sqls) {
    var results = [];
    var batch = ['BEGIN', ...sqls, 'COMMIT'];
    return batch.reduce((chain, statement) => chain.then(result => {
        results.push(result);
        return get_query(...[].concat(statement));
    }),
    Promise.resolve())
    .catch(err => get_query('ROLLBACK').then(() => Promise.reject(err + ' in statement #' + results.length)))
    .then(() => results.slice(2));
};

/* Magic: stackoverflow.com/questions/53299322/transactions-in-node-sqlite3
sqlite3.Database.prototype.runAsync = function (sql, ...params) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
};

sqlite3.Database.prototype.runBatchAsync = function (statements) {
    var results = [];
    var batch = ['BEGIN', ...statements, 'COMMIT'];
    return batch.reduce((chain, statement) => chain.then(result => {
        results.push(result);
        return db.runAsync(...[].concat(statement));
    }), Promise.resolve())
    .catch(err => db.runAsync('ROLLBACK').then(() => Promise.reject(err +
        ' in statement #' + results.length)))
    .then(() => results.slice(2));
};

var statements = [
    "DROP TABLE IF EXISTS foo;",
    "CREATE TABLE foo (id INTEGER NOT NULL, name TEXT);",
    ["INSERT INTO foo (id, name) VALUES (?, ?);", 1, "First Foo"]
];
db.runBatchAsync(statements).then(results => {
    console.log("SUCCESS!")
    console.log(results);
}).catch(err => {
    console.error("BATCH FAILED: " + err);
})
*/


  /////////
 // API //
/////////
// LEGACY: Sending the parts (excluding the available quantity) from the legacy DB
app.get("/api/shop/items", async (req, res) => {
    let connection;
    try {
        connection = await legacyPool.getConnection();
        const rows = await connection.query("SELECT * FROM parts");
        res.json(rows);
        console.log("Server: Sending legacy items");

    } catch (err) {
        res.status(500).send({ error: 'Database query failed' });

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

    // Look at this magnificent piece of s I wrote
    localDB.serialize(async function() {
        localDB.run("BEGIN TRANSACTION");

        try {
            let rows_affected = 0; // Optional counter for debugging

            localDB.run(`
                INSERT INTO
                    customers (name, email, address)
                VALUES
                    ('${paymentInfo.name}', '${paymentInfo.email}', '${paymentInfo.address}');
            `,

            function(err) { // Idk why this works... (this = { lastID: 4, changes: 1 })
                if (err) throw err;
                rows_affected    += this.changes;
                const CUSTOMER_ID = this.lastID; 

                // Add Order (timestamp is automatic)
                localDB.run(`
                    INSERT INTO
                        orders (customer_id, shipping, status)
                    VALUES
                        (${CUSTOMER_ID}, ${paymentInfo.shipping}, 'Open')
                `,

                function(err) {
                    if (err) throw err;
                    rows_affected += this.changes;
                    const ORDER_ID = this.lastID;

                    // Add Order Items
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
                    localDB.run(`INSERT INTO order_items (order_id, part_number, quantity) VALUES ${random_values};`,

                    function(err) {
                        if (err) throw err;
                        rows_affected += this.changes;

                        // If here, then out database will allow this transaction
                        // So NOW we process the credit card
                        const response = fetch(SECRETS.CC_WEBSITE, {
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
                        .then(response => {
                            response.json().then(data => {
                                if ("errors" in data) {
                                    // if payment failed - the send() message won't show either way so maybe remove that
                                    //res.status(402).send( {"status" : "DECLINED"} )
                                    console.log("Credit Card Transaction failed", data.errors);
                                    throw data.errors[0];
                                } else {
                                    // Commit Changes ONLY if credit card transaction was successful
                                    localDB.run("COMMIT");
                    
                                    // transaction is successful - the send() message will show up with the short JSON array below
                                    //res.status(200).send( {"status" : "APPROVED"} );
        
                                    res.status(200).json(data); // only for testing purposes for the Dialog window in frontend
                                    console.log(`Server: Added new order ${ORDER_ID} and charged cc: ${data.cc}. ${rows_affected} record(s) updated`);
                                }
                            });
                        });
                    });
                });
            });
        } catch (err) {
            console.error("Transaction error, reverting any database changes: ", err);
            localDB.run("ROLLBACK");
            res.status(402).send({"status":"DECLINED"}); // only for testing purposes for the Dialog window in frontend
            throw err;
        }
    });
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
            strftime('%s', orders.timestamp) AS orderDate
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
            order.orderDate = parseInt(order.orderDate); // BigInt to Int cuz this JSON cant parse BigInt
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

    const result = await set_queries([`
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

    if (!result) {
        res.status(500).send({ error: 'Database query for order fulfillment failed' });
        return;
    }

    console.log(`Server: Updated order ${completedOrder} to "Filled" and its item's quantities.`);
});


// Updating a row from the quantity table to reflect the item's new available quantity 
app.post("/api/rcv/available", async (req, res) => {
    const data = req.body; // {id: 3, newQty: 47}

    const rows_affected = await set_queries([`
        UPDATE quantities
        SET    quantity    = ${data.newQty}
        WHERE  part_number = ${data.id};
    `]);

    if (!rows_affected) {
        res.status(500).send({ error: 'Database query for quantities failed' });
        return;
    }

    console.log("Server: Updating a row from the quantity table to reflect the new quantity on hand");
});


// Sending all of the rows from the shipping backets table
app.get("/api/admin/brackets", async (req, res) => {
    const shipping_brackets = await get_query("SELECT * FROM shipping ORDER BY weight"); // [{"weight": 0.00, "price": 0.00}, ...]
    if (shipping_brackets) {
        let prev = shipping_brackets[0];
        let old_brackets = [];
        for (let i = 1; i < shipping_brackets.length; i++) {
            const bracket = shipping_brackets[i];
            old_brackets[i-1] = {id: i, low: prev.weight, high: bracket.weight, price: prev.weight};
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

app.listen(SECRETS.LOCAL_PORT, () => console.log(`Server is running on port ${SECRETS.LOCAL_PORT}`));