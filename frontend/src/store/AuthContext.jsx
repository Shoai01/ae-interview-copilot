import { createContext, useState, useEffect, useContext, useRef } from 'react';
import api, { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep latest token in a ref so interceptor always has access to it immediately
  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken;

  // Configure axios interceptor for token injection
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      if (tokenRef.current) {
        config.headers.Authorization = `Bearer ${tokenRef.current}`;
      }
      return config;
    });

    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, []);

  // Configure axios interceptor for 401 handling
  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Prevent infinite loops if refresh fails
        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
          originalRequest._retry = true;
          try {
            const data = await authService.refresh();
            if (data.access_token) {
              setAccessToken(data.access_token);
              setUser({ id: data.id, role: data.role, username: data.username, moduleId: data.module_id });
              originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
              return api(originalRequest);
            }
          } catch {
            // Refresh failed, logout
            setAccessToken(null);
            setUser(null);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await authService.refresh();
        if (data.access_token) {
          setAccessToken(data.access_token);
          setUser({ id: data.id, role: data.role, username: data.username, moduleId: data.module_id });
        }
      } catch {
        // No active session
        console.log("No active session found.");
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (username, password) => {
    const data = await authService.login(username, password);
    setAccessToken(data.access_token);
    setUser({ id: data.id, role: data.role, username: data.username, moduleId: data.module_id });
    return data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error(e);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  if (isLoading) {
    return <div>Loading session...</div>; // Or a better loading spinner
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
