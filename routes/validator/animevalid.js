const { body } = require("express-validator");

const validateCreateAnime = [
  body("name").isString().notEmpty().withMessage("name is required"),
  body("year").isNumeric().notEmpty().withMessage("year is required"),
];

module.exports = {
    validateCreateAnime
  };