import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, product: null, loading: false });

  const fetchProducts = useCallback(async (query = '') => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getProducts(query);
      setProducts(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(searchTerm);
  }, [fetchProducts, searchTerm]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const openDeleteModal = (product) => {
    setDeleteModal({ open: true, product, loading: false });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, product: null, loading: false });
  };

  const confirmDelete = async () => {
    if (!deleteModal.product) return;

    try {
      setDeleteModal((prev) => ({ ...prev, loading: true }));
      await api.deleteProduct(deleteModal.product.id);
      closeDeleteModal();
      // Refresh list
      fetchProducts(searchTerm);
    } catch (err) {
      setError(err.message || 'Failed to delete product.');
      closeDeleteModal();
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Products</h1>
          <p>Manage your inventory catalog, SKU numbers, quantities, and pricing.</p>
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

      {/* Search and Filters Bar */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            className="form-input"
            placeholder="Search by product name or SKU..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        {searchTerm && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSearchTerm('')}
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Products Table / Empty States */}
      {loading ? (
        <div className="spinner spinner-primary"></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>{searchTerm ? 'No products match your search' : 'No products found'}</h3>
          <p>
            {searchTerm
              ? `We couldn't find any products matching "${searchTerm}". Try a different name or SKU.`
              : 'Start building your inventory catalog by adding your first product.'}
          </p>
          {searchTerm ? (
            <button className="btn btn-secondary btn-sm" onClick={() => setSearchTerm('')}>
              Show All Products
            </button>
          ) : (
            <Link to="/app/products/new" className="btn btn-primary btn-sm">
              Add Product
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
                <th>Stock Status</th>
                <th>Selling Price</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--text-main)' }}>
                        {product.name}
                      </strong>
                      {product.description && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {product.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                      {product.sku}
                    </code>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{product.quantityOnHand}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginLeft: '4px' }}>
                      (Threshold: {product.effectiveThreshold})
                    </span>
                  </td>
                  <td>
                    {product.isLowStock ? (
                      <span className="badge badge-low-stock">
                        <span className="badge-dot"></span> Low Stock
                      </span>
                    ) : (
                      <span className="badge badge-in-stock">
                        <span className="badge-dot"></span> In Stock
                      </span>
                    )}
                  </td>
                  <td>
                    {product.sellingPrice !== null && product.sellingPrice !== undefined
                      ? `$${Number(product.sellingPrice).toFixed(2)}`
                      : '—'}
                  </td>
                  <td>
                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                      <Link
                        to={`/app/products/${product.id}/edit`}
                        className="btn btn-secondary btn-sm"
                        title="Edit product"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="btn btn-danger-outline btn-sm"
                        onClick={() => openDeleteModal(product)}
                        title="Delete product"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Delete Product</h3>
            <p className="modal-body">
              Are you sure you want to delete <strong>{deleteModal.product?.name}</strong> (SKU: <code>{deleteModal.product?.sku}</code>)? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeDeleteModal}
                disabled={deleteModal.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={deleteModal.loading}
              >
                {deleteModal.loading ? (
                  <>
                    <span className="spinner"></span> Deleting...
                  </>
                ) : (
                  'Confirm Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
