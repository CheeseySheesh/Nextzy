const { body } = require("express-validator");

const validateCreateUser = [
  body("login").isString().notEmpty().withMessage("login is required"),
  body("password").isString().notEmpty().withMessage("password is required"),
];

module.exports = {
    validateCreateUser
  };