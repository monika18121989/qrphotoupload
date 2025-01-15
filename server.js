const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const jsQR = require('jsqr');

// Create an Express application
const app = express();
const port = 5000;

// Enable CORS (optional for development)
app.use(cors());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

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

app.get('/',(req,res)=>{
    res.render('index',{title: 'Welcome to Render'});
})

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

app.get("/upload-qr",(req,res)=>{
    res.render('uploadpage');
})

// Route to handle photo upload and QR code scanning
app.post('/upload', upload.single('photo'), async (req, res) => {
    const imagePath = path.join(__dirname, req.file.path);
    console.log(imagePath);
    console.log("--------");
    // Scan QR code from the uploaded image
    try {
        if (!req.file) {
            return res.status(400).send('No image uploaded.');
        }

        // Read the image with Sharp
        const image = await sharp(imagePath).raw().toBuffer();
        const width = await sharp(imagePath).metadata().then((meta) => meta.width);
        const height = await sharp(imagePath).metadata().then((meta) => meta.height);

        // Scan the image for QR code using jsQR
        const code = jsQR(image, width, height);
        if (code) {
            return res.json({
                message: 'QR code scanned successfully!',
                qrData: code.data,
                filePath: req.file.path
            });
        } else {
            return res.status(400).send('No QR code found.');
        }

    } catch (err) {
        console.error('Error processing image:', err);
        res.status(500).send('Error processing image.');
    }
});

// Serve the uploaded images (for testing purpose)
app.use('/uploads', express.static('uploads'));

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

