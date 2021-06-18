import express from "express";
import basicAuth from "express-basic-auth";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

class APIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const MB = 1000000;

const ACCEPTED_FILE_TYPES = {
  "image/jpeg": "jpeg",
  "image/png": "png",
};

const storage = multer.diskStorage({
  destination: process.env.UPLOAD_PATH,
  filename: (req, file, cb) => {
    const filename = `${uuidv4()}.${ACCEPTED_FILE_TYPES[file.mimetype]}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  console.log("File:", file.mimetype);
  if (!Object.keys(ACCEPTED_FILE_TYPES).includes(file.mimetype)) {
    cb(null, false, new APIError("This mimetype is not allowed.", 400));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * MB, // 10 megabytes
  },
  fileFilter,
});

const main = async () => {
  const app = express();
  app.use(express.static(process.env.UPLOAD_PATH));

  app.post(
    "/",
    basicAuth({
      users: { [process.env.BA_USERNAME]: process.env.BA_PASSWORD },
    }),
    upload.single("image"),
    (req, res) => {
      res.json({
        status: "success",
        data: {
          image: {
            url: `${process.env.HOST_URL}/${req.file.filename}`,
          },
        },
      });
    }
  );

  // Global error handler
  app.use((err, req, res, next) => {
    const statusCode = err instanceof APIError ? err.statusCode : 500;
    res.status(statusCode).json({
      status: "error",
      message: err.message,
    });
  });

  app.listen(5000, () => {
    console.log("Listening at http://localhost:5000");
  });
};

main();
