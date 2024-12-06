import React, { useEffect, useState } from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import ReactDOM from "react-dom";

import "./Administration.css"
import close_icon from "../Components/Assets/close_24dp.png"

//const WEBSITE = "https://cumbersome-mountainous-jackfruit.glitch.me/";
const WEBSITE = "http://localhost:5000";

function Administration() {
    const [data, setData] = useState([]);
    const [amount, setAmount] = useState([]);
    const [amountVal, setAmountVal] = useState(0.0);
    const [shippingVal, setShippingVal] = useState(0.0);
    const [totalVal, setTotalVal] = useState(0.0);
    const [dateVal, setDateVal] = useState("");
    const [nameVal, setNameVal] = useState("");
    const [addressVal, setAddressVal] = useState("");
    const [emailVal, setEmailVal] = useState("");
    const [reviewedOrderId, setReviewedOrderId] = useState(0);
    const [total, setTotal] = useState([]);

    const [orders, setOrders] = useState([]);

    const [openReview, setOpenReview] = useState(false);
    const [dialogTitle, setDialogTitle] = useState("");
    const [dialogContent, setDialogContent] = useState("");

    const [itemsPurchased, setItemsPurchased] = useState([]);

    const [activeTab, setActiveTab] = useState('Orders');
    const [brackets, setBrackets] = useState([]);

    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterMinTotal, setFilterMinTotal] = useState('');
    const [filterMaxTotal, setFilterMaxTotal] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [filteredOrders, setFilteredOrders] = useState([]);

    const statusMap = new Map();
    statusMap.set("authorized", "Open");
    statusMap.set("shipped", "Filled");

    useEffect(() => {
        const applyFilters = () => {
            let filtered = orders;

            // Filter by start and end date
            if (filterStartDate) {
                filtered = filtered.filter((order) => new Date(order.orderDate * 1000) >= new Date(filterStartDate));
            }
            if (filterEndDate) {
                filtered = filtered.filter((order) => new Date(order.orderDate * 1000) <= new Date(filterEndDate));
            }

            // Filter by total range
            if (filterMinTotal) {
                filtered = filtered.filter((order) => parseFloat(total[order.id]) >= parseFloat(filterMinTotal));
            }
            if (filterMaxTotal) {
                filtered = filtered.filter((order) => parseFloat(total[order.id]) <= parseFloat(filterMaxTotal));
            }

            // Filter by status
            if (filterStatus !== 'all') {
                //console.log("filterStatus: " + filterStatus);
                let mappedVal = statusMap.get(filterStatus);
                //console.log("mappedVal: " + mappedVal);
                filtered = filtered.filter((order) => order.status.toLowerCase() === mappedVal.toLowerCase());
            }

            setFilteredOrders(filtered);
        };

        applyFilters();
    }, [filterStartDate, filterEndDate, filterMinTotal, filterMaxTotal, filterStatus, orders, total]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(WEBSITE + '/api/shop/items');
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error('Error fetching data: ', error);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const fetchOrders = async () => {
            // For "items", it is a dictionary where the key is the product number and the value is the available quantity
            try {
                const response = await fetch(WEBSITE + '/api/orders');
                const result = await response.json();
                setOrders(result);
            } catch (error) {
                console.error('Error fetching data: ', error);
            }
        };

        fetchOrders();
    }, []);
    
    useEffect(() => {
        // Wait until the data and openOrders arrays are loaded
        if (data.length === 0 || orders.length === 0) {
            return;
        }

        // Calculating the Total price (price of items purchased + shipping cost) and the Weight of each order
        var tempAmount = {};
        var tempTotal = {};
        var orderAmount = 0.0;
        var orderTotal = 0.0;
        for (let order = 0; order < orders.length; order++) { // iterate through each order
            let itemsDict = orders[order].items;
            for (const pId in itemsDict) {
                let product = data.find((prod) => prod.number === Number(pId));
                orderAmount += (product.price * itemsDict[pId]);
            }
            orderTotal = orderAmount + orders[order].shipping;

            tempAmount[orders[order].id] = orderAmount.toFixed(2);
            tempTotal[orders[order].id] = orderTotal.toFixed(2);
            
            orderAmount = 0.0;
            orderTotal = 0.0;
        }

        setAmount(tempAmount);
        setTotal(tempTotal);
    }, [data, orders]);

    // Retrieving the Shipping details
    useEffect(() => {
        // Shipping table is called "Brackets"
        const fetchBrackets = async () => {
            try {
                const response = await fetch(WEBSITE + '/api/admin/brackets');
                const result = await response.json();

                let sortedBrackets = result.sort(function(a, b) {
                    return parseFloat(a.low) - parseFloat(b.low);
                });
                setBrackets(sortedBrackets);
            } catch (error) {
                console.error('Error fetching data: ', error);
            }
        };

        fetchBrackets();
    }, []);

    const tabStyles = {
        container: {
            display: 'flex',
            borderBottom: '1px solid #ccc',
            marginBottom: '20px',
        },
        tab: (isActive) => ({
            flex: 1,
            textAlign: 'center',
            padding: '10px 20px',
            cursor: 'pointer',
            backgroundColor: isActive ? '#fff' : '#f2f2f2',
            color: isActive ? '#000' : '#666',
            position: 'relative',
            fontWeight: isActive ? 'bold' : 'normal',
        }),
        activeLine: {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: '#ff4141',
        },
    };

    function unixToDate(longNum) {
        var dObj = new Date(longNum * 1000);
        var year = dObj.getFullYear();
        var month = dObj.getMonth();
        var date = dObj.getDate();

        return year + "-" + month + "-" + date;
    }

    
    function reviewOrder(order) {        
        setDialogTitle("Order: " + order.id + ", Status: " + (order.status === "Open" ? "Authorized" : "Shipped"));
    
        // Prepare list items based on the order
        
        const itemsPurchased = Object.entries(order.items).map(([pId, quantity]) => {
            const product = data.find((prod) => prod.number === Number(pId));
            if (product) {
                return `${quantity} - ${product.description}: \$${product.price} - ${product.weight * quantity + "lbs"}`; // Customize as needed
            }
            return null; // Handle case where product isn't found
        }).filter(item => item !== null); // Remove null entries

        setItemsPurchased(itemsPurchased);
        let tempAmountValArr = Object.entries(amount).find(([key, value]) => Number(key) === order.id);
        setAmountVal(tempAmountValArr[1]);
        setShippingVal(order.shipping);
        let tempTotalValArr = Object.entries(total).find(([key, value]) => Number(key) === order.id);
        setTotalVal(parseFloat(tempTotalValArr[1]));
        setDateVal(unixToDate(order.orderDate));

        console.log(order.name);
        setNameVal(order.name);
        setAddressVal(order.address);
        setEmailVal(order.email);
        setReviewedOrderId(order.id);
        setOpenReview(true);
    }
    
    const handleCloseReview = () => {
        setOpenReview(false);
    }

    async function sendNewBracketRequest(bracketData) {
        try {
            const response = await fetch(WEBSITE + '/api/admin/add_bracket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bracketData),
            });

            if (!response.ok) throw new Error('Error adding bracket');
        } catch (error) {
            console.error('Error adding bracket(s):', error);
        }
    }

    async function sendRemoveBracketRequest(bracketData) {
        try {
            const response = await fetch(WEBSITE + '/api/admin/remove_bracket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bracketData),
            });

            if (!response.ok) throw new Error('Error removing bracket');
        } catch (error) {
            console.error('Error removing bracket(s):', error);
        }
    }

    function addNewBracket() {
        var weightInput = document.getElementById("weightInput").value;
        var costInput = document.getElementById("costInput").value;

        if ((weightInput === "") || (costInput === "")) {
            alert("All fields must be entered to add a weight bracket.");
            return;
        }

        weightInput = parseFloat(weightInput);
        costInput = parseFloat(costInput);

        if (weightInput === 0) {
            alert("Non-zero weight is required");
            return;
        }

        /*
        let reqData = {
            removeRow: -1,
            addRows: []
        };*/
        let reqData = {
            weight: weightInput,
            price: costInput
        };

        /*
        if (brackets.length === 0) {
            console.log("There are no brackets - creating the first bracket");
            
            reqData.addRows.push({
                id: 1,
                low: 0,
                high: weightInput,
                price: costInput
            });

            sendNewBracketRequest(reqData);
        } else if (brackets.length > 0) {
            console.log("There are existing brackets");

            // OLD - was for the brackets table when there used to be the ID column
            let removeRowId = -1;
            console.log("weightInput: " + weightInput);
            let handledNewData = false;
            for (let b = 0; b < brackets.length; b++) {
                console.log(brackets[b]);
                console.log("low: " + brackets[b].low);
                console.log("high: " + brackets[b].high);

                console.log("weightInput > brackets[b].low: " + (weightInput > brackets[b].low));
                console.log("weightInput < brackets[b].high: " + (weightInput < brackets[b].high));
                if ((weightInput > brackets[b].low) && (weightInput < brackets[b].high)) {
                    // the new weight is in between a given row's low and high weight range
                    console.log("The new bracket row is in between the minimum of " + brackets[b].low + " and the maximum of " + brackets[b].high);
                    removeRowId = brackets[b].id;
                    console.log("Need to remove bracket with an id of " + removeRowId);

                    console.log("This is the length of brackets: " + brackets.length);
                    console.log("This is the id of the last item in the brackets array: " + brackets[brackets.length - 1].id);
                    
                    reqData.removeRow = removeRowId;

                    let newId = brackets[brackets.length - 1].id + 1;
                    let pre = {
                        id: newId,
                        low: brackets[b].low,
                        high: weightInput,
                        price: costInput
                    }
                    console.log("Printing out the first new bracket");
                    console.log(pre);
                    reqData.addRows.push(pre);

                    let post = {
                        id: newId + 1,
                        low: weightInput,
                        high: brackets[b].high,
                        price: brackets[b].price
                    }
                    console.log("Printing out the second new bracket");
                    console.log(post);
                    reqData.addRows.push(post);

                    console.log(reqData);
                    handledNewData = true;
                    sendNewBracketRequest(reqData);
                    break;
                }
            }

            if (!handledNewData) {
                // the new weight we wanted to add is greater than the last row of data's maximum weight
                let lastBracket = brackets[brackets.length - 1];
                reqData.addRows.push({
                    id: Number(lastBracket.id) + 1,
                    low: lastBracket.high,
                    high: weightInput,
                    price: costInput
                });

                sendNewBracketRequest(reqData);
            }
            
        } */
        
        sendNewBracketRequest(reqData);
    }

    function removeBracket(shippingPrice) {
        let reqData = {
            id: shippingPrice
        }
        sendRemoveBracketRequest(reqData);
    }

    const handleStartDateChange = (e) => setFilterStartDate(e.target.value);
    const handleEndDateChange = (e) => setFilterEndDate(e.target.value);
    const handleMinTotalChange = (e) => setFilterMinTotal(e.target.value);
    const handleMaxTotalChange = (e) => setFilterMaxTotal(e.target.value);
    const handleStatusChange = (e) => setFilterStatus(e.target.value);

    const renderTabContent = () => {
        if (activeTab === 'Orders') {
            return (
                <div className='tab-content'>
                    <h2>All Orders</h2>
                    <br/>
                    <div>
                        <div>
                            <label htmlFor='startDate'>Select a start date:</label>
                            <input id="startDate" type="date" onChange={handleStartDateChange} style={{marginRight: "1em"}} />
                            <label htmlFor='endDate'>Select an end date:</label>
                            <input id="endDate" type="date" onChange={handleEndDateChange} />
                        </div>
                        <div>
                            <label htmlFor='lowTotal'>Minimum Total:</label>
                            <input id="lowTotal" type="number" onChange={handleMinTotalChange} style={{marginRight: "1em"}} />
                            <label htmlFor='highTotal'>Maximum Total:</label>
                            <input id="highTotal" type="number" onChange={handleMaxTotalChange} />
                        </div>
                        <div>
                            <label htmlFor="status" style={{marginRight: "0.25em"}}>Status:</label>
                                <select id="status" name="status" onChange={handleStatusChange} >
                                <option value="all">-----</option>
                                <option value="authorized">Authorized</option>
                                <option value="shipped">Shipped</option>
                            </select>
                        </div>
                    </div>
                    <br/>
                    <table className='info-table'>
                        <thead>
                            <th>Order ID</th>
                            <th>Status</th>
                            <th>Order Date</th>
                            <th>Total</th>
                            <th></th>
                        </thead>
                        <tbody>
                            {filteredOrders.map((o) => (
                                <tr key={o.id}>
                                    <td>{o.id}</td>
                                    <td>{o.status}</td>
                                    <td>{unixToDate(o.orderDate)}</td>
                                    <td>{total[o.id]}</td>
                                    <td><button onClick={() => reviewOrder(o)}>Review</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        } else if (activeTab === 'Weight Brackets') {
            return (
                <div className='tab-content'>
                    <h2>Shipping Weight Brackets</h2>
                    <table className='info-table'>
                        <thead>
                            <th>Minimum</th>
                            <th>Maximum</th>
                            <th>Price</th>
                            <th></th>
                        </thead>
                        <tbody>
                            {brackets.map((b) => (
                                <tr key={b.id}>
                                    <td>{b.low + "lbs"}</td>
                                    <td>{b.high + "lbs"}</td>
                                    <td>{"$" + (b.price).toFixed(2)}</td>
                                    <td><button onClick={() => removeBracket(b.low)}>Remove</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <br/>
                    <div className='label-input-btn'>
                        <label for="weightInput">Weight: </label>
                        <input id='weightInput' className='data-entry' type='number' min="0" placeholder="0"></input>
                    </div>
                    <div className='label-input-btn'>
                        <label for="costInput">Cost: </label>
                        <input id='costInput' className='data-entry' type='number' min="0" placeholder="0"></input>
                    </div>
                    <div className='label-input-btn'>
                        <button onClick={addNewBracket}>Add New Bracket</button>
                    </div>
                </div>
            );
        }
    };

    return (
        <div>
            <div style={tabStyles.container}>
                <div style={tabStyles.tab(activeTab === 'Orders')} onClick={() => setActiveTab('Orders')} >
                    Orders
                    {activeTab === 'Orders' && <div style={tabStyles.activeLine}></div>}
                </div>

                <div style={tabStyles.tab(activeTab === 'Weight Brackets')} onClick={() => setActiveTab('Weight Brackets')} >
                    Weight Brackets
                    {activeTab === 'Weight Brackets' && <div style={tabStyles.activeLine}></div>}
                </div>
            </div>

            <div>{renderTabContent()}</div>
            
            <Dialog open={openReview} onClose={handleCloseReview}>
                <DialogActions>
                    <Button onClick={handleCloseReview} color="primary" variant="outlined">
                        <img id='close-btn' src={close_icon}></img>
                    </Button>
                </DialogActions>
                <DialogTitle><h3>{dialogTitle}</h3></DialogTitle>
                <DialogContent>
                    <h3>Order Information:</h3>
                    <p>{"Order Date: " + dateVal}</p>
                    <p>{"Shipping Info: " + nameVal + ", " + addressVal}</p>
                    <p>{"Email: " + emailVal}</p>
                    <br/>
                    <h3>Order Items:</h3>
                    {itemsPurchased.map((item, index) => (
                        <p key={index}>{item}</p>
                    ))}
                    <p>Amount: ${amountVal}</p>
                    <p>Shipping: ${shippingVal.toFixed(2)}</p>
                    <p>Total: ${totalVal.toFixed(2)}</p>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default Administration