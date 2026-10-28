import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authenticated session on initial mount
  useEffect(() => {
    async function checkAuthSession() {
      try {
        const data = await api.getCurrentUser();
        if (data?.user) {
          setUser(data.user);
          setOrganization(data.user.organization);
        }
      } catch (err) {
        // User is not logged in or cookie expired; clear state
        setUser(null);
        setOrganization(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuthSession();
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    if (res?.user) {
      setUser(res.user);
      setOrganization(res.user.organization);
    }
    return res;
  };

  const signup = async ({ organizationName, email, password, confirmPassword }) => {
    const res = await api.signup({ organizationName, email, password, confirmPassword });
    if (res?.user) {
      setUser(res.user);
      setOrganization(res.user.organization);
    }
    return res;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('Logout request failed:', err);
    } finally {
      setUser(null);
      setOrganization(null);
    }
  };

  const updateOrganizationState = (updatedOrg) => {
    setOrganization((prev) => ({
      ...prev,
      ...updatedOrg,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateOrganizationState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
