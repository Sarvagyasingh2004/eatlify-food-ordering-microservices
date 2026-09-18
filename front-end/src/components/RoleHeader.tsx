import toast from "react-hot-toast";
import { BiLogOut } from "react-icons/bi";
import { useAppData } from "../context/AppContext";

interface Props {
    title: string;
    // The seller page already has its own logout in RestaurantProfile, which
    // also closes the restaurant first - a better action than a plain sign-out.
    showLogout?: boolean;
}

// The seller, rider and admin dashboards render outside BrowserRouter, so they
// cannot use Account.tsx (or useNavigate) to sign out. Clearing the user is
// enough: App falls back to the router, where ProtectedRoute redirects to login.
const RoleHeader = ({ title, showLogout = true }: Props) => {
    const { user, setUser, setIsAuth } = useAppData();

    const logoutHandler = () => {
        localStorage.setItem("token", "");
        setUser(null);
        setIsAuth(false);
        toast.success("Logged out successfully.");
    };

    return (
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
            <div className="min-w-0">
                <p className="text-lg font-bold text-[#E23744]">Eatlify</p>
                <p className="truncate text-xs text-gray-500">{title}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
                {user?.name && <span className="hidden text-sm text-gray-600 sm:inline">{user.name}</span>}
                {showLogout && <button
                    onClick={logoutHandler}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    <BiLogOut className="h-4 w-4 text-red-500" />
                    Logout
                </button>}
            </div>
        </header>
    );
};

export default RoleHeader;
