import React, { useEffect, useState } from 'react';
import ReactDOM from "react-dom";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import './DataTable.css'

// const WEBSITE = "https://cumbersome-mountainous-jackfruit.glitch.me/";
const WEBSITE = "https://productsystemdb.vercel.app/";
// const WEBSITE = "http://localhost:5000";

function DataTable() {
    const [data, setData] = useState([]);
    const [available, setAvailable] = useState({});
    const [loading, setLoading] = useState(true);

    var [cartItems, setCartItems] = useState([]);
    var [itemQuantities, setItemQuantities] = useState([]);
    var [amount, setAmount] = useState(0.0);
    var [weight, setWeight] = useState(0.0);
    var [shippingRanges, setShippingRanges] = useState([]);
    var [shippingCost, setShippingCost] = useState(0.0);
    var [total, setTotal] = useState(0.0);

    var [confirmedOrder, setConfirmedOrder] = useState({});
    const [openConfirmation, setOpenConfirmation] = useState(false);
    const [openDeclined, setOpenDeclined] = useState(false);
    const [dialogTitle, setDialogTitle] = useState("");
    const [dialogContent, setDialogContent] = useState("");

    useEffect(() => {
        if (confirmedOrder && Object.keys(confirmedOrder).length > 0) {
            let dialogTitle = "Confirmation: Order " + confirmedOrder["orderId"] + " created";
            let dialogContent = "Amount: $" + confirmedOrder["amount"].toFixed(2) + 
                                " Auth: " + confirmedOrder["authorization"] + "\n" + 
                                "For: " + confirmedOrder["name"] + ", " + confirmedOrder["email"];
            setDialogTitle(dialogTitle);
            setDialogContent(dialogContent);
            setOpenConfirmation(true);
        }
    }, [confirmedOrder]);  
    /* 
    const handleClose = () => {
        setCartItems([]);
        setItemQuantities([]);
        setAmount(0.0);
        setWeight(0.0);
        setShippingCost(0.0);
        setTotal(0.0);
        setConfirmedOrder({});
        setDialogTitle("");
        setDialogContent("");

        const nameField = document.getElementById('name-field');
        const emailField = document.getElementById('email-field');
        const addressField = document.getElementById('address-field');
        const creditCardField = document.getElementById('cc-field');
        const expirationField = document.getElementById('exp-field');

        nameField.value = "";
        emailField.value = "";
        addressField.value = "";
        creditCardField.value = "";
        expirationField.value = "";

        updateCart();
        setOpen(false);
    };*/
    const handleCloseConfirmation = () => {
        setCartItems([]);
        setItemQuantities([]);
        setAmount(0.0);
        setWeight(0.0);
        setShippingCost(0.0);
        setTotal(0.0);
        setConfirmedOrder({});
        setDialogTitle("");
        setDialogContent("");

        document.getElementById('name-field').value = "";
        document.getElementById('email-field').value = "";
        document.getElementById('address-field').value = "";
        document.getElementById('cc-field').value = "";
        document.getElementById('exp-field').value = "";
        setOpenConfirmation(false);
    };

    const handleCloseDeclined = () => {
        setOpenDeclined(false);
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(WEBSITE + '/api/shop/quantities');
                const result = await response.json();
                setAvailable(result);
            } catch (error) {
                console.error('Error fetching data: ', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);
    
    // Retrieving the Shipping details
    useEffect(() => {
        // Shipping table is called "Brackets"
        const fetchData = async () => {
            try {
                const response = await fetch(WEBSITE + '/api/admin/brackets');
                const result = await response.json();
                setShippingRanges(result);
            } catch (error) {
                console.error('Error fetching data: ', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        //setShippingRanges(tempShippingRanges);
    }, []);

    // Function to determine the shipping price
    function calculateShipping(weight) {
        for (const rate of shippingRanges) {
            if (weight >= rate.low && weight < rate.high) {
                return rate.price;
            }
        }
        return 0; // Default price if no range matches
    }

    function addToCart(item) {
        const input = document.getElementById("quantity" + item.number);
    
        var inputValue = Number(input.value.trim());

        // Only take care of adding additional items to cart if the quantity is greater than zero
        if (inputValue !== "" || inputValue > 0) {
            var tempCartItems = cartItems;
            var tempItemQuantities = itemQuantities;
            if (tempCartItems.length === 0) {
                /* 
                    There are zero items in the cart.

                    The first item and its quantity will share the same index location
                */
                tempCartItems.push(item.number); // only pushing the part number to the list
                tempItemQuantities.push(inputValue);

                setCartItems(tempCartItems);
                setItemQuantities(tempItemQuantities);
            } else if (tempCartItems.length > 0) {
                /*
                    There are already items in the cart
                */
                let itemExists = false;
                for (let index = 0; index < tempCartItems.length; index++) {
                    if (item.number === tempCartItems[index]) {
                        tempItemQuantities[index] = tempItemQuantities[index] + inputValue;
                        setItemQuantities(tempItemQuantities);
                        itemExists = true;
                        break;
                    }
                }

                if (!itemExists) {
                    tempCartItems.push(item.number); // only pushing the part number to the list
                    tempItemQuantities.push(inputValue);

                    setCartItems(tempCartItems);
                    setItemQuantities(tempItemQuantities);
                }
            }

            input.value = "";
            updateCart();
        }
    }

    function removeFromCart(product) {
        let indexToRemove = cartItems.indexOf(product.number);
        cartItems.splice(indexToRemove, 1); // only remove the respective item
        itemQuantities.splice(indexToRemove, 1); // only remove the respective quantity

        updateCart();
    }
    
    function updateCart() {
        const numItemsMsg = cartItems.length === 1 
            ? `You have 1 item in your cart.` 
            : `You have ${cartItems.length} items in your cart.`;
    
        const tempAmount = cartItems.reduce((acc, item, index) => {
            const product = data.find(prod => prod.number === item);
            return acc + product.price * itemQuantities[index];
        }, 0);
    
        const tempWeight = cartItems.reduce((acc, item, index) => {
            const product = data.find(prod => prod.number === item);
            return acc + product.weight * itemQuantities[index];
        }, 0);
    
        const tempShippingCost = calculateShipping(tempWeight);
        const tempTotal = tempAmount + tempShippingCost;
    
        setAmount(tempAmount);
        setWeight(tempWeight);
        setShippingCost(tempShippingCost);
        setTotal(tempTotal);
    }

    const handlePaymentSubmit = async (event) => {
        event.preventDefault(); // Prevent the default form submission
    
        const payload = {
            name: document.getElementById('name-field').value,
            email: document.getElementById('email-field').value,
            address: document.getElementById('address-field').value,
            creditCard: document.getElementById('cc-field').value,
            expiration: document.getElementById('exp-field').value,
            orderItems: cartItems,
            quantities: itemQuantities,
            amount: total,
            shipping: shippingCost
        };

        if (!payload.name || !payload.email || !payload.address || !payload.creditCard || !payload.expiration) {
            alert('All fields are required!');
            return;
        }
    
        try {
            const response = await fetch(WEBSITE + '/api/shop/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
    
            if (response.ok) {
                const result = await response.json();
                console.log('Payment success:', result);

                setConfirmedOrder(result);
                //handleClickOpen();
            } else {
                console.error('Payment failed:', response.statusText);
                setOpenDeclined(true);
            }
        } catch (error) {
            console.error('Error submitting payment:', error);
        }
    };    

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(WEBSITE + '/api/shop/items');
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error('Error fetching data: ', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <div className='container'>
            <div className='products-section'>
                <h1 className='products-title'>Products</h1>
                <table id='products'>
                    <thead>
                        <tr>
                            <th>Number</th>
                            <th>PictureURL</th>
                            <th>Description</th>
                            <th>Price</th>
                            <th>Weight</th>
                            <th>Available Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.number}>
                                <td>
                                    {item.number}
                                </td>
                                <td>
                                    <img src={item.pictureURL} alt={item.description} />
                                </td>
                                <td>{item.description}</td>
                                <td>{"$" + (item.price).toFixed(2)}</td>
                                <td>{item.weight + "lbs"}</td>
                                <td>{available[item.number]}</td>
                                <td>
                                    <div id='qty-col' style={{position: "relative"}}>
                                        <p style={{display: "inline-flex"}}>Quantity: </p>
                                        <input id={"quantity" + item.number} type="number" min="0" placeholder="0" style={{ display: "inline-flex", width: "5em" }} readOnly={available[item.number] === 0 ? true : false} />
                                    </div>  
                                </td>
                                <td><button type='button' onClick={() => addToCart(item)} disabled={available[item.number] === 0 ? true : false}>Add to Cart</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className='cart-interface'>
                <h1>Cart</h1>
                <p id='num-items-msg'>You have {cartItems.length} items in your cart.</p>
                <br/>
                <div id='details' style={{ 
                    display: (cartItems.length === 0) ? "none" : "block" }} >
                    <table id='cart-products'>
                        <tbody id='item-list'>
                            {data.filter(item => cartItems.includes(item.number)).map((item) => (
                                <tr key={item.number}>
                                    <td style={{ display: "inline-block", padding: "1em"}}>
                                        <img src={item.pictureURL} alt={item.description} />
                                    </td>
                                    <td style={{ display: "inline-block", padding: "1em"}}>
                                        <div>
                                            <p>{item.description}</p>
                                            <p>{("Weight: " + (item.weight).toFixed(2) + "lbs")}</p>
                                            <p>{("Price: $" + (item.price).toFixed(2))}</p>
                                            <p>{`Qty: ${itemQuantities[cartItems.indexOf(item.number)] || 0 }`}</p>
                                        </div>
                                    </td>
                                    <td style={{ display: "inline-block", padding: "1em"}}>
                                        <button onClick={() => removeFromCart(item)}>Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <br/>
                    <table className='cart-info'>
                        <tbody>
                            <tr>
                                <td>
                                    <b>Amount: </b>
                                </td>
                                <td>
                                    <p id='amount'>{"$" + (amount).toFixed(2)}</p>
                                </td>
                            </tr>

                            <tr>
                                <td>
                                    <b>Weight: </b>
                                </td>
                                <td>
                                    <p id='weight'>{(weight).toFixed(2) + "lbs"}</p>
                                </td>
                            </tr>

                            <tr>
                                <td>
                                    <b>Shipping: </b>
                                </td>
                                <td>
                                    <p id='shipping'>{"$" + (shippingCost).toFixed(2)}</p>
                                </td>
                            </tr>

                            <tr>
                                <td>
                                    <b>Total: </b>
                                </td>
                                <td>
                                    <p id='total'>{"$" + (total).toFixed(2)}</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <br/>
                    <h3>Billing Information</h3>
                    <form onSubmit={handlePaymentSubmit}>
                        <table className='cart-info'>
                            <tbody>
                                <tr>
                                    <td>
                                        <label>Name: </label>
                                    </td>
                                    <td>
                                        <input id='name-field' ></input>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label>Email: </label>
                                    </td>
                                    <td>
                                        <input id='email-field' type='email'></input>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label>Address: </label>
                                    </td>
                                    <td>
                                        <input id='address-field'></input>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label >Credit Card Number: </label>
                                    </td>
                                    <td>
                                        <input id='cc-field'></input>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label>Expiration Date: </label>
                                    </td>
                                    <td>
                                        <input id='exp-field'></input>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <input type="submit" value="Submit Payment"/>
                    </form>
                </div>
            </div>

            <Dialog open={openConfirmation} onClose={handleCloseConfirmation}>
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {dialogContent}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConfirmation} color="primary" variant="outlined">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDeclined} onClose={handleCloseDeclined}>
                <DialogTitle>Transaction Failed</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please enter valid billing information.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeclined} color="primary" variant="outlined">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </div>    
    );
};

export default DataTable
