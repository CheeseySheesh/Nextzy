const { body } = require("express-validator");

const validateCreateStudio = [
  body("name").isString().notEmpty().withMessage("name is required"),
  body("website").isString().notEmpty().withMessage("website is required"),
];

module.exports = {
    validateCreateStudio
  };