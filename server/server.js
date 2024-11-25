const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mariadb.createPool({
    host: 'blitz.cs.niu.edu',
    port: 3306,
    user: 'student',
    password: 'student',
    database: 'csci467',
});
//     connectionLimit: 5,

// GET request
app.get("/api/data/shop", async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log(connection);
        const rows = await connection.query("SELECT * FROM parts");
        //console.log(rows);
        res.json(rows);
    } catch (error) {
        res.status(500).send({ error: 'Database query failed' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

app.post('/api/pay', async (req, res) => {
    let paymentInfo = req.body;
    console.log(paymentInfo);

    const postData = {
        vendor: "VE001-99",
        trans: "907-998654333-296",
        cc: paymentInfo.creditCard,
        name: paymentInfo.name,
        exp: paymentInfo.expiration,
        amount: "675.33"
    };

    fetch("https://blitz.cs.niu.edu/CreditCard", {
        method: "POST",
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(postData)
    })
    .then(response => response.json())
    .then(data => {
        // console.log("Success: ", data); // this will always be returned even if the payment failed (it will also contain the "errors" key)
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
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});