/**
 * pages/PaymentPage.jsx
 * Payouts are processed via Admin panel (PayHere). No Stripe checkout.
 */
import { Link } from "react-router-dom";

export default function PaymentPage() {
  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Payments</h1>
      <p className="text-slate-600 dark:text-slate-400 text-sm">
        Payouts to partners are processed by admins via the Admin panel using PayHere. If you are an admin, go to the Admin dashboard to approve and pay payout requests.
      </p>
      <Link
        to="/"
        className="inline-block mt-4 text-sm font-medium text-[#80134D] hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
