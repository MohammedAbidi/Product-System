import React, { useEffect, useState } from 'react';
import ReactDOM from "react-dom";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import "./Fulfillment.css"
import close_icon from "../Components/Assets/close_24dp.png"

//const WEBSITE = "https://cumbersome-mountainous-jackfruit.glitch.me/";
const WEBSITE = "https://productsystemdb.vercel.app";
//const WEBSITE = "http://localhost:5000";

function Fulfillment() {
    const [data, setData] = useState([]);
    const [amount, setAmount] = useState([]);
    const [amountVal, setAmountVal] = useState(0.0);
    const [shippingVal, setShippingVal] = useState(0.0);
    const [totalVal, setTotalVal] = useState(0.0);
    const [nameVal, setNameVal] = useState("");
    const [addressVal, setAddressVal] = useState("");
    const [emailVal, setEmailVal] = useState("");
    const [reviewedOrderId, setReviewedOrderId] = useState(0.0);
    const [total, setTotal] = useState([]);
    const [weight, setWeight] = useState([]);
    var [openOrders, setOpenOrders] = useState([]);

    const [openReviewOrder, setOpenReviewOrder] = useState(false);
    const [dialogTitle, setDialogTitle] = useState("");
    const [dialogContent, setDialogContent] = useState("");
    const [packingListItems, setPackingListItems] = useState([]);
    const [itemsPurchased, setItemsPurchased] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            const response = await fetch(WEBSITE + '/api/shop/items');
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching data: ', error);
        }
    };

    /*
        Order ID
        Total (no attribute needed - will be calculated by taking the sum of item amounts and shipping; same for Amount)
        Items (likely a JSON array - and their quantities)
        Shipping
        Name
        Address
        Email address
        Order Date (timestamp)
        Status (“Open” or “Filled”)
    */
    const fetchOrders = async () => {
        // For "items", it is a dictionary where the key is the product number and the value is the available quantity
        try {
            const response = await fetch(WEBSITE + '/api/orders');
            const result = await response.json();
            setOpenOrders(result.filter((order) => order.status === "Open"));
        } catch (error) {
            console.error('Error fetching data: ', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchOrders();
    }, []);

    useEffect(() => {
        // Wait until the data and openOrders arrays are loaded
        if (data.length === 0 || openOrders.length === 0) {
            return;
        }

        // Calculating the Total price (price of items purchased + shipping cost) and the Weight of each order
        var tempAmount = {};
        var tempTotal = {};
        var tempWeight = {};
        var orderAmount = 0.0;
        var orderTotal = 0.0;
        var orderWeight = 0.0;
        for (let order = 0; order < openOrders.length; order++) { // iterate through each order
            let itemsDict = openOrders[order].items;
            for (const pId in itemsDict) {
                let product = data.find((prod) => prod.number === Number(pId));
                orderAmount += (product.price * itemsDict[pId]);

                orderWeight += (product.weight * itemsDict[pId]);
            }
            orderTotal = orderAmount + openOrders[order].shipping;

            tempAmount[openOrders[order].id] = orderAmount.toFixed(2);
            tempTotal[openOrders[order].id] = orderTotal.toFixed(2);
            tempWeight[openOrders[order].id] = orderWeight.toFixed(2);
            
            orderAmount = 0.0;
            orderTotal = 0.0;
            orderWeight = 0.0;
        }
        setAmount(tempAmount);
        setTotal(tempTotal);
        setWeight(tempWeight);
    }, [data, openOrders]);

    function reviewOrder(order) {
        setDialogTitle("Order Filling: " + order.id);
    
        // Prepare list items based on the order
        const items = Object.entries(order.items).map(([pId, quantity]) => {
            const product = data.find((prod) => prod.number === Number(pId));
            if (product) {
                return `${product.description} (x${quantity})`; // Customize as needed
            }
            return null; // Handle case where product isn't found
        }).filter(item => item !== null); // Remove null entries
    
        // Prepare list items based on the order
        const itemsPurchased = Object.entries(order.items).map(([pId, quantity]) => {
            const product = data.find((prod) => prod.number === Number(pId));
            if (product) {
                return `${quantity} - ${product.description}: \$${product.price}`; // Customize as needed
            }
            return null; // Handle case where product isn't found
        }).filter(item => item !== null); // Remove null entries

        setPackingListItems(items);
        setItemsPurchased(itemsPurchased);
        let tempAmountValArr = Object.entries(amount).find(([key, value]) => Number(key) === order.id);
        setAmountVal(tempAmountValArr[1]);
        setShippingVal(order.shipping);
        let tempTotalValArr = Object.entries(total).find(([key, value]) => Number(key) === order.id);
        setTotalVal(parseFloat(tempTotalValArr[1]));
        setNameVal(order.name);
        setAddressVal(order.address);
        setEmailVal(order.email);
        setReviewedOrderId(order.id);
        setOpenReviewOrder(true);
    }
    
    const handleCloseReviewOrder = () => {
        setOpenReviewOrder(false);
    }

    const handleOrderFulfilled = async (orderId) => {
        if (isSubmitting) {
            return;
        }
        setIsSubmitting(true);

        try {
            setOpenReviewOrder(false);
            const payload = {
                id: orderId
            };

            const response = await fetch(WEBSITE + '/api/ff/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to fulfill order");
            }

            // Clear data and then refresh
            setOpenOrders([]);
            setData([]);
            await fetchData();
            await fetchOrders();
        } catch (error) {
            console.error('Error fulfilling order:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
    <div>
        <div className='main'>
            <h2>Open Orders</h2>
            <br/>
            <h3>{"Number of Open Orders: " + openOrders.length}</h3>
            <table id='open-orders'>
                {openOrders.map((order) => (
                    <tr key={order.id}>
                        <td>
                            <div className='detail'>
                                <p>{"Order ID: " + order.id}</p>
                                <p>{"Total: $" + total[order.id]}</p>
                                <p>{"Weight: " + weight[order.id] + "lbs"}</p>
                            </div>
                        </td>
                        <td>
                            <div className='detail'>
                                <button onClick={() => reviewOrder(order)}>Review Order</button>
                            </div>
                        </td>
                    </tr>
                ))}
            </table>
        </div>

        <Dialog open={openReviewOrder} onClose={handleCloseReviewOrder}>
                <DialogActions>
                    <Button onClick={handleCloseReviewOrder} color="primary" variant="outlined">
                        <img id='close-btn' src={close_icon}></img>
                    </Button>
                </DialogActions>
                <DialogTitle><h3>{dialogTitle}</h3></DialogTitle>
                <DialogContent>
                    <h3>Packing List:</h3>
                    <ul id='packing-list'>
                        {packingListItems.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                    <br/>
                    <h3>Invoice:</h3>
                    {itemsPurchased.map((item, index) => (
                        <p key={index}>{item}</p>
                    ))}
                    <p>Amount: ${amountVal}</p>
                    <p>Shipping: ${shippingVal.toFixed(2)}</p>
                    <p>Total: ${totalVal.toFixed(2)}</p>
                    <br/>
                    <h3>Shipping Label:</h3>
                    <p>{nameVal}</p>
                    <p>{addressVal}</p>
                    <p>Order confirmation sent to: {emailVal}</p>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center' }}>
                    <Button onClick={() => handleOrderFulfilled(reviewedOrderId)} color="primary" variant="outlined" disabled={isSubmitting}>
                        Order Fulfilled
                    </Button>
                </DialogActions>
        </Dialog>
    </div>
    )
}

export default Fulfillment
