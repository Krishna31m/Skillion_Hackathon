import { useCallback } from 'react';
import apiClient, { API } from '../api/apiClient';
import { setAuthTokens, clearAuthTokens, setRoleInfo } from '../utils/auth';

export function useAuth() {
  const isAuthenticated = useCallback(() => {
    const token = localStorage.getItem('access_token');
    return !!token;
  }, []);

  const getRole = useCallback(() => {
    const role = localStorage.getItem('role');
    const roleName = localStorage.getItem('role_name');
    return roleName || role || null;
  }, []);

  const getRoleRaw = useCallback(() => {
    const role = localStorage.getItem('role');
    return role ? Number(role) : null;
  }, []);

  const logout = useCallback(() => {
    clearAuthTokens();
    // Do not perform a full-page navigation here; callers should navigate via React Router.
    return true;
  }, []);

  // Try to refresh tokens and fetch authoritative profile from the server.
  const restoreSession = useCallback(async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return false;

    try {
      const resp = await API.refreshToken(refresh);
      const newAccess = resp.data.access;
      if (newAccess) {
        setAuthTokens(newAccess, refresh);
      }

      // Fetch profile (role and role_name)
      const profileResp = await API.getProfile();
      const profile = profileResp.data;
      if (profile) {
        setRoleInfo(profile.role, profile.role_name || profile.role_name_display || null);
      }

      return true;
    } catch (err) {
      // refresh failed; clear tokens
      clearAuthTokens();
      return false;
    }
  }, []);

  return { isAuthenticated, getRole, getRoleRaw, logout, restoreSession };
}
