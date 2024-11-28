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
        amount: 221.56,
        authorization: 14444,
        name: "John Doe",
        email: "jdoe@pizza.net"
    };

    res.status(200).json(output);
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
});

// Adding and updating rows in brackets table for new ranges
app.post("/api/admin/add_bracket", async (req, res) => {
    console.log("Adding and updating rows in brackets table for new ranges");
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});