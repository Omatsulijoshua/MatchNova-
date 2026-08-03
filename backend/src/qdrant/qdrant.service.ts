import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client?: QdrantClient;
  private readonly collectionName = 'profiles';
  private useMock = true;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('QDRANT_URL');
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');

    if (url) {
      try {
        this.client = new QdrantClient({
          url,
          apiKey: apiKey || undefined,
        });
        this.useMock = false;
        this.logger.log(`Qdrant Client instantiated pointing to ${url}.`);
      } catch (err: unknown) {
        this.logger.error(
          `Failed to initialize Qdrant client, falling back to mock: ${String(err)}`,
        );
        this.useMock = true;
      }
    } else {
      this.logger.warn(
        'QDRANT_URL not configured. Running in vector search MOCK mode.',
      );
    }
  }

  async onModuleInit() {
    if (this.useMock || !this.client) return;

    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName,
      );

      if (!exists) {
        this.logger.log(`Creating Qdrant collection: ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 1536,
            distance: 'Cosine',
          },
        });
      }
    } catch (err: unknown) {
      this.logger.error(
        `Failed to connect/initialize Qdrant collection, falling back to mock mode: ${String(err)}`,
      );
      this.useMock = true;
    }
  }

  // Hash interest tags deterministically into a 1536-dimensional unit vector
  generateInterestsVector(interests: string[]): number[] {
    const vector = new Array<number>(1536).fill(0);
    if (!interests || interests.length === 0) {
      vector[0] = 1.0;
      return vector;
    }

    for (const tag of interests) {
      const lowerTag = tag.toLowerCase().trim();
      let hash = 0;
      for (let i = 0; i < lowerTag.length; i++) {
        hash = (hash << 5) - hash + lowerTag.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % 1536;
      vector[index] += 1.0;
    }

    let sumSq = 0;
    for (const val of vector) {
      sumSq += val * val;
    }
    const magnitude = Math.sqrt(sumSq);
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }
    return vector;
  }

  async upsertProfileVector(
    userId: string,
    interests: string[],
  ): Promise<void> {
    const vector = this.generateInterestsVector(interests);

    if (this.useMock || !this.client) {
      this.logger.log(
        `[MOCK VECTOR DB] Upserted interest vector for user: ${userId}`,
      );
      return;
    }

    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: userId, // Qdrant accepts standard UUID strings directly as IDs
            vector,
            payload: { userId, interests },
          },
        ],
      });
      this.logger.log(
        `Successfully upserted point in Qdrant for userId: ${userId}`,
      );
    } catch (err: unknown) {
      this.logger.error(`Qdrant upsert failed: ${String(err)}`);
    }
  }

  async searchSimilarProfiles(
    userId: string,
    interests: string[],
    limit = 50,
  ): Promise<{ userId: string; score: number }[]> {
    const vector = this.generateInterestsVector(interests);

    if (this.useMock || !this.client) {
      // In mock mode, return a dummy list with scores
      this.logger.log(
        `[MOCK VECTOR DB] Querying similar interests search for userId: ${userId}`,
      );
      return [];
    }

    try {
      const results = await this.client.search(this.collectionName, {
        vector,
        limit,
        filter: {
          must_not: [
            {
              has_id: [userId],
            },
          ],
        },
      });

      return results.map((r) => {
        const idStr = typeof r.id === 'string' ? r.id : String(r.id);
        const payloadUserId = r.payload?.userId;
        return {
          userId: typeof payloadUserId === 'string' ? payloadUserId : idStr,
          score: r.score,
        };
      });
    } catch (err: unknown) {
      this.logger.error(`Qdrant search failed: ${String(err)}`);
      return [];
    }
  }
}
