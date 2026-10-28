import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import ProductForm from '../components/ProductForm.jsx';

export default function ProductFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      async function loadProduct() {
        try {
          setLoading(true);
          setError('');
          const product = await api.getProductById(id);
          setInitialData(product);
        } catch (err) {
          setError(err.message || 'Failed to load product data.');
        } finally {
          setLoading(false);
        }
      }

      loadProduct();
    }
  }, [id, isEditing]);

  const handleSubmit = async (formData) => {
    try {
      setSaving(true);
      setError('');

      if (isEditing) {
        await api.updateProduct(id, formData);
      } else {
        await api.createProduct(formData);
      }

      navigate('/app/products');
    } catch (err) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/app/products');
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title-group">
            <h1>Edit Product</h1>
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
          <h1>{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
          <p>
            {isEditing
              ? 'Update the product details, inventory quantity, or pricing.'
              : 'Add a new inventory item with SKU, stock quantity, and pricing.'}
          </p>
        </div>
      </div>

      <div className="card">
        <ProductForm
          initialData={initialData}
          onSubmit={handleSubmit}
          loading={saving}
          error={error}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
