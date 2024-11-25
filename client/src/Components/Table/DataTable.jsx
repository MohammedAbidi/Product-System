import React, { useEffect, useState } from 'react';
import './DataTable.css'

function DataTable() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    var [cartItems, setCartItems] = useState([]);
    var [itemQuantities, setItemQuantities] = useState([]);

    function addToCart(item) {
        /*
        const table = document.getElementById("products");
        const row = table.rows[item.number];
        const cell = row.cells[6];
        const input = cell.querySelector("#quantity"); // Correctly fetch the input element
        */
        const input = document.getElementById("quantity" + item.number);
    
        console.log(input); // This should now log the input element
        console.log(Number(input.value)); // If you want to access the value of the input
        console.log(typeof Number(input.value));
        var inputValue = Number(input.value.trim());

        // Only take care of adding additional items to cart if the quantity is greater than zero
        if (inputValue !== "" || inputValue > 0) {
            // var is function-scoped - accessible within the entire function it was declared in
            // let is block-scoped - within a set of curly braces it was declared in
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

                console.log("tempCartItems: " + tempCartItems);
                console.log("tempItemQuantities: " + tempItemQuantities);
            } else if (tempCartItems.length > 0) {
                /*
                    There are already items in the cart
                */
                let itemExists = false;
                for (let index = 0; index < tempCartItems.length; index++) {
                    console.log("The product number we are looking for is: " + item.number);
                    console.log("The current item we are looking at is: " + tempCartItems[index]);
                    if (item.number === tempCartItems[index]) {
                        console.log("It is a match");
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

                    console.log("tempCartItems: " + tempCartItems);
                    console.log("tempItemQuantities: " + tempItemQuantities);
                }
            }

            input.value = "";
            updateCart();
        }
    }

    function updateCart() {
        const numItemsMsg = document.getElementById("num-items-msg");
        const itemList = document.getElementById("item-list"); // Table body
        //console.log(itemList);

        if (cartItems.length === 0) {
            numItemsMsg.textContent = "You have " + cartItems.length + " items in your cart.";
        } else if (cartItems.length === 1) {
            // there is one item in the cart
            numItemsMsg.textContent = "You have " + cartItems.length + " item in your cart.";

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
            let weightText = document.createTextNode("Weight: " + product.weight);
            let priceText = document.createTextNode("Price: " + product.price);
            let quantityText = document.createTextNode("Qty: " + itemQuantities[0]);
            text.appendChild(descText);
            text.appendChild(document.createElement("br"));
            text.appendChild(weightText);
            text.appendChild(document.createElement("br"));
            text.appendChild(priceText);
            text.appendChild(document.createElement("br"));
            text.appendChild(quantityText);

            // Add code for a remove button
            // Add logic for processing the removal of that item

            let newRow = itemList.insertRow();
            let newCell = newRow.insertCell();

            newCell.appendChild(img);
            newCell.appendChild(text);
        } else if (cartItems.length > 1) {
            numItemsMsg.textContent = "You have " + cartItems.length + " items in your cart.";

            itemList.innerHTML = ""; // clearing all rows from the list of items shown in cart

            for (let i = 0; i < cartItems.length; i++) {
                let newRow = itemList.insertRow();
                let newCell = newRow.insertCell();
                let itemId = cartItems[i]; // since there is only one item in the cart
                let product = data.find(item => {
                    return item.number === itemId;
                })
                //let qty = itemQuantities[0]; // since there is only one item in the cart
                let descText = document.createTextNode(product.description);
                let weightText = document.createTextNode("Weight: " + product.weight);
                let priceText = document.createTextNode("Price: " + product.price);
                let quantityText = document.createTextNode("Qty: " + itemQuantities[i]);
                newCell.appendChild(descText);
                newCell.appendChild(document.createElement("br"));
                newCell.appendChild(weightText);
                newCell.appendChild(document.createElement("br"));
                newCell.appendChild(priceText);
                newCell.appendChild(document.createElement("br"));
                newCell.appendChild(quantityText);
            }
        }
        //console.log(numItemsMsg.textContent);
    }

    const handlePaymentSubmit = async (event) => {
        event.preventDefault(); // Prevent the default form submission
    
        const payload = {
            name: document.getElementById('name-field').value,
            email: document.getElementById('email-field').value,
            address: document.getElementById('address-field').value,
            creditCard: document.getElementById('cc-field').value,
            expiration: document.getElementById('exp-field').value,
            cartItems,
            itemQuantities
        };

        if (!payload.name || !payload.email || !payload.address || !payload.creditCard || !payload.expiration) {
            alert('All fields are required!');
            return;
        }
    
        try {
            const response = await fetch('http://localhost:5000/api/pay', {
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
                const response = await fetch('http://localhost:5000/api/data/shop');
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
        <div>
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
                                <td>0</td>
                                <td>
                                    <div id='qty-col' style={{position: "relative"}}>
                                        <p style={{display: "inline-flex"}}>Quantity: </p>
                                        <input id={"quantity"+item.number} type='number' min='0' placeholder='0' style={{display: "inline-flex", width: "5em"}} />
                                    </div>  
                                </td>
                                <td><button type='button' onClick={() => addToCart(item)}>Add to Cart</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className='cart-interface'>
                <h1>Cart</h1>
                <p id='num-items-msg'>You have {cartItems.length} items in your cart.</p>
                <br/>
                <table id='cart-products'>
                    <tbody id='item-list'>
                    </tbody>
                </table>
                <br/>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <b>Amount: </b>
                            </td>
                            <td>
                                <p id='amount'>$0.00</p>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <b>Weight: </b>
                            </td>
                            <td>
                                <p id='weight'>0.0lbs</p>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <b>Shipping: </b>
                            </td>
                            <td>
                                <p id='shipping'>$0.00</p>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <b>Total: </b>
                            </td>
                            <td>
                                <p id='total'>$0.00</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <br/>
                <h3>Billing Information</h3>
                <form onSubmit={handlePaymentSubmit}>
                    <table>
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
                                    <label>Address</label>
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
    );
};

//                                        <input id='quantity' type='number' min='0' placeholder='0' style={{display: "inline-flex", width: "5em"}}/>

export default DataTable