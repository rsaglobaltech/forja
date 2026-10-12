export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class EmailAlreadyInUseError extends DomainError {
  constructor() {
    super("That email is already registered", "EMAIL_ALREADY_IN_USE");
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super("Invalid email or password", "INVALID_CREDENTIALS");
  }
}

export class InvalidResetTokenError extends DomainError {
  constructor() {
    super("The password reset link is invalid or has expired", "INVALID_RESET_TOKEN");
  }
}

export class WeakPasswordError extends DomainError {
  constructor(reason: string) {
    super(reason, "WEAK_PASSWORD");
  }
}

export class InvalidEmailError extends DomainError {
  constructor() {
    super("Invalid email", "INVALID_EMAIL");
  }
}
