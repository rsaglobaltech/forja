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
    super("Ese email ya está registrado", "EMAIL_ALREADY_IN_USE");
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super("Email o contraseña inválidos", "INVALID_CREDENTIALS");
  }
}

export class InvalidResetTokenError extends DomainError {
  constructor() {
    super("El link de recuperación es inválido o venció", "INVALID_RESET_TOKEN");
  }
}

export class WeakPasswordError extends DomainError {
  constructor(reason: string) {
    super(reason, "WEAK_PASSWORD");
  }
}

export class InvalidEmailError extends DomainError {
  constructor() {
    super("Email inválido", "INVALID_EMAIL");
  }
}
