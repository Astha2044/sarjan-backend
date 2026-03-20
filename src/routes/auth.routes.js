
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import styles from "../../styles/Register.module.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Script from "next/script";

const LoginModal = ({ open, onClose, onOpenRegister, onOpenForgotPassword }) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const [showPassword, setShowPassword] = useState(false);

  /* ================= NORMAL LOGIN ================= */
  const onSubmit = async (data) => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/login`,
        {
          email: data.email,
          password: data.password,
        }
      );

      localStorage.setItem("user", JSON.stringify(res.data?.data));

      toast.success("Login successful 🚀");

      reset();
      onClose();
      router.push("/studio");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Login failed");
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  /* ================= BODY SCROLL ================= */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  /* ================= GOOGLE LOGIN ================= */
  useEffect(() => {
    if (open && window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const res = await axios.post(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/google/verify`,
              { idToken: response.credential }
            );

            if (res.data?.status === "success") {
              localStorage.setItem("user", JSON.stringify(res.data?.data));
              toast.success("Google Login successful 🚀");
              onClose();
              router.push("/studio");
            }
          } catch (error) {
            toast.error(
              error?.response?.data?.message || "Google Login failed"
            );
          }
        },
      });

      window.google.accounts.id.renderButton(
        document.getElementById("googleLoginBtn"),
        {
          theme: "outline",
          size: "large",
          width: "100%",
        }
      );
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* ✅ Google Script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />

      <div className={styles.overlay}>
        <div className={styles.modal}>
          {/* Logo */}
          <div className={styles.logoWrapper}>
            <img
              src="/images/sarjan.png"
              alt="Sarjan AI"
              className={styles.logo}
            />
          </div>

          <h2 className={styles.title}>Welcome Back</h2>

          {/* ================= FORM ================= */}
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div className={styles.field}>
              <input
                placeholder="Email"
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: "Invalid email",
                  },
                })}
              />
              {errors.email && <p>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className={styles.field} style={{ position: "relative" }}>
              <input
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                {...register("password", {
                  required: "Password required",
                  minLength: { value: 6, message: "Min 6 characters" },
                })}
              />
              <span
                className={styles.eyeIcon}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
              {errors.password && <p>{errors.password.message}</p>}
            </div>

            {/* Forgot Password */}
            <div className={styles.forgotPassword}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (typeof onOpenForgotPassword === "function") {
                    onOpenForgotPassword();
                  } else {
                    toast.info("Forgot password feature coming soon!");
                  }
                }}
              >
                Forgot Password?
              </button>
            </div>

            <button disabled={isSubmitting} className={styles.submitBtn}>
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Divider */}
          <div className={styles.divider}>
            <span>OR</span>
          </div>

          {/* ✅ Google Button */}
          <div id="googleLoginBtn" style={{ width: "100%" }}></div>

          {/* Switch */}
          <div className={styles.switchAuth}>
            <span>Don’t have an account?</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRegister();
              }}
            >
              Register
            </button>
          </div>

          {/* Close */}
          <button className={styles.closeBtn} onClick={handleClose}>
            ✕
          </button>
        </div>
      </div>
    </>
  );
};

export default LoginModal;
