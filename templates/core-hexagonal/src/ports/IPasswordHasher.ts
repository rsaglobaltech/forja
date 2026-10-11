export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  /**
   * Comparación en tiempo constante. Cuando el usuario no existe, el caller
   * debe llamar igual a `compare` contra un hash dummy para no filtrar por
   * timing si el email existe o no (ver LoginUseCase).
   */
  compare(plain: string, hash: string): Promise<boolean>;
  /** Compara contra un hash dummy fijo, para gastar el mismo tiempo que un compare real. */
  compareDummy(plain: string): Promise<boolean>;
}
