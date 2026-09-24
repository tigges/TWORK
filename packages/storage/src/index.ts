import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createHash } from 'node:crypto'
import { Readable } from 'node:stream'

export interface StorageConfig {
  endpoint:   string
  region:     string
  bucket:     string
  accessKey:  string
  secretKey:  string
  publicUrl?: string  // base URL for pre-signed links; defaults to endpoint
}

export interface BlobMeta {
  sha256:      string
  sizeBytes:   number
  contentType: string
  storageKey:  string
}

export class StorageClient {
  private readonly s3:    S3Client
  private readonly bucket: string

  constructor(private readonly config: StorageConfig) {
    this.bucket = config.bucket
    this.s3 = new S3Client({
      endpoint:        config.endpoint,
      region:          config.region,
      credentials:     { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
      forcePathStyle:  true,  // required for MinIO
    })
  }

  /**
   * Content-addressed upload.
   * If a blob with this sha256 already exists in the bucket it is not re-uploaded.
   * Returns the metadata the caller needs to store in the blobs table.
   */
  async put(
    body:        Buffer | Readable,
    contentType: string,
    projectId:   string,
  ): Promise<BlobMeta> {
    const buf = Buffer.isBuffer(body) ? body : await streamToBuffer(body)
    const sha256     = createHash('sha256').update(buf).digest('hex')
    const storageKey = `${projectId}/${sha256}`

    // Check existence before uploading (idempotent dedup)
    const exists = await this.exists(storageKey)
    if (!exists) {
      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket:      this.bucket,
          Key:         storageKey,
          Body:        buf,
          ContentType: contentType,
        },
      })
      await upload.done()
    }

    return { sha256, sizeBytes: buf.byteLength, contentType, storageKey }
  }

  async get(storageKey: string): Promise<Readable> {
    const res = await this.s3.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key:    storageKey,
    }))
    if (!(res.Body instanceof Readable)) throw new Error('Unexpected S3 body type')
    return res.Body
  }

  async getBuffer(storageKey: string): Promise<Buffer> {
    return streamToBuffer(await this.get(storageKey))
  }

  async presignedUrl(storageKey: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      { expiresIn: expiresInSeconds },
    )
  }

  async delete(storageKey: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }))
  }

  private async exists(storageKey: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }))
      return true
    } catch {
      return false
    }
  }
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    stream.on('end',  () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}
