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

var imageArray = [];

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

    const protocol = req.protocol;
    const host = req.get('host');
    const baseURL = `${protocol}://${host}`;
    const data = `${baseURL}/upload-qr`; // URL or data to encode in QR code

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

app.get("/photos",(req,res)=>{
    res.render('photos');
})

app.get("/getphotos",(req,res)=>{
    res.json(imageArray);
})

// Route to handle photo upload and QR code scanning
app.post('/upload', upload.array('photo',10), async (req, res) => {
    console.log(req.files);
    console.log(req.files.length);
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No images uploaded.');
    }
    if(req.files.length > 10){
        return res.status(400).send('Only 10 photos are allowed');
    }

    let qrResults = [];

    try{
        req.files.forEach(async(file) => {
            console.log(file);
            const imagePath = path.join(__dirname, file.path);

            // Process each image with sharp
            const imageBuffer = await sharp(imagePath)
                .resize(800) // Optional: Resize for better performance
                .greyscale() // Convert to grayscale for QR code scanning
                .raw()
                .toBuffer();

            // Get metadata (width, height) for QR scanning
            const { width, height } = await sharp(imagePath).metadata();
            // Log metadata for debugging
            console.log('Image Width:', width, 'Height:', height);
            // Create ImageData object for jsQR
            const imageData = {
                width: width,
                height: height,
                data: imageBuffer
            };
            // Scan the image for a QR code
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                qrResults.push({
                    fileName: file.filename,
                    qrData: code.data // Extracted QR code data
                });
            } else {
                qrResults.push({
                    fileName: file.filename,
                    message: 'No QR code found.'
                });
            }
            // Return results for all uploaded images
            return res.json({
                message: 'QR code scanning completed.',
                results: qrResults
            });
        })
    }catch(error){
        console.error('Error processing images:', error);
        return res.status(500).send('Error processing images.');
    }
});

// Serve the uploaded images (for testing purpose)
app.use('/uploads', express.static('uploads'));

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

