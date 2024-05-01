const pool = require("../config/db");
var express = require("express");
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require("express-validator");
const { validateCreateChapter } = require("./validator/chapvalid");
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
      const chaptersResult = await pool.query(
        `
      SELECT *
      FROM 
        chapters
      WHERE 
        chapters.uid = $1`,
        [id]
      );

      if (chaptersResult.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Chapter not found",
          data: {
            studios: animesResult.rows,
          },
        });
      }

      return res.status(200).json({
        status: "200",
        message: "Success",
        data: {
            studios: chaptersResult.rows,
        },
      });
    } else {
      const chaptersResult = await pool.query(
        `
        SELECT *
        FROM 
          chapters
        ORDER BY id`);

      if (chaptersResult.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Chapters not found",
          data: {
            studios: chaptersResult.rows,
          },
        });
      }

      return res.status(200).json({
        status: 200,
        message: "Success",
        data: {
            studios: chaptersResult.rows,
        },
      });
    }
  } catch (error) {
    console.log("Get chapters error: ", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

router.post("/create/chapters",validateCreateChapter, async function (req, res, next) {
  const data = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 400,
          errors: errors.array(),
        })};
    await pool.query("BEGIN");
    const ChapID = await pool.query(
      `SELECT MAX(id) AS id
          FROM chapters`
    );

    const DuplicateUID = await pool.query(
      ` SELECT uid
      FROM chapters
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
      const addingChapters = `
      INSERT INTO chapters (
        id,
        uid,
        name,
        studioid,
        animeid,
        duration
      )
      VALUES ($1, $2 ,$3 ,$4 ,$5 ,$6)
      RETURNING *;`;
      const NewChapResult = await pool.query(addingChapters, [
        ChapID.rows[0].id + 1,
        uuidv4(),
        data.name,
        data.studioid,
        data.animeid,
        data.duration
      ]);
      await pool.query("COMMIT");
      return res.status(201).json({
        status: 201,
        message: "Success created new Chapter",
        data: {
            chapter: NewChapResult.rows
          }
      });
    }
  } catch (error) {
    console.log(`create Chapters ${error}`);
    await pool.query("ROLLBACK");
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

router.put("/update/chapters/:id", async function (req, res, next) {
    const data = req.body;
    const id = req.params.id;
    try {
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
              status: 400,
              message: "Invalid UUID format",
            });
          }
      const CheckChapID = await pool.query(
        `SELECT id
         FROM chapters
         WHERE uid = $1`,
        [id]
      );
      if (CheckChapID.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Chapter not found",
        });
      } else {
        const UpdateChapter = `
          UPDATE
            chapters
          SET
              name = $1,
              studioid = $2,
              animeid = $3,
              duration = $4
          WHERE
            uid = $5
          RETURNING *
        `;
    
        const updatedResult = await pool.query(UpdateChapter, [
          data.name,
          data.studioid,
          data.animeid,
          data.duration,
          id
        ]);
        
        return res.status(200).json({
          status: 200,
          message: "Success Update Chapter",
          data: {
            studio: updatedResult.rows,
          }
        });
      }    
    } catch (error) {
      console.log(`Update Chapter ${error}`);
      await pool.query("ROLLBACK");
      return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
      });
    }
  });

router.delete("/delete/chapters/:id", async function (req, res, next) {
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
         FROM chapters
         WHERE uid = $1`,
        [id]
      );
      if (CheckuserID.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Chapter not found",
        });
      } else {
        const DeleteChapter = `
        DELETE
        FROM
            chapters
        WHERE
            uid = $1
        `;
        await pool.query(DeleteChapter, [id]);
        await pool.query("COMMIT");
        return res.status(200).json({
          status: 204,
          message: "Success Delete Chapter",
        });
      }
    } catch (error) {
      console.log(`Delete chapters ${error}`);
      await pool.query("ROLLBACK");
      return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
      });
    }
  });

module.exports = router;