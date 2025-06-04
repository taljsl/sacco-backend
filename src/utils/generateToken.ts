import jwt from "jsonwebtoken";

const generateToken = (userId: string): string => {
  const secret: string = process.env.JWT_SECRET!;
  return jwt.sign({ id: userId }, secret, {
    expiresIn: "1d",
  });
};

export default generateToken;
// error on sign can be replaced by deleteing everything prior to the or statement