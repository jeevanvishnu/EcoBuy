import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// First, set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const uploadDir = path.join(__dirname, "../public/uploads/product-image");

// Now create the storage configuration using the already defined uploadDir
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Finally create the upload middleware
const upload = multer({ storage: storage });

export default upload;