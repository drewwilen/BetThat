import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './store/authStore';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Communities from './pages/Communities';
import CommunityDetail from './pages/CommunityDetail';
import Markets from './pages/Markets';
import Feed from './pages/Feed';
import MarketDetail from './pages/MarketDetail';
import Portfolio from './pages/Portfolio';
import Home from './pages/Home';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = store((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="feed" element={<Feed />} />
          <Route path="communities" element={<Communities />} />
          <Route path="communities/:id" element={<CommunityDetail />} />
          <Route path="markets" element={<Markets />} />
          <Route path="markets/:id" element={<MarketDetail />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="portfolio/markets/:marketId" element={<Portfolio />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

