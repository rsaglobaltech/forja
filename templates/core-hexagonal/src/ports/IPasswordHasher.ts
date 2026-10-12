export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  /**
   * Constant-time comparison. When the user does not exist, the caller must
   * still compare against a dummy hash so timing does not leak whether the
   * email exists (see LoginUseCase).
   */
  compare(plain: string, hash: string): Promise<boolean>;
  /** Compares against a fixed dummy hash, taking the same time as a real compare. */
  compareDummy(plain: string): Promise<boolean>;
}
