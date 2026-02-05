import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  History,
  LogOut,
  Menu,
  X,
  Users,
  DollarSign,
  Cog,
  User,
  FileText,
  Upload,
  Smartphone,
  RefreshCw,
  Eye,
  LayoutTemplate,
  AlertTriangle,
  Megaphone,
  Globe
} from 'lucide-react';
import { useState } from 'react';

const customerNavItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'WhatsApp', path: '/whatsapp-connect', icon: Smartphone },
  { name: 'Templates', path: '/templates', icon: LayoutTemplate },
  { name: 'Messages', path: '/messages', icon: MessageSquare },
  { name: 'Reports', path: '/campaigns', icon: Megaphone },
  { name: 'Transactions', path: '/transactions', icon: History },
  { name: 'Invoices', path: '/invoices', icon: FileText },
  { name: 'Add Money', path: '/add-money', icon: CreditCard },
  { name: 'Profile', path: '/profile', icon: User },
];

const adminNavItems = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Customers', path: '/admin/customers', icon: Users },
  { name: 'Campaigns', path: '/admin/campaigns', icon: Megaphone },
  { name: 'Transactions', path: '/admin/transactions', icon: History },
  { name: 'Messages', path: '/admin/messages', icon: MessageSquare },
  { name: 'Import CSV', path: '/admin/import', icon: Upload },
  { name: 'Twilio Sync', path: '/admin/twilio-sync', icon: RefreshCw },
  { name: 'Low Balance', path: '/admin/low-balance-alerts', icon: AlertTriangle },
  { name: 'Pricing', path: '/admin/pricing', icon: DollarSign },
  { name: 'WhatsApp API', path: '/admin/whatsapp', icon: Smartphone },
  { name: 'Settings', path: '/admin/settings', icon: Cog },
];

export default function Layout({ children }) {
  const { user, logout, isImpersonating, impersonatedCustomer, exitImpersonation } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : customerNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header - Fixed */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <img
              src="/Dashbord_logo.png"
              alt="Dashboard Logo"
              className="h-10 w-auto"
            />
          </div>
          <button
            className="lg:hidden p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Nav Section */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer - Fixed */}
        <div className="flex-shrink-0 p-4 border-t bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors w-full px-3 py-2 rounded-lg hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="bg-purple-600 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm">
                Viewing as <strong>{impersonatedCustomer || user?.name}</strong> (Admin Mode)
              </span>
            </div>
            <button
              onClick={exitImpersonation}
              className="bg-white text-purple-600 px-3 py-1 rounded text-sm font-medium hover:bg-purple-50 transition-colors"
            >
              Back to Admin
            </button>
          </div>
        )}

        {/* Low Balance Warning for Customers */}
        {!isAdmin && user?.balance < 20000 && (
          <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <span className="font-medium">Low Balance Alert!</span>
                <span className="ml-2 text-red-100">
                  Your balance is Rs.{(user?.balance / 100 || 0).toFixed(2)}.
                  {user?.balance <= 0
                    ? ' Messages cannot be sent. Please recharge immediately!'
                    : ' Please recharge soon to avoid service interruption.'}
                </span>
              </div>
            </div>
            <Link
              to="/add-money"
              className="bg-white text-red-600 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors flex items-center gap-2 flex-shrink-0"
            >
              <CreditCard className="h-4 w-4" />
              Recharge Now
            </Link>
          </div>
        )}

        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-4">
              {!isAdmin && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Balance</p>
                  <p className="font-bold text-green-600">
                    ₹{(user?.balance / 100 || 0).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
