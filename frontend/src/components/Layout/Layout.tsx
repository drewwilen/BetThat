import { Outlet, Link, useNavigate } from 'react-router-dom';
import { store } from '../../store/authStore';

export default function Layout() {
  const user = store((state) => state.user);
  const logout = store((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg border-b-2 border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <span className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">BetThat</span>
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/feed"
                  className="inline-flex items-center px-3 pt-1 text-sm font-bold text-gray-700 hover:text-blue-600 border-b-2 border-transparent hover:border-blue-600 transition-colors"
                >
                  Feed
                </Link>
                <Link
                  to="/communities"
                  className="inline-flex items-center px-3 pt-1 text-sm font-bold text-gray-700 hover:text-blue-600 border-b-2 border-transparent hover:border-blue-600 transition-colors"
                >
                  Communities
                </Link>
                <Link
                  to="/markets"
                  className="inline-flex items-center px-3 pt-1 text-sm font-bold text-gray-700 hover:text-blue-600 border-b-2 border-transparent hover:border-blue-600 transition-colors"
                >
                  Markets
                </Link>
                <Link
                  to="/portfolio"
                  className="inline-flex items-center px-3 pt-1 text-sm font-bold text-gray-700 hover:text-blue-600 border-b-2 border-transparent hover:border-blue-600 transition-colors"
                >
                  Portfolio
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="text-sm bg-gray-50 px-4 py-2 rounded-lg border-2 border-gray-200">
                    <div className="font-bold text-gray-900">{user.username}</div>
                    <div className="text-gray-600 font-semibold">
                      {typeof user.token_balance === 'number' 
                        ? user.token_balance.toFixed(2) 
                        : parseFloat(user.token_balance || '0').toFixed(2)} tokens
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary text-sm font-bold"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Loading...</div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

