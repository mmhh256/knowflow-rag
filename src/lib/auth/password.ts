import bcrypt from "bcryptjs";

const PASSWORD_SALT_ROUNDS = 10;

// 密码不能明文存入数据库。数据库一旦泄露，明文密码会直接暴露用户账号。
// hashPassword 会把用户密码变成不可逆的哈希值，注册时只保存这个哈希。
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

// 登录时不能把哈希“解密”回密码，而是用 bcrypt.compare 判断输入密码和哈希是否匹配。
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
