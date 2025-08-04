import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload: Record<string, any>;
}

export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload: Record<string, any>;
}

export interface QdrantCollection {
  name: string;
  status: string;
  vectors_count: number;
  indexed_vectors_count: number;
  points_count: number;
  segments_count: number;
  config: {
    params: {
      vectors: {
        size: number;
        distance: string;
      };
    };
  };
}

export class QdrantService {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  private collectionName: string;

  constructor() {
    this.baseUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.apiKey = process.env.QDRANT_API_KEY || '';
    this.collectionName = process.env.QDRANT_COLLECTION_NAME || 'workflow_embeddings';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'api-key': this.apiKey }),
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Qdrant API request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        logger.error('Qdrant API request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Qdrant API response:', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('Qdrant API response error:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if Qdrant is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.error('Qdrant health check failed:', error);
      return false;
    }
  }

  /**
   * Get cluster information
   */
  async getClusterInfo(): Promise<any> {
    try {
      const response = await this.client.get('/cluster');
      return response.data.result;
    } catch (error) {
      logger.error('Failed to get cluster info:', error);
      throw new Error('Failed to get Qdrant cluster information');
    }
  }

  /**
   * Get all collections
   */
  async getCollections(): Promise<QdrantCollection[]> {
    try {
      const response = await this.client.get('/collections');
      return response.data.result.collections || [];
    } catch (error) {
      logger.error('Failed to get collections:', error);
      throw new Error('Failed to get collections from Qdrant');
    }
  }

  /**
   * Get collection information
   */
  async getCollection(name: string = this.collectionName): Promise<QdrantCollection | null> {
    try {
      const response = await this.client.get(`/collections/${name}`);
      return response.data.result;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error(`Failed to get collection ${name}:`, error);
      throw new Error(`Failed to get collection ${name}`);
    }
  }

  /**
   * Create a new collection
   */
  async createCollection(
    name: string = this.collectionName,
    vectorSize: number = 1536,
    distance: string = 'Cosine'
  ): Promise<void> {
    try {
      const config = {
        vectors: {
          size: vectorSize,
          distance: distance,
        },
      };

      await this.client.put(`/collections/${name}`, config);
      logger.info('Collection created successfully:', { name, vectorSize, distance });
    } catch (error) {
      logger.error(`Failed to create collection ${name}:`, error);
      throw new Error(`Failed to create collection ${name}`);
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name: string = this.collectionName): Promise<void> {
    try {
      await this.client.delete(`/collections/${name}`);
      logger.info('Collection deleted successfully:', { name });
    } catch (error) {
      logger.error(`Failed to delete collection ${name}:`, error);
      throw new Error(`Failed to delete collection ${name}`);
    }
  }

  /**
   * Ensure collection exists, create if it doesn't
   */
  async ensureCollection(
    name: string = this.collectionName,
    vectorSize: number = 1536,
    distance: string = 'Cosine'
  ): Promise<void> {
    try {
      const collection = await this.getCollection(name);
      if (!collection) {
        await this.createCollection(name, vectorSize, distance);
        logger.info('Collection created automatically:', { name });
      }
    } catch (error) {
      logger.error(`Failed to ensure collection ${name}:`, error);
      throw error;
    }
  }

  /**
   * Insert or update points
   */
  async upsertPoints(
    points: QdrantPoint[],
    collectionName: string = this.collectionName
  ): Promise<void> {
    try {
      await this.ensureCollection(collectionName);
      
      const response = await this.client.put(`/collections/${collectionName}/points`, {
        points,
      });

      logger.info('Points upserted successfully:', { 
        collection: collectionName, 
        count: points.length 
      });
    } catch (error) {
      logger.error(`Failed to upsert points to ${collectionName}:`, error);
      throw new Error(`Failed to upsert points to ${collectionName}`);
    }
  }

  /**
   * Search for similar vectors
   */
  async search(
    vector: number[],
    limit: number = 10,
    scoreThreshold: number = 0.7,
    collectionName: string = this.collectionName,
    filter?: Record<string, any>
  ): Promise<QdrantSearchResult[]> {
    try {
      const searchParams = {
        vector,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
        ...(filter && { filter }),
      };

      const response = await this.client.post(
        `/collections/${collectionName}/points/search`,
        searchParams
      );

      return response.data.result || [];
    } catch (error) {
      logger.error(`Failed to search in ${collectionName}:`, error);
      throw new Error(`Failed to search in ${collectionName}`);
    }
  }

  /**
   * Get points by IDs
   */
  async getPoints(
    ids: (string | number)[],
    collectionName: string = this.collectionName
  ): Promise<QdrantPoint[]> {
    try {
      const response = await this.client.post(
        `/collections/${collectionName}/points`,
        { ids, with_payload: true, with_vector: true }
      );

      return response.data.result || [];
    } catch (error) {
      logger.error(`Failed to get points from ${collectionName}:`, error);
      throw new Error(`Failed to get points from ${collectionName}`);
    }
  }

  /**
   * Delete points by IDs
   */
  async deletePoints(
    ids: (string | number)[],
    collectionName: string = this.collectionName
  ): Promise<void> {
    try {
      await this.client.post(`/collections/${collectionName}/points/delete`, {
        points: ids,
      });

      logger.info('Points deleted successfully:', { 
        collection: collectionName, 
        count: ids.length 
      });
    } catch (error) {
      logger.error(`Failed to delete points from ${collectionName}:`, error);
      throw new Error(`Failed to delete points from ${collectionName}`);
    }
  }

  /**
   * Delete points by filter
   */
  async deletePointsByFilter(
    filter: Record<string, any>,
    collectionName: string = this.collectionName
  ): Promise<void> {
    try {
      await this.client.post(`/collections/${collectionName}/points/delete`, {
        filter,
      });

      logger.info('Points deleted by filter:', { collection: collectionName, filter });
    } catch (error) {
      logger.error(`Failed to delete points by filter from ${collectionName}:`, error);
      throw new Error(`Failed to delete points by filter from ${collectionName}`);
    }
  }

  /**
   * Scroll through points (pagination)
   */
  async scrollPoints(
    offset?: string | number,
    limit: number = 100,
    collectionName: string = this.collectionName,
    filter?: Record<string, any>
  ): Promise<{ points: QdrantPoint[]; nextOffset?: string | number }> {
    try {
      const scrollParams = {
        limit,
        with_payload: true,
        with_vector: true,
        ...(offset && { offset }),
        ...(filter && { filter }),
      };

      const response = await this.client.post(
        `/collections/${collectionName}/points/scroll`,
        scrollParams
      );

      return {
        points: response.data.result.points || [],
        nextOffset: response.data.result.next_page_offset,
      };
    } catch (error) {
      logger.error(`Failed to scroll points in ${collectionName}:`, error);
      throw new Error(`Failed to scroll points in ${collectionName}`);
    }
  }

  /**
   * Count points in collection
   */
  async countPoints(
    collectionName: string = this.collectionName,
    filter?: Record<string, any>
  ): Promise<number> {
    try {
      const countParams = {
        ...(filter && { filter }),
      };

      const response = await this.client.post(
        `/collections/${collectionName}/points/count`,
        countParams
      );

      return response.data.result.count || 0;
    } catch (error) {
      logger.error(`Failed to count points in ${collectionName}:`, error);
      throw new Error(`Failed to count points in ${collectionName}`);
    }
  }

  /**
   * Store workflow embedding
   */
  async storeWorkflowEmbedding(
    workflowId: string,
    embedding: number[],
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const point: QdrantPoint = {
        id: workflowId,
        vector: embedding,
        payload: {
          workflowId,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      };

      await this.upsertPoints([point]);
      logger.info('Workflow embedding stored:', { workflowId });
    } catch (error) {
      logger.error(`Failed to store workflow embedding for ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Find similar workflows
   */
  async findSimilarWorkflows(
    queryEmbedding: number[],
    limit: number = 5,
    scoreThreshold: number = 0.7,
    excludeWorkflowIds: string[] = []
  ): Promise<Array<{
    workflowId: string;
    score: number;
    metadata: Record<string, any>;
  }>> {
    try {
      const filter = excludeWorkflowIds.length > 0 ? {
        must_not: [
          {
            key: 'workflowId',
            match: { any: excludeWorkflowIds },
          },
        ],
      } : undefined;

      const results = await this.search(
        queryEmbedding,
        limit,
        scoreThreshold,
        this.collectionName,
        filter
      );

      return results.map(result => ({
        workflowId: result.payload.workflowId,
        score: result.score,
        metadata: result.payload,
      }));
    } catch (error) {
      logger.error('Failed to find similar workflows:', error);
      throw error;
    }
  }

  /**
   * Delete workflow embedding
   */
  async deleteWorkflowEmbedding(workflowId: string): Promise<void> {
    try {
      await this.deletePoints([workflowId]);
      logger.info('Workflow embedding deleted:', { workflowId });
    } catch (error) {
      logger.error(`Failed to delete workflow embedding for ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(
    collectionName: string = this.collectionName
  ): Promise<{
    pointsCount: number;
    vectorsCount: number;
    indexedVectorsCount: number;
    segmentsCount: number;
    memoryUsage: number;
  }> {
    try {
      const collection = await this.getCollection(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      return {
        pointsCount: collection.points_count,
        vectorsCount: collection.vectors_count,
        indexedVectorsCount: collection.indexed_vectors_count,
        segmentsCount: collection.segments_count,
        memoryUsage: 0, // Would need additional API call for memory usage
      };
    } catch (error) {
      logger.error(`Failed to get collection stats for ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create snapshot of collection
   */
  async createSnapshot(collectionName: string = this.collectionName): Promise<string> {
    try {
      const response = await this.client.post(`/collections/${collectionName}/snapshots`);
      const snapshotName = response.data.result.name;
      logger.info('Snapshot created:', { collection: collectionName, snapshot: snapshotName });
      return snapshotName;
    } catch (error) {
      logger.error(`Failed to create snapshot for ${collectionName}:`, error);
      throw new Error(`Failed to create snapshot for ${collectionName}`);
    }
  }

  /**
   * List snapshots
   */
  async listSnapshots(collectionName: string = this.collectionName): Promise<string[]> {
    try {
      const response = await this.client.get(`/collections/${collectionName}/snapshots`);
      return response.data.result || [];
    } catch (error) {
      logger.error(`Failed to list snapshots for ${collectionName}:`, error);
      throw new Error(`Failed to list snapshots for ${collectionName}`);
    }
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(
    snapshotName: string,
    collectionName: string = this.collectionName
  ): Promise<void> {
    try {
      await this.client.delete(`/collections/${collectionName}/snapshots/${snapshotName}`);
      logger.info('Snapshot deleted:', { collection: collectionName, snapshot: snapshotName });
    } catch (error) {
      logger.error(`Failed to delete snapshot ${snapshotName}:`, error);
      throw new Error(`Failed to delete snapshot ${snapshotName}`);
    }
  }
}