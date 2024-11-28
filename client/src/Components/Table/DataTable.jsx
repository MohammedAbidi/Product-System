import React, { useEffect, useState } from 'react';
import './DataTable.css'

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

    // Retrieving the quantities
    useEffect(() => {
        // Initialize an empty object
        const tempAvailable = {};
    
        // Replace this block of code with the fetch lines of code
        // Populate the object with keys from 1 to 149 and random values between 0 and 50
        for (let i = 1; i <= 149; i++) {
            tempAvailable[i] = Math.floor(Math.random() * 51); // Generates a random integer between 0 and 50
        }
    
        // Update the available state once
        setAvailable(tempAvailable);
    }, []); // The empty dependency array ensures this runs only once
    
    // Retrieving the Shipping details
    useEffect(() => {
        // Shipping table is called "Brackets"
        const tempShippingRanges = [
            { "id": 1, "low": 0, "high": 5, "price": 0.0 },
            { "id": 2, "low": 5, "high": 10, "price": 5.0 },
            { "id": 3, "low": 10, "high": 15, "price": 10.0 },
            { "id": 4, "low": 15, "high": 20, "price": 15.0}
        ];

        setShippingRanges(tempShippingRanges);
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
        const numItemsMsg = document.getElementById("num-items-msg");
        const itemList = document.getElementById("item-list"); // Table body

        itemList.innerHTML = ""; // clearing all rows from the list of items shown in cart

        setAmount(0.0);
        setWeight(0.0);
        setShippingCost(0.0);
        setTotal(0.0);

        let detailsSection = document.getElementById("details");

        if (cartItems.length === 0) {
            numItemsMsg.textContent = "You have " + cartItems.length + " items in your cart.";
            detailsSection.style.display = "none";
        } else if (cartItems.length === 1) {
            // there is one item in the cart
            numItemsMsg.textContent = "You have " + cartItems.length + " item in your cart.";

            detailsSection.style.display = "block";

            let itemId = cartItems[0]; // since there is only one item in the cart
            let product = data.find(item => {
                return item.number === itemId;
            })

            let img = document.createElement("img");
            img.src = product.pictureURL;
            img.style = "display: inline-block";

            const text = document.createElement("div");
            text.style = "display: inline-block"
            let descText = document.createTextNode(product.description);
            let weightText = document.createTextNode("Weight: " + product.weight + "lbs");
            let priceText = document.createTextNode("Price: $" + product.price);
            let quantityText = document.createTextNode("Qty: " + itemQuantities[0]);
            text.appendChild(descText);
            text.appendChild(document.createElement("br"));
            text.appendChild(weightText);
            text.appendChild(document.createElement("br"));
            text.appendChild(priceText);
            text.appendChild(document.createElement("br"));
            text.appendChild(quantityText);

            let removeBtn = document.createElement("button")
            removeBtn.textContent = "Remove";
            removeBtn.onclick = function () {
                removeFromCart(product);
            };

            let buttonContainer = document.createElement("div");
            buttonContainer.className = "center-vertically";
            buttonContainer.appendChild(removeBtn);

            let newRow = itemList.insertRow();

            let newCellLeft = newRow.insertCell();
            newCellLeft.appendChild(img);
            newCellLeft.appendChild(text);

            let newCellRight = newRow.insertCell();
            newCellRight.appendChild(buttonContainer);

            // Updating the Cart information
            let tempAmount = product.price * itemQuantities[0];
            let tempWeight = product.weight * itemQuantities[0]; // use this for calculating the shipping cost
            let tempShippingCost = calculateShipping(tempWeight); // will need to fix this once Shipping db table is ready
            let tempTotal = tempAmount + tempShippingCost;

            setAmount(tempAmount);
            setWeight(tempWeight);
            setShippingCost(tempShippingCost);
            setTotal(tempTotal);
        } else if (cartItems.length > 1) {
            numItemsMsg.textContent = "You have " + cartItems.length + " items in your cart.";

            detailsSection.style.display = "block";

            // Updating the Cart information
            let tempAmount = 0.0;
            let tempWeight = 0.0; // use this for calculating the shipping cost
            let tempShippingCost = 0.0; // will need to fix this once Shipping db table is ready
            let tempTotal = 0.0;
            for (let i = 0; i < cartItems.length; i++) {
                let itemId = cartItems[i];
                let product = data.find(item => {
                    return item.number === itemId;
                })

                let img = document.createElement("img");
                img.src = product.pictureURL;
                img.style = "display: inline-block";

                const text = document.createElement("div");
                text.style = "display: inline-block"
                let descText = document.createTextNode(product.description);
                let weightText = document.createTextNode("Weight: " + product.weight + "lbs");
                let priceText = document.createTextNode("Price: $" + product.price);
                let quantityText = document.createTextNode("Qty: " + itemQuantities[i]);
                text.appendChild(descText);
                text.appendChild(document.createElement("br"));
                text.appendChild(weightText);
                text.appendChild(document.createElement("br"));
                text.appendChild(priceText);
                text.appendChild(document.createElement("br"));
                text.appendChild(quantityText);

                let removeBtn = document.createElement("button")
                removeBtn.textContent = "Remove";
                removeBtn.onclick = function () {
                    removeFromCart(product);
                };

                let buttonContainer = document.createElement("div");
                buttonContainer.className = "center-vertically";
                buttonContainer.appendChild(removeBtn);

                let newRow = itemList.insertRow();

                let newCellLeft = newRow.insertCell();
                newCellLeft.appendChild(img);
                newCellLeft.appendChild(text);

                let newCellRight = newRow.insertCell();
                newCellRight.appendChild(buttonContainer);

                // Updating the Cart information
                tempAmount += product.price * itemQuantities[i];
                tempWeight += product.weight * itemQuantities[i]; // use this for calculating the shipping cost
            }
            tempShippingCost = calculateShipping(tempWeight); // will need to fix this once Shipping db table is ready
            tempTotal = tempAmount + tempShippingCost;

            setAmount(tempAmount);
            setWeight(tempWeight);
            setShippingCost(tempShippingCost);
            setTotal(tempTotal);
        }
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
            const response = await fetch('http://localhost:5000/api/shop/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
    
            if (response.ok) {
                const result = await response.json();
                console.log('Payment success:', result);
            } else {
                console.error('Payment failed:', response.statusText);
            }
        } catch (error) {
            console.error('Error submitting payment:', error);
        }
    };    

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/shop/items');
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
                            <th>PictureURL</th>
                            <th>Number</th>
                            <th>Description</th>
                            <th>Price</th>
                            <th>Weight</th>
                            <th>Available</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.number}>
                                <td>
                                    <img src={item.pictureURL} alt={item.description} />
                                </td>
                                <td>{item.number}</td>
                                <td>{item.description}</td>
                                <td>{"$" + (item.price).toFixed(2)}</td>
                                <td>{item.weight}</td>
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
                <div id='details'>
                    <table id='cart-products'>
                        <tbody id='item-list'>
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
                                    <p id='weight'>{(weight) + "lbs"}</p>
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
        </div>    
    );
};

//                                        <input id='quantity' type='number' min='0' placeholder='0' style={{display: "inline-flex", width: "5em"}}/>

export default DataTable