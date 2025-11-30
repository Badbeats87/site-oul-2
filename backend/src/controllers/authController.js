import authService from "../services/authService.js";
import { ApiError } from "../middleware/errorHandler.js";
import logger from "../../config/logger.js";

/**
 * POST /api/v1/auth/register
 * Register a new user (BUYER or SELLER role)
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    const result = await authService.register({
      email,
      password,
      name,
      role: role || "BUYER",
    });

    res.status(201).json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 * Login user and return tokens
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError("Email and password are required", 400);
    }

    const result = await authService.login(email, password);

    res.status(200).json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError("Refresh token is required", 400);
    }

    const result = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 * Logout user by revoking refresh token (protected route)
 */
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError("Refresh token is required", 400);
    }

    await authService.logout(req.user.id, refreshToken);

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout-all
 * Logout user from all devices (protected route)
 */
export const logoutAll = async (req, res, next) => {
  try {
    const result = await authService.logoutAll(req.user.id);

    res.status(200).json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 * Get current authenticated user (protected route)
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/change-password
 * Change user password (protected route)
 */
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new ApiError("Old password and new password are required", 400);
    }

    const result = await authService.changePassword(
      req.user.id,
      oldPassword,
      newPassword,
    );

    res.status(200).json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};
