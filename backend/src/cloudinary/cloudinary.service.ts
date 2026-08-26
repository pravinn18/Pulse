import { Injectable, BadRequestException } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'pulse_posts',
  ): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const isImage = file.mimetype.match(
      /^image\/(jpeg|png|jpg|webp|gif|svg\+xml)$/,
    );
    const isVideo = file.mimetype.match(
      /^video\/(mp4|webm|quicktime|x-matroska|ogg|mov)$/,
    );

    if (!isImage && !isVideo) {
      throw new BadRequestException(
        'Only image files (jpeg, png, webp, gif) or video files (mp4, webm, mov) are allowed',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          quality: 'auto:good',
          fetch_format: 'auto',
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary upload failed'));
          resolve(result);
        },
      );

      streamifier
        .createReadStream(file.buffer, { highWaterMark: 1024 * 1024 * 2 })
        .pipe(uploadStream);
    });
  }
}
