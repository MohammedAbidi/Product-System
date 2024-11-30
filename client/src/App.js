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
import Receiving from './Pages/Receiving';
import Administration from './Pages/Administration';

function App() {
  
  return (
    <div>
      <BrowserRouter>
      <Navbar/>
      <Routes>
        <Route path='/' element={<Shop/>} />
        <Route path='/fulfillment' element={<Fulfillment/>} />
        <Route path='/receiving' element={<Receiving/>} />
        <Route path='/administration' element={<Administration/>} />
        <Route path='/cart' element={<Cart/>} />
        <Route path='/login' element={<LoginSignup/>} />
      </Routes>
      </BrowserRouter>
    </div>
  );
  
}

export default App;
