import './App.css';
import Navbar from './Components/Navbar/Navbar';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Shop from './Pages/Shop';
import ShopCategory from './Pages/ShopCategory';
import Product from './Pages/Product';
import Cart from './Pages/Cart';
import LoginSignup from './Pages/LoginSignup';
import DataTable from './Components/Table/DataTable';
import Fulfillment from './Pages/Fulfillment';

function App() {
  
  return (
    <div>
      <BrowserRouter>
      <Navbar/>
      <Routes>
        <Route path='/' element={<Shop/>} />
        <Route path='/fulfillment' element={<Fulfillment/>} />
        <Route path='/receiving' element={<ShopCategory category="receiving"/>} />
        <Route path='/administration' element={<ShopCategory category="administration"/>} />
        <Route path='/cart' element={<Cart/>} />
        <Route path='/login' element={<LoginSignup/>} />
      </Routes>
      </BrowserRouter>
    </div>
  );
  
}

export default App;
