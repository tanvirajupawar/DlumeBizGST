import { useState } from "react";
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from "react-icons/fi";
import { HiOutlineDocumentText } from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import Input from "../../components/Input";
import Button from "../../components/Button";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    login({
      userData: { email },
      accessToken: "dummy-token",
    });

    toast.success("Login Successful 🚀");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-10">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: "#1e3a8a" }}
          >
            <HiOutlineDocumentText size={28} />
          </div>
        </div>

        <h2 className="text-3xl font-medium text-center text-gray-900 mb-1 tracking-tight">
          Login to Your Account
        </h2>

     <p className="text-gray-400 text-center text-sm mb-8">
  Welcome back to D&apos;LumeBiz
</p>

        <form onSubmit={handleLogin} className="space-y-5">

          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={FiMail}
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={FiLock}
            rightIcon={showPassword ? FiEyeOff : FiEye}
            onRightIconClick={() => setShowPassword(!showPassword)}
          />

         <Button type="submit" fullWidth>
  Sign in <FiArrowRight />
</Button>

        </form>

        <div className="my-6 border-t border-gray-200" />

        <p>
  Don&apos;t have an account?{" "}
  <span className="font-bold text-gray-900 cursor-pointer hover:underline">
    Sign up
  </span>
</p>

      </div>
    </div>
  );
};

export default Login;