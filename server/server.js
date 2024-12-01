  ///////////////
 // CONSTANTS //
///////////////
const PORT = 5000;
const DB_NAME = "ProductDB"
let DB_INFO = { // {database: DB_NAME} will be edited into here LATER
    host: "localhost",
    user: "root",
    password: "password"
};


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
async function createDatabase() {
    console.log("Connecting to the local database...");

    let connection;
    try {
        connection = await mariadb.createConnection(DB_INFO);
        console.log("Connected. Loading database...");

        // Create database if it does not exist
//      let result = await connection.query(`IF (db_id(N'${DB_NAME}') IS NULL) BEGIN CREATE DATABASE ${DB_NAME} END;`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);

    } catch (err) {
        console.error("Local Database connection failed.", err);

    } finally {
        if (!connection) throw err; // no connection, unknown error

        try {
            // Success, add db and create a new pool with it
            await connection.end(); // End this explicitly created connection I created
            console.log("Local database loaded.");

            DB_INFO["database"] = DB_NAME;
            const newPool = mariadb.createPool(DB_INFO);

            // Create tables if they dont exist
            let newConnection;
            try {
                newConnection = await newPool.getConnection();

                // Hardcoded (for now)
                await newConnection.query("DROP TABLE IF EXISTS shipping, order_items, orders, customers, quantities"); // For testing

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

                await newConnection.query( // statuses: "OPEN", "FILLED", "SHIPPED", ...
                    `CREATE TABLE IF NOT EXISTS orders (
                        id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                        customer_id  INT NOT NULL,
                        timestamp    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        shipping     FLOAT(8,2) NOT NULL,
                        status       VARCHAR(8) NOT NULL,

                    CONSTRAINT fk_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id)
                    )`
                );

                await newConnection.query(
                    `CREATE TABLE IF NOT EXISTS order_items (
                        id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                        order_id     INT NOT NULL,
                        part_number  INT NOT NULL,
                        quantity     INT NOT NULL,

                    CONSTRAINT fk_order_id FOREIGN KEY (order_id) REFERENCES orders(id)
                    )`
                );

                await newConnection.query(
                    `CREATE TABLE IF NOT EXISTS shipping (
                        id     INT NOT NULL PRIMARY KEY,
                        low    FLOAT(4,2) NOT NULL,
                        high   FLOAT(4,2) NOT NULL,
                        price  FLOAT(8,2) NOT NULL
                    )`
                );

                // Now, temporarily cache legacy data to...
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
                random_values = `
                    ( "John Doe",     "100 Apple St. Rock, WI 60000",    "jdoe@pizza.com" ),
                    ( "Jane Doe",     "102 Apple St. Rock, WI 60000",    "janedoe@pizza.com" ),
                    ( "Bob Roberts",  "1010 Jane Ave. Pearl, MI 66000",  "bbob@boba.com" );
                `;
                await newConnection.query(`INSERT INTO customers (name, email, address) VALUES ${random_values}`);

                // Orders (hard coded) [customer_id, shipping, status]
                random_values = `
                    ( 1, 10.00, "Open"),
                    ( 2, 10.00, "Open"),
                    ( 3, 10.00, "Open");
                `;
                await newConnection.query(`INSERT INTO orders (customer_id, shipping, status) VALUES ${random_values}`);

                // Order Items (hard coded) [order_id, part_number, quantity]
                random_values = `
                    ( 1, 1, 2),
                    ( 1, 2, 5),
                    ( 2, 1, 2),
                    ( 3, 2, 5);
                `;
                await newConnection.query(`INSERT INTO order_items (order_id, part_number, quantity) VALUES ${random_values}`);

                // Shipping (hard coded) [id, low, high, price]
                random_values = `
                    ( 1,  0,  5,  0.0 ),
                    ( 2,  5, 10,  5.0 ),
                    ( 3, 10, 15, 10.0 ),
                    ( 4, 15, 20, 15.0 );
                `;
                await newConnection.query(`INSERT INTO shipping (id, low, high, price) VALUES ${random_values}`);

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
DB_INFO["database"] = DB_NAME;
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
        console.log("SQL Get Error:", err);
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
        console.log("Sending legacy items");

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
        console.log("Sending available quantities for each item");
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
        creditCard: number,
        expiration: string,
        orderItems: [ 1, 2 ],
        quantities: [ 3, 3 ],
        amount: number,
        shipping: number
    */
    let paymentInfo = req.body;
    console.log(paymentInfo);

    const postData = {
        vendor: "VE001-99",
        trans: "907-998654333-296",
        cc: paymentInfo.creditCard,
        name: paymentInfo.name,
        exp: paymentInfo.expiration,
        amount: paymentInfo.amount
    };

    // Temporarily commenting out the below code until ready for output
    /*
    fetch("https://blitz.cs.niu.edu/CreditCard", {
        method: "POST",
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(postData)
    })
    .then(response => response.json())
    .then(data => {
        if ("errors" in data) {
            // if payment failed - the send() message won't show either way so maybe remove that
            //res.status(402).send( {"status" : "DECLINED"} )
            console.log("Transaction failed");
        } else {
            // transaction is successful - the send() message will show up with the short JSON array below
            //res.status(200).send( {"status" : "APPROVED"} );
        }
    })
    .catch(error => {
        console.error("Error: ", error);
    });
    */
    const output = {
        orderId: 12,
        amount: paymentInfo.amount,
        authorization: 14444,
        name: paymentInfo.name,
        email: paymentInfo.email
    };

    res.status(200).json(output); // only for testing purposes for the Dialog window in frontend
    //res.status(402).send({"status":"DECLINED"}); // only for testing purposes for the Dialog window in frontend
});


// Sending a JSON array of orders - need to find a way to handle combining Customers, Orders, and Order_Items data together
app.get("/api/orders", async (req, res) => {
    /* Array of Dictionaries...
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
        console.log("Sending the list of orders");
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

    console.log(`Updated order ${completedOrder} to "Filled" and its item's quantities. ${rows_affected} record(s) updated`);
});


// Updating a row from the quantity table to reflect the item's new available quantity 
app.post("/api/rcv/available", async (req, res) => {
    // TODO
    console.log("Updating a row from the quantity table to reflect the new quantity on hand");
});


// Sending all of the rows from the shipping backets table
app.get("/api/admin/brackets", async (req, res) => {
    const shipping_brackets = await get_query("SELECT * FROM shipping"); // [{"id": 1, "low": 0, "high": 5, "price": 0.0}, ...]
    if (shipping_brackets) {
        res.json(shipping_brackets);
        console.log("Sending the bracket table's rows");
    } else {
        res.status(500).send({ error: 'Database query for shipping brackets failed' });
    }
});


// Adding and updating rows in brackets table for new ranges
app.post("/api/admin/add_bracket", async (req, res) => {
    // TODO
    console.log("Adding and updating rows in brackets table for new ranges");
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
