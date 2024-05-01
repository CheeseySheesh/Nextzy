require('dotenv').config();

var express = require("express");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/Users");
var ChapterRouter = require("./routes/Chapters");
var StudioRouter = require("./routes/Studios");
var AnimeRouter = require("./routes/Animes");


var app = express();

app.use(express.json());

app.use(function (req, res, next) {
	res.setTimeout(5000, function () {
		console.log("Request has timed out.");
		res.status(408).json({
			status: 400,
			message: "Request Timeout",
		});
	});
	next();
});

app.listen(process.env.PORT, ()=>{
    console.log("Server is now listening to the port");
})

app.use("/", indexRouter);
app.use("/user", usersRouter);
app.use("/chapter", ChapterRouter);
app.use("/studio", StudioRouter);
app.use("/anime", AnimeRouter);



module.exports = app;
