const pool = require("../config/db");
var express = require("express");
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require("express-validator");
const { validateCreateStudio } = require("./validator/studiovalid");
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
      const studiosResult = await pool.query(
        `
      SELECT *
      FROM 
        studios
      WHERE 
        studios.uid = $1`,
        [id]
      );

      if (studiosResult.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Studio not found",
          data: {
            studios: studiosResult.rows,
          },
        });
      }

      return res.status(200).json({
        status: "200",
        message: "Success",
        data: {
            studios: studiosResult.rows,
        },
      });
    } else {
      const studiosResult = await pool.query(
        `
        SELECT *
        FROM 
            studios
        ORDER BY id`);

      if (studiosResult.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Studios not found",
          data: {
            studios: studiosResult.rows,
          },
        });
      }

      return res.status(200).json({
        status: 200,
        message: "Success",
        data: {
            studios: studiosResult.rows,
        },
      });
    }
  } catch (error) {
    console.log("Get studios error: ", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

router.post("/create/studios",validateCreateStudio, async function (req, res, next) {
  const data = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 400,
          errors: errors.array(),
        })};
    await pool.query("BEGIN");
    const StudioID = await pool.query(
      `SELECT MAX(id) AS id
          FROM studios`
    );

    const DuplicateUID = await pool.query(
      ` SELECT uid
      FROM studios
      WHERE uid = $1`,
      [data.uid]
    );
    if (DuplicateUID.rows != 0) {
      return res.status(400).json({
        status: 400,
        message: "Duplicate UID",
      });
    }

    if (DuplicateUID.rows == 0) {
      const addingStudios = `
      INSERT INTO studios (
        id,
        uid,
        name,
        website
      )
      VALUES ($1, $2 ,$3 ,$4)
      RETURNING *;`;

      const NewStudioResult = await pool.query(addingStudios, [
        StudioID.rows[0].id + 1,
        uuidv4(),
        data.name,
        data.website
      ]);
      await pool.query("COMMIT");
      return res.status(201).json({
        status: 201,
        message: "Success created new Studio",
        data: {
            studio: NewStudioResult.rows
          }
      });
    }
  } catch (error) {
    console.log(`create Studios ${error}`);
    await pool.query("ROLLBACK");
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

router.put("/update/studios/:id", async function (req, res, next) {
    const data = req.body;
    const id = req.params.id;
    try {
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
              status: 400,
              message: "Invalid UUID format",
            });
          }
      const CheckStudioID = await pool.query(
        `SELECT id
         FROM studios
         WHERE uid = $1`,
        [id]
      );
      if (CheckStudioID.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Studio not found",
        });
      } else {
        const UpdateStudio = `
          UPDATE
              studios
          SET
              name = $1,
              website = $2
          WHERE
            uid = $3
          RETURNING *
        `;
    
        const updatedResult = await pool.query(UpdateStudio, [
          data.name,
          data.website,
          id
        ]);
        
        return res.status(200).json({
          status: 200,
          message: "Success Update Studio",
          data: {
            studio: updatedResult.rows,
          }
        });
      }    
    } catch (error) {
      console.log(`Update Studio ${error}`);
      await pool.query("ROLLBACK");
      return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
      });
    }
  });

router.delete("/delete/studios/:id", async function (req, res, next) {
    const id = req.params.id;
    try {
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                status: 400,
                message: "Invalid UUID format",
            });
            }
      await pool.query("BEGIN");
      const CheckStudioID = await pool.query(
        `SELECT id
         FROM studios
         WHERE uid = $1`,
        [id]
      );
      if (CheckStudioID.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Studios not found",
        });
      } else {
        const DeleteStudio = `
        DELETE
        FROM
            studios
        WHERE
            uid = $1
        `;
        await pool.query(DeleteStudio, [id]);

        await pool.query(
            `UPDATE animes SET studioid = NULL WHERE studioid = $1`,
            [id]
        );

        await pool.query(
            `UPDATE chapters SET studioid = NULL WHERE studioid = $1`,
            [id]
        );

        await pool.query("COMMIT");
        return res.status(200).json({
          status: 204,
          message: "Success Delete studio",
        });
      }
    } catch (error) {
      console.log(`Delete Studio ${error}`);
      await pool.query("ROLLBACK");
      return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
      });
    }
  });

module.exports = router;