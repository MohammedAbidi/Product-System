import React, { useEffect, useState } from 'react';
import ReactDOM from "react-dom";
import './ReceivingTable.css'

function DataTable() {
    const [data, setData] = useState([]);
    const [available, setAvailable] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/shop/quantities');
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

    async function addQuantity(item) {
        const input = document.getElementById("quantity" + item.number);

        // Only take care of adding additional items to cart if the quantity is greater than zero
        if (input.value !== "" || inputValue > 0) {
            var inputValue = Number(input.value.trim());
            let oldQtyValue = available[item.number];
            let newQtyValue = oldQtyValue + inputValue;
            console.log(newQtyValue);

            const payload = {
                id: item.number,
                newQty: newQtyValue
            };

            try {
                const response = await fetch('http://localhost:5000/api/rcv/available', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
            } catch (error) {
                console.error('Error sending request:', error);
            }

            input.value = "";
        }
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
                                        <input id={"quantity" + item.number} type="number" min="0" placeholder="0" style={{ display: "inline-flex", width: "5em" }} />
                                    </div>  
                                </td>
                                <td><button type='button' onClick={() => addQuantity(item)} >Add Quantity</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>            
        </div>    
    );
};

export default DataTable