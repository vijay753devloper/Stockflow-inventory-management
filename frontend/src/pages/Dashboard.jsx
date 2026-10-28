import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import StatCard from '../components/StatCard.jsx';

export default function Dashboard() {
  const [data, setData] = useState({
    totalProducts: 0,
    totalStockUnits: 0,
    lowStockCount: 0,
    lowStockItems: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title-group">
            <h1>Dashboard</h1>
            <p>Overview of your current stock levels and inventory health.</p>
          </div>
        </div>
        <div className="spinner spinner-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Dashboard</h1>
          <p>Real-time inventory metrics and stock alert status.</p>
        </div>
        <div>
          <Link to="/app/products/new" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Product
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {error}
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="stat-cards-grid">
        <StatCard
          title="Total Products"
          value={data.totalProducts}
          iconType="layers"
          color="blue"
        />
        <StatCard
          title="Total Stock Units"
          value={data.totalStockUnits.toLocaleString()}
          iconType="box"
          color="blue"
        />
        <StatCard
          title="Low-Stock Products"
          value={data.lowStockCount}
          iconType="alert-triangle"
          color={data.lowStockCount > 0 ? 'amber' : 'blue'}
        />
      </div>

      {/* Low Stock Items Section */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">Low Stock Items</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Items with stock at or below their active alert threshold (Quantity &le; Threshold).
            </p>
          </div>
          <Link to="/app/products" className="btn btn-secondary btn-sm">
            View All Products &rarr;
          </Link>
        </div>

        {data.lowStockItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <h3>All items healthy</h3>
            <p>
              {data.totalProducts === 0
                ? "You haven't added any products yet. Add your first inventory item to begin tracking."
                : 'None of your inventory items are currently at or below their low-stock thresholds.'}
            </p>
            {data.totalProducts === 0 && (
              <Link to="/app/products/new" className="btn btn-primary btn-sm">
                Add Your First Product
              </Link>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Quantity on Hand</th>
                  <th>Effective Threshold</th>
                  <th>Stock Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>
                      <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {item.sku}
                      </code>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--danger-text)' }}>
                        {item.quantityOnHand} units
                      </span>
                    </td>
                    <td>{item.effectiveThreshold}</td>
                    <td>
                      <span className="badge badge-low-stock">
                        <span className="badge-dot"></span> Low Stock
                      </span>
                    </td>
                    <td>
                      <Link to={`/app/products/${item.id}/edit`} className="btn btn-secondary btn-sm">
                        Update Stock
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
