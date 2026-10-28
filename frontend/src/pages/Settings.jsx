import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { updateOrganizationState } = useAuth();
  const [organizationName, setOrganizationName] = useState('');
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        setError('');
        const data = await api.getSettings();
        setOrganizationName(data.organizationName || '');
        setDefaultLowStockThreshold(data.defaultLowStockThreshold ?? 5);
      } catch (err) {
        setError(err.message || 'Failed to load organization settings.');
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const thresholdNum = Number(defaultLowStockThreshold);
    if (!Number.isInteger(thresholdNum) || thresholdNum < 0) {
      setError('Default low-stock threshold must be a non-negative integer (0 or greater).');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const res = await api.updateSettings({
        defaultLowStockThreshold: thresholdNum,
        organizationName: organizationName.trim(),
      });

      updateOrganizationState({
        name: res.organizationName,
        defaultLowStockThreshold: res.defaultLowStockThreshold,
      });

      setSuccess('Settings updated successfully! Changes take effect immediately across all inventory items.');
    } catch (err) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title-group">
            <h1>Settings</h1>
            <p>Manage organization preferences and inventory defaults.</p>
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
          <h1>Settings</h1>
          <p>Configure defaults and preferences for your organization's inventory.</p>
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

      {success && (
        <div className="alert alert-success">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          {success}
        </div>
      )}

      <div className="card" style={{ maxWidth: '640px' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="organizationName">
              Organization Name
            </label>
            <input
              id="organizationName"
              type="text"
              className="form-input"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Your Organization Name"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="defaultLowStockThreshold">
              Default Low-Stock Threshold <span className="required">*</span>
            </label>
            <input
              id="defaultLowStockThreshold"
              type="number"
              min="0"
              step="1"
              className="form-input"
              value={defaultLowStockThreshold}
              onChange={(e) => setDefaultLowStockThreshold(e.target.value)}
              required
            />
            <div className="form-hint">
              Products that do not specify an individual threshold will trigger low-stock alerts when their quantity is at or below this value.
            </div>
          </div>

          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner"></span> Saving Settings...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
