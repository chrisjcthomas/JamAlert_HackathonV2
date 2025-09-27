
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import { log } from '../utils/logger';

const UPLOAD_DIR = path.join(__dirname, '../..//uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

export class ImageService {
  /**
   * Processes and saves an uploaded image.
   *
   * @param {Buffer} imageBuffer The buffer of the image to process.
   * @returns {Promise<{ url: string; thumbnailUrl: string } | null>} The URLs of the saved image and its thumbnail, or null on failure.
   */
  async processAndSaveImage(imageBuffer: Buffer): Promise<{ url: string; thumbnailUrl: string } | null> {
    try {
      const fileName = `${uuidv4()}.webp`;
      const filePath = path.join(UPLOAD_DIR, fileName);
      const thumbnailPath = path.join(THUMBNAIL_DIR, fileName);

      // Ensure directories exist
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await fs.mkdir(THUMBNAIL_DIR, { recursive: true });

      // Save the original image in webp format
      await sharp(imageBuffer)
        .webp({ quality: 80 })
        .toFile(filePath);

      // Create and save a thumbnail
      await sharp(imageBuffer)
        .resize(200, 200, { fit: 'inside' })
        .webp({ quality: 70 })
        .toFile(thumbnailPath);

      // In a real application, these URLs would point to a cloud storage location.
      const url = `/uploads/${fileName}`;
      const thumbnailUrl = `/uploads/thumbnails/${fileName}`;

      return { url, thumbnailUrl };
    } catch (error) {
      log.error('Error processing and saving image:', error);
      return null;
    }
  }
}
