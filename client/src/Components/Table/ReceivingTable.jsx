import React, { useEffect, useState } from 'react';
import ReactDOM from "react-dom";
import './ReceivingTable.css'

//const WEBSITE = "https://cumbersome-mountainous-jackfruit.glitch.me/";
const WEBSITE = "http://localhost:5000";

function DataTable() {
    const [data, setData] = useState([]);
    const [available, setAvailable] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchAvailable = async () => {
        try {
            const response = await fetch(WEBSITE + '/api/shop/quantities');
            if (response.ok) {
                const result = await response.json();
                setAvailable(result);
            } else {
                console.error("Failed to fetch available quantities:", response.statusText);
            }
        } catch (error) {
            console.error('Error fetching data: ', error);
        } finally {
            setLoading(false);
        }
    };

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

    useEffect(() => {
        fetchData();
        fetchAvailable();
    }, []);

    if (loading) {
        return <p>Loading...</p>;
    }

    function handleAddQuantity(item) {
        addQuantity(item);

        document.getElementById("quantity" + item.number).value = "";
    }

    async function addQuantity(item) {
        var input = document.getElementById("quantity" + item.number);
        const inputValue = Number(input.value.trim());

        // Only take care of adding additional items to cart if the quantity is greater than zero
        if (input.value !== "" && inputValue > 0) {
            //var inputValue = Number(input.value.trim());
            const oldQtyValue = available[item.number] || 0;
            const newQtyValue = oldQtyValue + inputValue;

            const payload = {
                id: item.number,
                newQty: newQtyValue
            };

            try {
                const response = await fetch(WEBSITE + '/api/rcv/available', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    console.log("Quantity updated successfully");

                    // Allow time for the backend to update before refreshing
                    setTimeout(() => refreshData(), 100); // 100ms delay
                } else {
                    console.error('Failed to update quantity:', response.statusText);
                }
            } catch (error) {
                console.error('Error sending request:', error);
            }

            input.value = "";
        }
    }

    function refreshData() {
        fetchData();
        fetchAvailable();
    }

    return (
        <div className='container'>
            <div className='products-section'>
                <h1 className='products-title'>Products</h1>
                <table id='products'>
                    <thead>
                        <tr>
                            <th></th>
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
                                    <img src={item.pictureURL} alt={item.description} />
                                </td>
                                <td>{item.description}</td>
                                <td>{"$" + (item.price).toFixed(2)}</td>
                                <td>{item.weight + "lbs"}</td>
                                <td>{available[item.number]}</td>
                                <td>
                                    <div id='qty-col' style={{position: "relative"}}>
                                        <p style={{display: "inline-flex"}}>Quantity: </p>
                                        <input id={"quantity" + item.number} type="number" min="0" placeholder="0" style={{ display: "inline-flex", width: "5em" }} />
                                    </div>  
                                </td>
                                <td><button type='button' onClick={() => handleAddQuantity(item)} >Add Quantity</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>            
        </div>    
    );
};

export default DataTable
