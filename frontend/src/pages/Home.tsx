import { Link } from 'react-router-dom';
import { store } from '../store/authStore';

export default function Home() {
  const user = store((state) => state.user);

  return (
    <div className="px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to BetThat
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Trade prediction markets with your friends. Put your money where your mouth is.
        </p>
        {user ? (
          <div className="bg-primary-50 rounded-lg p-6 max-w-md mx-auto">
            <div className="text-2xl font-bold text-primary-600 mb-2">
              {typeof user.token_balance === 'number' 
                ? user.token_balance.toFixed(2) 
                : parseFloat(user.token_balance || '0').toFixed(2)} tokens
            </div>
            <div className="text-sm text-gray-600">
              Your balance
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">Loading user data...</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Link
          to="/communities"
          className="card hover:shadow-lg transition-shadow"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Communities</h2>
          <p className="text-gray-600">
            Join or create communities to bet with friends. Private communities require invite codes.
          </p>
        </Link>

        <Link
          to="/markets"
          className="card hover:shadow-lg transition-shadow"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Markets</h2>
          <p className="text-gray-600">
            Browse active prediction markets. Trade yes/no positions on everything happening around you.
          </p>
        </Link>
      </div>
    </div>
  );
}

