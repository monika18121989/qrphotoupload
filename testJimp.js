const sharp = require('sharp');
const fs = require('fs');

// Path to the image
const imagePath = 'D:\\cc.png'; // Replace with your image path

sharp(imagePath)
    // .resize(300, 200) // Resize the image
    .toBuffer()
    .then((data) => {
        console.log('Image buffer created successfully');
        // You can process the image buffer here or save it
        fs.writeFileSync('output.jpg', data); // Save as output.jpg
    })
    .catch((err) => {
        console.error('Error processing image:', err);
    });