import { useAuth } from '../context/AuthContext';

export function useCurrentUser() {
  const { currentUser, hasPermission, hasAnyPermission } = useAuth();
  return {
    user: currentUser,
    role: currentUser?.role || '',
    hasPermission,
    hasAnyPermission,
  };
}

export default useCurrentUser;
