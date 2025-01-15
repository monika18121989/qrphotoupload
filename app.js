var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const multer = require('multer');
const Jimp = require('jimp');
const QRCode = require('qrcode');
const QRCodeReader = require('qrcode-reader');
const fs = require('fs');
const cors = require('cors');

// Create an Express application
var app = express();
const port = 3000;

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

app.use(cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// Set up multer to handle file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Create a directory for uploads if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Route to generate QR code
app.get('/generate-qr', (req, res) => {
  const data = 'http://localhost:3000/upload-qr'; // URL or data to encode in QR code

  QRCode.toDataURL(data, (err, qrCodeUrl) => {
    if (err) {
      return res.status(500).send('Error generating QR code.');
    }

    res.send(`
      <h1>QR Code</h1>
      <img src="${qrCodeUrl}" alt="QR Code"/>
      <p>Scan this QR code to upload your photo</p>
    `);
  });
});

// Route to handle photo upload and QR code scanning
app.post('/upload', upload.single('photo'), (req, res) => {
  const imagePath = path.join(__dirname, req.file.path);

  // Scan QR code from the uploaded image
  Jimp.read(imagePath, (err, image) => {
    if (err) {
      return res.status(500).send('Error processing image.');
    }

    const qr = new QRCodeReader();
    image.getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
      if (err) {
        return res.status(500).send('Error reading image buffer.');
      }

      qr.decode(buffer, (err, result) => {
        if (err) {
          return res.status(400).send('No QR code found.');
        }

        // Return decoded QR code data and photo upload information
        res.json({
          message: 'File uploaded and QR code scanned successfully!',
          qrData: result.result,
          filePath: req.file.path
        });
      });
    });
  });
});

// Serve the uploaded images (for testing purpose)
app.use('/uploads', express.static('uploads'));

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
