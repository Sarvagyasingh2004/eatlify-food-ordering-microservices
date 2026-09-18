import axios from 'axios';
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { utilsService } from '../main';
import toast from 'react-hot-toast';

const OrderSuccess = () => {
  const [params] = useSearchParams();

  const sessionId = params.get("session_id");

  useEffect(() => {
    const verifypayment = async () => {
      if (!sessionId) return;
      try {
        await axios.post(`${utilsService}/api/payment/stripe/verify`, {
          sessionId
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        toast.success("Payment verified successfully")
      } catch (error) {
        console.log(error);
        toast.error("Failed to verify stripe payment");
      }
    };
    verifypayment();
  }, [sessionId]);
  return (
    <div className='flex h-[60vh] items-center justify-center'>
      <h1 className="text-2xl font-bold text-green-600">Payment Successfull</h1>
    </div>
  )
}

export default OrderSuccess
