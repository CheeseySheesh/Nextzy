const { body } = require("express-validator");

const validateCreateChapter = [
  body("name").isString().notEmpty().withMessage("name is required"),
  body("duration").isNumeric().notEmpty().withMessage("duration is required"),
];

module.exports = {
    validateCreateChapter
  };