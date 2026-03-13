import { Injectable, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash, createHmac, randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private supabase: SupabaseClient | null = null;
  private bucket: string;
  private s3AccessKey: string | null;
  private s3SecretKey: string | null;
  private s3Endpoint: string | null;
  private s3Region: string;
  private publicBaseUrl: string | null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    this.bucket = process.env.SUPABASE_BUCKET || 'gate-breaker';

    this.s3AccessKey = process.env.SUPABASE_ACCESS_KEY || null;
    this.s3SecretKey = process.env.SUPABASE_SECRET_KEY || null;
    this.s3Endpoint =
      process.env.SUPABASE_S3_ENDPOINT ||
      (url ? `${url.replace(/\/$/, '')}/storage/v1/s3` : null);
    this.s3Region = process.env.SUPABASE_S3_REGION || 'us-east-1';
    this.publicBaseUrl =
      process.env.SUPABASE_PUBLIC_BASE_URL ||
      process.env.SUPABASE_URL ||
      this.derivePublicBaseFromS3Endpoint(this.s3Endpoint);

    if (url && key) {
      this.supabase = createClient(url, key);
    }

    if (!this.supabase && !this.isS3Configured()) {
      console.warn(
        'Supabase credentials not configured. Set SUPABASE_URL + SUPABASE_SERVICE_KEY or SUPABASE_ACCESS_KEY + SUPABASE_SECRET_KEY + SUPABASE_S3_ENDPOINT.',
      );
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('허용되지 않는 파일 형식입니다. (png, jpg, webp, gif)');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('파일 크기가 5MB를 초과합니다.');
    }

    const ext = file.originalname.split('.').pop() || 'png';
    const fileName = `${folder}/${randomUUID()}.${ext.toLowerCase()}`;

    if (this.isS3Configured()) {
      await this.uploadViaS3(fileName, file);
      const publicUrl = this.buildPublicUrl(fileName);
      if (!publicUrl) {
        throw new BadRequestException(
          '이미지 업로드는 성공했지만 공개 URL 생성에 실패했습니다. SUPABASE_PUBLIC_BASE_URL 또는 SUPABASE_URL을 설정해주세요.',
        );
      }
      return publicUrl;
    }

    if (!this.supabase) {
      throw new BadRequestException(
        '업로드 설정이 없습니다. SUPABASE_URL + SUPABASE_SERVICE_KEY 또는 S3 키를 설정해주세요.',
      );
    }

    const { error } = await this.supabase.storage.from(this.bucket).upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (error) {
      throw new BadRequestException(`이미지 업로드 실패: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(fileName);

    return data.publicUrl;
  }

  async deleteImage(imageUrl: string): Promise<void> {
    if (!imageUrl) return;

    try {
      const filePath = this.extractFilePathFromImageUrl(imageUrl);
      if (!filePath) return;

      if (this.isS3Configured()) {
        await this.deleteViaS3(filePath);
        return;
      }

      if (this.supabase) {
        await this.supabase.storage.from(this.bucket).remove([filePath]);
      }
    } catch {
      // 삭제 실패해도 무시
    }
  }

  private isS3Configured(): boolean {
    return Boolean(this.s3AccessKey && this.s3SecretKey && this.s3Endpoint);
  }

  private derivePublicBaseFromS3Endpoint(endpoint: string | null): string | null {
    if (!endpoint) return null;
    return endpoint.replace(/\/storage\/v1\/s3\/?$/, '');
  }

  private buildPublicUrl(filePath: string): string | null {
    if (!this.publicBaseUrl) return null;
    const base = this.publicBaseUrl.replace(/\/$/, '');
    return `${base}/storage/v1/object/public/${this.bucket}/${filePath}`;
  }

  private extractFilePathFromImageUrl(imageUrl: string): string | null {
    const publicBucketPath = `/storage/v1/object/public/${this.bucket}/`;
    const publicIdx = imageUrl.indexOf(publicBucketPath);
    if (publicIdx !== -1) {
      return imageUrl.substring(publicIdx + publicBucketPath.length);
    }

    try {
      const url = new URL(imageUrl);
      const s3Prefix = `/storage/v1/s3/${this.bucket}/`;
      if (url.pathname.startsWith(s3Prefix)) {
        return url.pathname.substring(s3Prefix.length);
      }
    } catch {
      return null;
    }

    return null;
  }

  private async uploadViaS3(filePath: string, file: Express.Multer.File): Promise<void> {
    const endpoint = this.s3Endpoint!;
    const encodedKey = this.encodeObjectKey(filePath);
    const objectUrl = `${endpoint.replace(/\/$/, '')}/${this.bucket}/${encodedKey}`;
    const payloadHash = this.sha256Hex(file.buffer);
    const now = new Date();
    const amzDate = this.toAmzDate(now);
    const dateStamp = this.toDateStamp(now);
    const parsedUrl = new URL(objectUrl);
    const host = parsedUrl.host;

    const headers: Record<string, string> = {
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'content-type': file.mimetype,
    };

    const authorization = this.buildAuthHeader({
      method: 'PUT',
      canonicalUri: parsedUrl.pathname,
      headers,
      payloadHash,
      amzDate,
      dateStamp,
    });

    const res = await fetch(objectUrl, {
      method: 'PUT',
      headers: {
        'content-type': file.mimetype,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        Authorization: authorization,
      },
      body: new Uint8Array(file.buffer),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new BadRequestException(`이미지 업로드 실패(S3): ${body || res.statusText}`);
    }
  }

  private async deleteViaS3(filePath: string): Promise<void> {
    const endpoint = this.s3Endpoint!;
    const encodedKey = this.encodeObjectKey(filePath);
    const objectUrl = `${endpoint.replace(/\/$/, '')}/${this.bucket}/${encodedKey}`;
    const payloadHash = this.sha256Hex('');
    const now = new Date();
    const amzDate = this.toAmzDate(now);
    const dateStamp = this.toDateStamp(now);
    const parsedUrl = new URL(objectUrl);
    const host = parsedUrl.host;

    const headers: Record<string, string> = {
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
    };

    const authorization = this.buildAuthHeader({
      method: 'DELETE',
      canonicalUri: parsedUrl.pathname,
      headers,
      payloadHash,
      amzDate,
      dateStamp,
    });

    await fetch(objectUrl, {
      method: 'DELETE',
      headers: {
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        Authorization: authorization,
      },
    });
  }

  private encodeObjectKey(key: string): string {
    return key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
  }

  private toAmzDate(date: Date): string {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  }

  private toDateStamp(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }

  private sha256Hex(value: string | Buffer): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private hmac(key: Buffer | string, value: string): Buffer {
    return createHmac('sha256', key).update(value, 'utf8').digest();
  }

  private buildAuthHeader(args: {
    method: 'PUT' | 'DELETE';
    canonicalUri: string;
    headers: Record<string, string>;
    payloadHash: string;
    amzDate: string;
    dateStamp: string;
  }): string {
    const { method, canonicalUri, headers, payloadHash, amzDate, dateStamp } = args;
    const canonicalHeaders = Object.entries(headers)
      .map(([k, v]) => [k.toLowerCase().trim(), v.trim()] as const)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}\n`)
      .join('');
    const signedHeaders = Object.keys(headers)
      .map((k) => k.toLowerCase().trim())
      .sort()
      .join(';');
    const canonicalRequest = [
      method,
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.s3Region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256Hex(canonicalRequest),
    ].join('\n');

    const kDate = this.hmac(`AWS4${this.s3SecretKey!}`, dateStamp);
    const kRegion = this.hmac(kDate, this.s3Region);
    const kService = this.hmac(kRegion, 's3');
    const kSigning = this.hmac(kService, 'aws4_request');
    const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

    return `AWS4-HMAC-SHA256 Credential=${this.s3AccessKey!}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }
}
