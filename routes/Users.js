const pool = require("../config/db");
var express = require("express");
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require("express-validator");
const { validateCreateUser } = require("./validator/uservalid");
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

var router = express.Router();

router.get("/:id?", async function (req, res, next) {
  const id = req.params.id;

  try {
    if (id) {
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          status: 400,
          message: "Invalid UUID format",
        });
      }
      const usersResult = await pool.query(
        `
      SELECT 
        users.id,
        users.uid,
        users.login
      FROM 
        users
      WHERE 
        users.uid = $1`,
        [id]
      );

      if (usersResult.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "User not found",
          data: {
            users: usersResult.rows,
          },
        });
      }

      return res.status(200).json({
        status: "200",
        message: "Success",
        data: {
          users: usersResult.rows,
        },
      });
    } else {
      const usersResult = await pool.query(
        `
        SELECT
            users.id,
            users.uid,
            users.login
        FROM 
            users
        ORDER BY id`);

      if (usersResult.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Users not found",
          data: {
            users: usersResult.rows,
          },
        });
      }

      return res.status(200).json({
        status: 200,
        message: "Success",
        data: {
          users: usersResult.rows,
        },
      });
    }
  } catch (error) {
    console.log("Get users error: ", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

router.post("/create/users",validateCreateUser, async function (req, res, next) {
  const data = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 400,
          errors: errors.array(),
        })};
    await pool.query("BEGIN");
    const userID = await pool.query(
      `SELECT MAX(id) AS id
          FROM users`
    );

    const DuplicateLogin = await pool.query(
      ` SELECT login
      FROM users
      WHERE login = $1`,
      [data.login]
    );
    if (DuplicateLogin.rows != 0) {
      return res.status(400).json({
        status: 400,
        message: "Duplicate Login",
      });
    }

    //Checking if there is duplicated UID.
    const DuplicateUID = await pool.query(
      ` SELECT uid
      FROM users
      WHERE uid = $1`,
      [data.uid]
    );
    if (DuplicateUID.rows != 0) {
      return res.status(400).json({
        status: 400,
        message: "Duplicate UID",
      });
    }

    if (DuplicateLogin.rows == 0 && DuplicateUID.rows == 0) {
      const addingUsers = `
      INSERT INTO users (
          id,
          uid,
          login,
          password
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *;`;

      const NewuserResult = await pool.query(addingUsers, [
          userID.rows[0].id + 1,
          uuidv4(),
          data.login,
          data.password
      ]);
      await pool.query("COMMIT");
      return res.status(201).json({
        status: 201,
        message: "Success created new account",
        data: {
          user: NewuserResult.rows
        }
      });
    }
  } catch (error) {
    console.log(`create Users ${error}`);
    await pool.query("ROLLBACK");
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

router.delete("/delete/users/:id", async function (req, res, next) {
    const id = req.params.id;
    try {
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                status: 400,
                message: "Invalid UUID format",
            });
            }
      await pool.query("BEGIN");
      const CheckuserID = await pool.query(
        `SELECT id
         FROM users
         WHERE uid = $1`,
        [id]
      );
      if (CheckuserID.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Users not found",
        });
      } else {
        const DeleteProfile = `
        DELETE
        FROM
          users
        WHERE
          uid = $1
        `;
        await pool.query(DeleteProfile, [id]);
        await pool.query("COMMIT");
        return res.status(200).json({
          status: 204,
          message: "Success Delete account",
        });
      }
    } catch (error) {
      console.log(`Delete Users ${error}`);
      await pool.query("ROLLBACK");
      return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
      });
    }
  });

module.exports = router;