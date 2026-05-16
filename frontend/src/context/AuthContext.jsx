import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {

  const storedUser =
    localStorage.getItem("user");

  const storedToken =
    localStorage.getItem("token");

  const [user, setUser] = useState(
    storedUser
      ? JSON.parse(storedUser)
      : null
  );

  const [token, setToken] = useState(
    storedToken || null
  );

  const login = ({
    userData,
    accessToken,
  }) => {

    // ✅ Store user
    localStorage.setItem(
      "user",
      JSON.stringify(userData)
    );

    // ✅ Store token
    localStorage.setItem(
      "token",
      accessToken
    );

    // ✅ Store company id
    if (userData?.company?._id) {

      localStorage.setItem(
        "company_id",
        userData.company._id
      );

    }

    setUser(userData);

    setToken(accessToken);
  };

  const logout = () => {

    localStorage.removeItem("user");

    localStorage.removeItem("token");

    localStorage.removeItem("company_id");

    setUser(null);

    setToken(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};