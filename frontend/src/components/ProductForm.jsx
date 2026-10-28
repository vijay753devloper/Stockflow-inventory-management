import React, { useState, useEffect } from 'react';

export default function ProductForm({ initialData = null, onSubmit, loading, error, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    quantityOnHand: 0,
    costPrice: '',
    sellingPrice: '',
    lowStockThreshold: '',
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        sku: initialData.sku || '',
        description: initialData.description || '',
        quantityOnHand: initialData.quantityOnHand !== undefined ? initialData.quantityOnHand : 0,
        costPrice: initialData.costPrice !== null && initialData.costPrice !== undefined ? initialData.costPrice : '',
        sellingPrice: initialData.sellingPrice !== null && initialData.sellingPrice !== undefined ? initialData.sellingPrice : '',
        lowStockThreshold: initialData.lowStockThreshold !== null && initialData.lowStockThreshold !== undefined ? initialData.lowStockThreshold : '',
      });
    }
  }, [initialData]);

  const validate = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Product name is required.';
    }

    if (!formData.sku.trim()) {
      errors.sku = 'SKU is required.';
    }

    if (formData.quantityOnHand !== '' && (isNaN(Number(formData.quantityOnHand)) || Number(formData.quantityOnHand) < 0 || !Number.isInteger(Number(formData.quantityOnHand)))) {
      errors.quantityOnHand = 'Quantity on hand must be a non-negative whole number (0 or greater).';
    }

    if (formData.costPrice !== '' && (isNaN(Number(formData.costPrice)) || Number(formData.costPrice) < 0)) {
      errors.costPrice = 'Cost price must be a valid non-negative number.';
    }

    if (formData.sellingPrice !== '' && (isNaN(Number(formData.sellingPrice)) || Number(formData.sellingPrice) < 0)) {
      errors.sellingPrice = 'Selling price must be a valid non-negative number.';
    }

    if (formData.lowStockThreshold !== '' && (isNaN(Number(formData.lowStockThreshold)) || Number(formData.lowStockThreshold) < 0 || !Number.isInteger(Number(formData.lowStockThreshold)))) {
      errors.lowStockThreshold = 'Low stock threshold must be a non-negative whole number (0 or greater).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field-specific error as user types
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Build payload with proper numeric conversions
    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      description: formData.description.trim() || null,
      quantityOnHand: formData.quantityOnHand === '' ? 0 : parseInt(formData.quantityOnHand, 10),
      costPrice: formData.costPrice === '' ? null : parseFloat(formData.costPrice),
      sellingPrice: formData.sellingPrice === '' ? null : parseFloat(formData.sellingPrice),
      lowStockThreshold: formData.lowStockThreshold === '' ? null : parseInt(formData.lowStockThreshold, 10),
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            Product Name <span className="required">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="form-input"
            placeholder="e.g. Wireless Mechanical Keyboard"
            value={formData.name}
            onChange={handleChange}
            required
          />
          {formErrors.name && <div className="form-hint" style={{ color: 'var(--danger)' }}>{formErrors.name}</div>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sku">
            Stock Keeping Unit (SKU) <span className="required">*</span>
          </label>
          <input
            id="sku"
            name="sku"
            type="text"
            className="form-input"
            placeholder="e.g. KB-W-100"
            value={formData.sku}
            onChange={handleChange}
            required
          />
          <div className="form-hint">Unique identifier for this item within your organization.</div>
          {formErrors.sku && <div className="form-hint" style={{ color: 'var(--danger)' }}>{formErrors.sku}</div>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          className="form-textarea"
          placeholder="Optional notes or details about this product..."
          value={formData.description}
          onChange={handleChange}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="quantityOnHand">
            Quantity on Hand <span className="required">*</span>
          </label>
          <input
            id="quantityOnHand"
            name="quantityOnHand"
            type="number"
            min="0"
            step="1"
            className="form-input"
            value={formData.quantityOnHand}
            onChange={handleChange}
            required
          />
          {formErrors.quantityOnHand && (
            <div className="form-hint" style={{ color: 'var(--danger)' }}>{formErrors.quantityOnHand}</div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="costPrice">
            Cost Price ($)
          </label>
          <input
            id="costPrice"
            name="costPrice"
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            placeholder="0.00"
            value={formData.costPrice}
            onChange={handleChange}
          />
          <div className="form-hint">Your procurement cost per unit.</div>
          {formErrors.costPrice && (
            <div className="form-hint" style={{ color: 'var(--danger)' }}>{formErrors.costPrice}</div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sellingPrice">
            Selling Price ($)
          </label>
          <input
            id="sellingPrice"
            name="sellingPrice"
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            placeholder="0.00"
            value={formData.sellingPrice}
            onChange={handleChange}
          />
          <div className="form-hint">Customer retail price.</div>
          {formErrors.sellingPrice && (
            <div className="form-hint" style={{ color: 'var(--danger)' }}>{formErrors.sellingPrice}</div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="lowStockThreshold">
            Custom Low-Stock Threshold
          </label>
          <input
            id="lowStockThreshold"
            name="lowStockThreshold"
            type="number"
            min="0"
            step="1"
            className="form-input"
            placeholder="Leave empty for organization default"
            value={formData.lowStockThreshold}
            onChange={handleChange}
          />
          <div className="form-hint">Leave blank to use organization default threshold.</div>
          {formErrors.lowStockThreshold && (
            <div className="form-hint" style={{ color: 'var(--danger)' }}>{formErrors.lowStockThreshold}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span> Saving...
            </>
          ) : (
            'Save Product'
          )}
        </button>
      </div>
    </form>
  );
}
