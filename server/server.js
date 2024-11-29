const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const legacyPool = mariadb.createPool({
    host: 'blitz.cs.niu.edu',
    port: 3306,
    user: 'student',
    password: 'student',
    database: 'csci467',
});

// Sending the parts (excluding the available quantity) from the legacy DB
app.get("/api/shop/items", async (req, res) => {
    let connection;
    try {
        connection = await legacyPool.getConnection();
        const rows = await connection.query("SELECT * FROM parts");
        res.json(rows);
    } catch (error) {
        res.status(500).send({ error: 'Database query failed' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Sending a dictionary of the available quantities for each part
app.get("/api/shop/quantities", async (req, res) => {
    console.log("Sending available quantities for each item");

    let output = {};

    // Mock - randomly generating a list of available quantities for all of the objects
    for (let i = 1; i <= 149; i++) {
        output[i] = Math.floor(Math.random() * 51); // Generates a random integer between 0 and 50
    }

    console.log(output);
    res.json(output);
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
    console.log("Sending the list of orders");
});

// Updating the order to be marked as filled and, based on the filled order's items,
// deducting each ordered item's available quantity by 1
app.post("/api/ff/complete", async (req, res) => {
    console.log("Updating the order row and item available row");
});

// Updating a row from the quantity table to reflect the item's new available quantity 
app.post("/api/rcv/available", async (req, res) => {
    console.log("Updating a row from the quantity table to reflect the new quantity on hand");
});

// Sending all of the rows from the backet table
app.get("/api/admin/brackets", async (req, res) => {
    console.log("Sending the bracket table's rows");
    const output = [
        { "id": 1, "low": 0, "high": 5, "price": 0.0 },
        { "id": 2, "low": 5, "high": 10, "price": 5.0 },
        { "id": 3, "low": 10, "high": 15, "price": 10.0 },
        { "id": 4, "low": 15, "high": 20, "price": 15.0}
    ];

    res.json(output);
});

// Adding and updating rows in brackets table for new ranges
app.post("/api/admin/add_bracket", async (req, res) => {
    console.log("Adding and updating rows in brackets table for new ranges");
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});