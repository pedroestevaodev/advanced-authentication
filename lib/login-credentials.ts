export const INVALID_CREDENTIALS = "Invalid credentials!";

export type PasswordUser = {
  password: string | null;
};

export const assertLocalPassword = async (
  user: PasswordUser | null,
  password: string,
  compare: (plain: string, hash: string) => Promise<boolean>,
): Promise<boolean> => {
  if (!user?.password) return false;
  return compare(password, user.password);
};
