export interface UserRegistered {
  type: "UserRegistered";
  userId: string;
  email: string;
  occurredAt: Date;
}

export function userRegistered(userId: string, email: string): UserRegistered {
  return { type: "UserRegistered", userId, email, occurredAt: new Date() };
}
