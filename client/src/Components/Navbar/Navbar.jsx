import React, { useState } from 'react'
import './Navbar.css'
import logo from '../Assets/logo.png'
import cart_icon from '../Assets/shopping_cart_24dp.png'
import { Link } from 'react-router-dom'

const Navbar = () => {
    const [menu, setMenu] = useState("shop");

    return (
        <div className="navbar">
            <div className='nav-logo'>
                <img src={logo} alt="" id='car-logo'/>
                <p>SHOPPER</p>
            </div>
            <ul className="nav-menu">
                <li onClick={()=>{setMenu("shop")}}><Link style={{ textDecoration: 'none'}} to='/'>Shop</Link>{menu === "shop" ? <hr/> : <></>}</li>
                <li onClick={()=>{setMenu("fulfillment")}}><Link style={{ textDecoration: 'none'}} to='/fulfillment'>Fulfillment</Link>{menu === "fulfillment" ? <hr/> : <></>}</li>
                <li onClick={()=>{setMenu("receiving")}}><Link style={{ textDecoration: 'none'}} to='/receiving'>Receiving</Link>{menu === "receiving" ? <hr/> : <></>}</li>
                <li onClick={()=>{setMenu("administration")}}><Link style={{ textDecoration: 'none'}} to='/administration'>Administration</Link>{menu === "administration" ? <hr/> : <></>}</li>
            </ul>
            <div className='nav-login-cart'>
                <Link to='/login'><button>Login</button></Link>
                <Link to='/cart'><img src={cart_icon} alt="" id='cart-icon'/></Link>
                <div className='nav-cart-count'>0</div>
            </div>
        </div>
    )
}

export default Navbar