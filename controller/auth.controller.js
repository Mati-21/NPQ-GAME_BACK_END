export const login = async (req, res, next) => {
  res.status(200).json({ login: "True" });
};
export const Register = async (req, res, next) => {
  res.status(200).json({ register: "True" });
};
export const logout = async (req, res, next) => {
  res.status(200).json({ logout: "True" });
};
export const verifyUser = async (req, res, next) => {
  res.status(200).json({ verifyUser: "True" });
};
