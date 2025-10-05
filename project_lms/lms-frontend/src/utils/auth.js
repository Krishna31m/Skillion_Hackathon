export function setAuthTokens(access, refresh) {
  if (access) localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}

export function clearAuthTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('role');
  localStorage.removeItem('role_name');
}

export function setRoleInfo(role, roleName) {
  if (role !== undefined) localStorage.setItem('role', role);
  if (roleName) localStorage.setItem('role_name', roleName);
}

export function getRoleInfo() {
  return {
    role: localStorage.getItem('role'),
    role_name: localStorage.getItem('role_name')
  };
}
