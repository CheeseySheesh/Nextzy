const pool = require("../config/db");
var express = require("express");
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require("express-validator");
const { validateCreateAnime } = require("./validator/animevalid");
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
      const animesResult = await pool.query(
        `
      SELECT *
      FROM 
        animes
      WHERE 
        animes.uid = $1`,
        [id]
      );

      if (animesResult.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Anime not found",
          data: {
            studios: animesResult.rows,
          },
        });
      }

      return res.status(200).json({
        status: "200",
        message: "Success",
        data: {
            studios: animesResult.rows,
        },
      });
    } else {
      const animesResult = await pool.query(
        `
        SELECT *
        FROM 
            animes
        ORDER BY id`);

      if (animesResult.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Animes not found",
          data: {
            studios: animesResult.rows,
          },
        });
      }

      return res.status(200).json({
        status: 200,
        message: "Success",
        data: {
            studios: animesResult.rows,
        },
      });
    }
  } catch (error) {
    console.log("Get animes error: ", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

router.post("/create/animes",validateCreateAnime, async function (req, res, next) {
  const data = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 400,
          errors: errors.array(),
        })};
    await pool.query("BEGIN");
    const AnimeID = await pool.query(
      `SELECT MAX(id) AS id
          FROM animes`
    );

    const DuplicateUID = await pool.query(
      ` SELECT uid
      FROM animes
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
      const addingAnimes = `
      INSERT INTO animes (
        id,
        uid,
        name,
        year,
        studioid
      )
      VALUES ($1, $2 ,$3 ,$4 ,$5)
      RETURNING *;`;
      const NewAnimeResult = await pool.query(addingAnimes, [
        AnimeID.rows[0].id + 1,
        uuidv4(),
        data.name,
        data.year,
        data.studioid
      ]);
      await pool.query("COMMIT");
      return res.status(201).json({
        status: 201,
        message: "Success created new Anime",
        data: {
            anime: NewAnimeResult.rows
          }
      });
    }
  } catch (error) {
    console.log(`create Animes ${error}`);
    await pool.query("ROLLBACK");
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

router.put("/update/animes/:id", async function (req, res, next) {
    const data = req.body;
    const id = req.params.id;
    try {
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
              status: 400,
              message: "Invalid UUID format",
            });
          }
      const CheckAnimeID = await pool.query(
        `SELECT id
         FROM animes
         WHERE uid = $1`,
        [id]
      );
      if (CheckAnimeID.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Anime not found",
        });
      } else {
        const UpdateAnime = `
          UPDATE
              animes
          SET
              name = $1,
              year = $2,
              studioid = $3
          WHERE
            uid = $4
          RETURNING *
        `;
    
        const updatedResult = await pool.query(UpdateAnime, [
          data.name,
          data.year,
          data.studioid,
          id
        ]);
        
        return res.status(200).json({
          status: 200,
          message: "Success Update Anime",
          data: {
            studio: updatedResult.rows,
          }
        });
      }    
    } catch (error) {
      console.log(`Update Anime ${error}`);
      await pool.query("ROLLBACK");
      return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
      });
    }
  });

router.delete("/delete/animes/:id", async function (req, res, next) {
    const id = req.params.id;
    try {
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                status: 400,
                message: "Invalid UUID format",
            });
            }
      await pool.query("BEGIN");
      const CheckAnimeID = await pool.query(
        `SELECT id
         FROM animes
         WHERE uid = $1`,
        [id]
      );
      if (CheckAnimeID.rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: "Anime not found",
        });
      } else {
        const DeleteAnime = `
        DELETE
        FROM
            animes
        WHERE
            uid = $1
        `;
        await pool.query(DeleteAnime, [id]);

        await pool.query(
            `UPDATE chapters SET animeid = NULL WHERE animeid = $1`,
            [id]
        );

        await pool.query("COMMIT");
        return res.status(200).json({
          status: 204,
          message: "Success Delete anime",
        });
      }
    } catch (error) {
      console.log(`Delete animes ${error}`);
      await pool.query("ROLLBACK");
      return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
      });
    }
  });

module.exports = router;