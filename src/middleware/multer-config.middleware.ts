import { diskStorage } from 'multer';
import { extname } from 'path';

const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const allowedDocuments = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const productImagesMulterConfig = {
  storage: diskStorage({
    destination: './images',
    filename: (req, file, cb) => {
      const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const originalName = file.originalname.replace(/\s+/g, '_');
      cb(null, `${uniquePrefix}-${originalName}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
};

export const profileImageMulterConfig = {
  storage: diskStorage({
    destination: './images/profileImages',
    filename: (req, file, cb) => {
      const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const originalName = file.originalname.replace(/\s+/g, '_');
      cb(null, `profile-${uniquePrefix}-${originalName}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

// New config for leave attachments
export const leaveAttachmentMulterConfig = {
  storage: diskStorage({
    destination: './images/leaveAttachments',
    filename: (req, file, cb) => {
      const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const originalName = file.originalname.replace(/\s+/g, '_');
      cb(null, `leave-${uniquePrefix}-${originalName}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allAllowed = [...allowedMimeTypes, ...allowedDocuments];
    if (allAllowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF/Word documents are allowed!'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
};
