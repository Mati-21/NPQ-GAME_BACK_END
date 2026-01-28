import jwt from "jsonwebtoken";

export const createToken = async (userId, secret, option) => {
  return new Promise((resolve, reject) => {
    jwt.sign(userId, secret, option, (err, token) => {
      if (err) {
        reject(err);
      } else {
        resolve(token);
      }
    });
  });
};

export const checkToken = async (token, secret) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decode) => {
      if (err) {
        reject(err);
      } else {
        resolve(decode);
      }
    });
  });
};
