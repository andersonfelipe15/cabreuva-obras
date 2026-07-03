import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

// Abstração de armazenamento: disco local (padrão) ou S3/MinIO.
// Troca-se pelo S3/MinIO apenas definindo STORAGE_DRIVER=s3 no .env.
@Injectable()
export class StorageService {
  private driver = process.env.STORAGE_DRIVER || 'local';
  private localDir = path.join(process.cwd(), 'storage', 'uploads');
  private bucket = process.env.S3_BUCKET || 'documentos';
  private s3?: S3Client;

  constructor() {
    if (this.driver === 's3') {
      this.s3 = new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY || '',
          secretAccessKey: process.env.S3_SECRET_KEY || '',
        },
        forcePathStyle: true, // necessário para MinIO
      });
    } else {
      fs.mkdirSync(this.localDir, { recursive: true });
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.driver === 's3') {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } else {
      fs.writeFileSync(path.join(this.localDir, key), body);
    }
  }

  async get(key: string): Promise<Buffer> {
    if (this.driver === 's3') {
      const res = await this.s3!.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bytes = await (res.Body as any).transformToByteArray();
      return Buffer.from(bytes);
    }
    return fs.readFileSync(path.join(this.localDir, key));
  }
}
