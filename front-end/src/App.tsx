import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProtectedRoute from "./components/protectedRoutes";
import PublicRoute from "./components/publicRoutes";
import SelectRole from "./pages/SelectRole";
import NavBar from "./components/navBar";
import Account from "./pages/Account";
import { useAppData } from "./context/AppContext";
import Restaurant from "./pages/Restaurant";
import RestaurantPage from "./pages/RestaurantPage";
import Cart from "./pages/Cart";
import AddAddressPage from "./pages/AddAddressPage";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import OrderPage from "./pages/OrderPage";
import RiderDashboard from "./pages/RiderDashboard";
import Admin from "./pages/Admin";
const App = () => {
  const { user, loading } = useAppData();
  if (loading) {
    return <h1 className="text-2xl font-bold text-red-500 text-center mt-56">Loading...</h1>
  }

  if (user && user.role === "admin") {
    return <Admin />
  }

  if (user && user.role === "seller") {
    return <Restaurant />
  }

  if (user && user.role === "rider") {
    return <RiderDashboard />
  }


  return <>
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/paymentsuccesspage/:paymentId" element={<PaymentSuccess />} />
          <Route path="/ordersuccess" element={<OrderSuccess />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order/:orderId" element={<OrderPage />} />
          <Route path="/address" element={<AddAddressPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/restaurant/:id" element={<RestaurantPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/select-role" element={<SelectRole />} />
          <Route path="/account" element={<Account />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </>
}

export default App;