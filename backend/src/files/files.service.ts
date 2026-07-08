import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async upload(userId: string, file: Express.Multer.File) {
    // O multer entrega originalname em latin1; reinterpreta como UTF-8 para
    // preservar acentos (evita "AprovaÃ§Ã£o" no lugar de "Aprovação").
    const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = (filename.split('.').pop() || 'bin')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8);
    const key = `${randomUUID()}.${ext}`;
    await this.storage.put(key, file.buffer, file.mimetype);
    const rec = await this.prisma.file.create({
      data: {
        key,
        filename,
        mimeType: file.mimetype,
        size: file.size,
        uploadedById: userId,
      },
    });
    return {
      id: rec.id,
      filename: rec.filename,
      mimeType: rec.mimeType,
      size: rec.size,
    };
  }

  async getWithBytes(id: string) {
    const rec = await this.prisma.file.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Arquivo não encontrado');
    const buffer = await this.storage.get(rec.key);
    return { rec, buffer };
  }
}
