import { newId } from "../shared/ids.js";
import { Email } from "../value-objects/Email.js";

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private props: UserProps) {}

  static create(input: { email: Email; passwordHash: string }): User {
    const now = new Date();
    return new User({
      id: newId(),
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  withPasswordHash(passwordHash: string): User {
    return new User({ ...this.props, passwordHash, updatedAt: new Date() });
  }

  get id(): string {
    return this.props.id;
  }
  get email(): Email {
    return this.props.email;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toPersistence(): UserProps {
    return { ...this.props };
  }
}
