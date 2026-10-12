export interface RegisterRequest {
  email: string;
  password: string;
}
/** Registering signs the user in straight away (same shape as LoginResponse): mobile does not chain two requests. */
export interface RegisterResponse {
  userId: string;
  token: string;
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  userId: string;
  token: string;
  expiresAt: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface MeResponse {
  userId: string;
  email: string;
}

export interface ApiError {
  error: string;
  message: string;
}
