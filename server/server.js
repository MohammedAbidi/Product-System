  /////////////
 // Imports //
/////////////
const SECRETS = require("./secrets");

const mariadb = require('mariadb');
const express = require('express');
const cors = require('cors');

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

// Setup local database (localPool)
let DB_INFO = {
    host: SECRETS.LOCAL_HOST,
    user: SECRETS.LOCAL_USER,
    password: SECRETS.LOCAL_PASSWORD
//  database: SECRETS.LOCAL_DATABASE  // this will be added into here LATER
};
async function createDatabase() {
    console.log("Connecting to the local database...");

    let connection;
    try {
        connection = await mariadb.createConnection(DB_INFO);
        console.log("Connected. Loading database...");

        // Create database if it does not exist
//      let result = await connection.query(`IF (db_id(N'${SECRETS.LOCAL_DATABASE}') IS NULL) BEGIN CREATE DATABASE ${SECRETS.LOCAL_DATABASE} END;`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${SECRETS.LOCAL_DATABASE}`);

    } catch (err) {
        console.error("Local Database connection failed.", err);

    } finally {
        if (!connection) throw err; // no connection, unknown error

        try {
            // Success, add db and create a new pool with it
            await connection.end(); // End this explicitly created connection I created
            console.log("Local database loaded.");

            DB_INFO["database"] = SECRETS.LOCAL_DATABASE;
            const newPool = mariadb.createPool(DB_INFO);

            // Create tables if they dont exist
            let newConnection;
            try {
                newConnection = await newPool.getConnection();

                // This DROP statement is only for testing, you can delete this line irl
                await newConnection.query("DROP TABLE IF EXISTS shipping, order_items, orders, customers, quantities"); // For testing (delete this later)

                // Hardcoded (for now)
                await newConnection.query(
                    `CREATE TABLE IF NOT EXISTS quantities (
                        part_number  INT PRIMARY KEY,
                        quantity     INT NOT NULL
                    )`
                );

                await newConnection.query(`
                    CREATE TABLE IF NOT EXISTS customers (
                        id       INT AUTO_INCREMENT PRIMARY KEY,
                        name     VARCHAR(50),
                        email    VARCHAR(50),
                        address  VARCHAR(50)
                    )`
                );

                await newConnection.query( // statuses: "Open", "Filled", "Authorized", "Shipped"
                    `CREATE TABLE IF NOT EXISTS orders (
                        id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                        customer_id  INT NOT NULL,
                        timestamp    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        shipping     FLOAT(8,2) NOT NULL DEFAULT 0,
                        status       VARCHAR(10) NOT NULL DEFAULT 'Open',

                    CONSTRAINT fk_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id)
                    )`
                );

                await newConnection.query(
                    `CREATE TABLE IF NOT EXISTS order_items (
                        order_id     INT NOT NULL,
                        part_number  INT NOT NULL,
                        quantity     INT NOT NULL,

                    PRIMARY KEY (order_id, part_number),
                    CONSTRAINT fk_order_id FOREIGN KEY (order_id) REFERENCES orders(id)
                    )`
                );

                await newConnection.query(
                    `CREATE TABLE IF NOT EXISTS shipping (
                        weight  FLOAT(4,2) NOT NULL PRIMARY KEY,
                        price   FLOAT(8,2) NOT NULL
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
                await newConnection.query(`INSERT INTO quantities (part_number, quantity) VALUES ${random_values};`);

                // Customers (hard coded) [name, email, address]
                await newConnection.query(`
                    INSERT INTO
                        customers (name, email, address)
                    VALUES
                        ("John Doe",     "jdoe@pizza.com",     "100 Apple St. Rock, WI 60000"),
                        ("Jane Doe",     "janedoe@pizza.com",  "102 Apple St. Rock, WI 60000"),
                        ("Bob Roberts",  "bbob@boba.com",      "1010 Jane Ave. Pearl, MI 66000");
                `);

                // Orders (hard coded) [customer_id, shipping, status]
                await newConnection.query(`
                    INSERT INTO
                        orders (customer_id, shipping, status)
                    VALUES
                        (1,  5.00, "Open"),
                        (2, 10.00, "Open"),
                        (3, 15.00, "Open");
                `);

                // Order Items (hard coded) [order_id, part_number, quantity]
                await newConnection.query(`
                    INSERT INTO
                        order_items (order_id, part_number, quantity)
                    VALUES 
                        (1, 1, 2),
                        (1, 2, 5),
                        (2, 1, 2),
                        (3, 2, 5);
                `);

                // Shipping (hard coded) [weight, price]
                await newConnection.query(`
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
                console.error("Error setting up tables", err);
                throw err;
            } finally {
                if (newConnection) newConnection.end();
            }

            // return newPool; // Return it setup (Doesnt work anyway)

        } catch (err) {
            console.error("Error closing the local connection.", err);
            throw err; // At this point just crash on purpose, idk what's going on with this
        }
    }
}
// Forget it, just make a new one
// const localPool = await createDatabase();
createDatabase();
DB_INFO["database"] = SECRETS.LOCAL_DATABASE;
// DB_INFO["multipleStatements"] = true; // I like this, but it doesnt feel practical
const localPool = mariadb.createPool(DB_INFO);



  ////////////
 // Server //
////////////
// Helper functions (used a lot)
async function get_query(sql) {
    let connection;
    try {
        connection = await localPool.getConnection();
        return await connection.query(sql);

    } catch (err) {
        console.log("Database Error:", err);
        return null;

    } finally {
        if (connection)
            connection.end();
    }
}

// Safe way of multiple database updates: Transaction pipeline
// https://mariadb.com/docs/server/connect/programming-languages/nodejs/promise/query-pipelining/
async function set_queries(sqls) {
    let connection;
    try {
        connection = await localPool.getConnection();
        await connection.beginTransaction();

        try {
            let rows_affected = 0; // Optional counter for debugging

            // Run statements
            for (const sql of sqls) {
                let response = await connection.query(sql); // Not optimized at all lol
                rows_affected += response.affectedRows;
            }

            // Commit Changes
            await connection.commit();
            return rows_affected;

        } catch (err) {
            console.error("Error updating database, reverting changes: ", err);
            await connection.rollback(); // Undo
            throw err;
        }

    } catch (err) {
        console.log("Database Transaction error: ", err);
        return null;

    } finally {
        if (connection)
            connection.end();
    }
}



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

    let connection;
    try {
        connection = await localPool.getConnection();
        await connection.beginTransaction();

        try {
            let rows_affected = 0; // Optional counter for debugging

            // Add customer
            let response = await connection.query(`
                INSERT INTO
                    customers (name, email, address)
                VALUES
                    ('${paymentInfo.name}', '${paymentInfo.email}', '${paymentInfo.address}');
            `);
            console.log(response);
            rows_affected += response.affectedRows;
            
            // Add Order (timestamp is automatic)
            const CUSTOMER_ID = response.insertId;
            response = await connection.query(`
                INSERT INTO
                    orders (customer_id, shipping, status)
                VALUES
                    (${CUSTOMER_ID}, ${paymentInfo.shipping}, 'Open')
            `);
            rows_affected += response.affectedRows;
            
            // Add Order Items
            const ORDER_ID = response.insertId;
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
            response = await connection.query(`INSERT INTO order_items (order_id, part_number, quantity) VALUES ${random_values};`);
            rows_affected += response.affectedRows;

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
                await connection.commit();

                // transaction is successful - the send() message will show up with the short JSON array below
                //res.status(200).send( {"status" : "APPROVED"} );

                res.status(200).json(data); // only for testing purposes for the Dialog window in frontend
                console.log(`Server: Added new order ${ORDER_ID} and charged cc: ${data.cc}. ${rows_affected} record(s) updated`);
            }

        } catch (err) {
            console.error("Transaction error, reverting any database changes: ", err);
            await connection.rollback(); // Undo
            throw err;
        }

    } catch (err) {
        console.log("Database Order error: ", err);
        res.status(402).send({"status":"DECLINED"}); // only for testing purposes for the Dialog window in frontend

    } finally {
        if (connection)
            connection.end();
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
            FLOOR(UNIX_TIMESTAMP(orders.timestamp)/1000) AS orderDate
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

    const rows_affected = await set_queries([`
        UPDATE orders
        SET    status = 'Filled'
        WHERE  id = ${completedOrder};
    `,`
        UPDATE
            quantities A,
            order_items B
        SET
            A.quantity = A.quantity - B.quantity
        WHERE
            A.part_number = B.part_number
            AND B.order_id = ${completedOrder};
    `]);

    if (!rows_affected) {
        res.status(500).send({ error: 'Database query for order fulfillment failed' });
        return;
    }

    console.log(`Server: Updated order ${completedOrder} to "Filled" and its item's quantities. ${rows_affected} record(s) updated`);
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
