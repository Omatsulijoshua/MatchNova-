import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { CreateSwipeDto, SwipeType as DtoSwipeType } from './dto/swipe.dto';
import { ProfileService } from '../profile/profile.service';
import { SwipeType as PrismaSwipeType } from '@prisma/client';

@Injectable()
export class SwipeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrant: QdrantService,
    private readonly profileService: ProfileService,
  ) {}

  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
  }

  private mapDtoTypeToPrisma(type: DtoSwipeType): PrismaSwipeType {
    if (type === DtoSwipeType.LIKE) return PrismaSwipeType.LIKE;
    if (type === DtoSwipeType.DISLIKE) return PrismaSwipeType.PASS;
    return PrismaSwipeType.SUPERLIKE;
  }

  async recordSwipe(userId: string, dto: CreateSwipeDto) {
    if (userId === dto.targetUserId) {
      throw new BadRequestException('You cannot swipe on your own profile.');
    }

    // Verify target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found.');
    }

    const prismaType = this.mapDtoTypeToPrisma(dto.type);

    // Enforce limits in last 24 hours based on active subscription tier
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        expiresAt: { gte: new Date() },
      },
    });

    const tier = activeSub?.tier || null;

    let maxLikes = 100;
    let maxSuperlikes = 1;

    if (tier === 'PREMIUM') {
      maxLikes = Infinity;
      maxSuperlikes = 5;
    } else if (tier === 'ELITE') {
      maxLikes = Infinity;
      maxSuperlikes = Infinity;
    }

    if (prismaType === PrismaSwipeType.SUPERLIKE) {
      if (maxSuperlikes !== Infinity) {
        const superlikeCount = await this.prisma.swipe.count({
          where: {
            senderId: userId,
            type: PrismaSwipeType.SUPERLIKE,
            createdAt: { gte: oneDayAgo },
          },
        });
        if (superlikeCount >= maxSuperlikes) {
          throw new BadRequestException(
            `Daily Superlike limit reached. Upgrade to a higher tier for more!`,
          );
        }
      }
    } else if (prismaType === PrismaSwipeType.LIKE) {
      if (maxLikes !== Infinity) {
        const likeCount = await this.prisma.swipe.count({
          where: {
            senderId: userId,
            type: PrismaSwipeType.LIKE,
            createdAt: { gte: oneDayAgo },
          },
        });
        if (likeCount >= maxLikes) {
          throw new BadRequestException(
            `Daily Like limit reached. Upgrade to premium for unlimited swipes!`,
          );
        }
      }
    }

    // Record or update the swipe in PostgreSQL
    const swipe = await this.prisma.swipe.upsert({
      where: {
        senderId_receiverId: {
          senderId: userId,
          receiverId: dto.targetUserId,
        },
      },
      update: {
        type: prismaType,
        createdAt: new Date(),
      },
      create: {
        senderId: userId,
        receiverId: dto.targetUserId,
        type: prismaType,
      },
    });

    // Check for reciprocal match
    if (
      prismaType === PrismaSwipeType.LIKE ||
      prismaType === PrismaSwipeType.SUPERLIKE
    ) {
      const reciprocalSwipe = await this.prisma.swipe.findFirst({
        where: {
          senderId: dto.targetUserId,
          receiverId: userId,
          type: { in: [PrismaSwipeType.LIKE, PrismaSwipeType.SUPERLIKE] },
        },
      });

      if (reciprocalSwipe) {
        // Create an active Match record
        // Sort IDs to prevent duplicate Match records (user1Id < user2Id)
        const [user1Id, user2Id] =
          userId < dto.targetUserId
            ? [userId, dto.targetUserId]
            : [dto.targetUserId, userId];

        const match = await this.prisma.match.upsert({
          where: {
            user1Id_user2Id: {
              user1Id,
              user2Id,
            },
          },
          update: {
            createdAt: new Date(),
          },
          create: {
            user1Id,
            user2Id,
          },
        });

        return { matched: true, matchId: match.id, swipe };
      }
    }

    return { matched: false, swipe };
  }

  async getRecommendationDeck(userId: string) {
    // Get current user's profile
    const userProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!userProfile || !userProfile.locationLat || !userProfile.locationLng) {
      throw new BadRequestException(
        'Your profile must have a valid location to get recommendations.',
      );
    }

    // Get list of users already swiped
    const swipedRecords = (await this.prisma.swipe.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
    })) as { receiverId: string }[];

    const swipedIds = swipedRecords.map((s) => s.receiverId);

    // Exclude own user ID and already swiped user IDs
    const excludeIds = [userId, ...swipedIds];

    // Find nearby candidate profiles from database using standard radius limits
    // Radius default to 50 miles for recommendations deck
    const centerLat = userProfile.locationLat;
    const centerLng = userProfile.locationLng;
    const radiusMiles = 50;

    const deltaLat = radiusMiles / 69.0;
    const cosLat = Math.cos((centerLat * Math.PI) / 180.0);
    const deltaLng =
      cosLat > 0.001 ? radiusMiles / (69.0 * cosLat) : radiusMiles / 69.0;

    const minLat = centerLat - deltaLat;
    const maxLat = centerLat + deltaLat;
    const minLng = centerLng - deltaLng;
    const maxLng = centerLng + deltaLng;

    const candidates = await this.prisma.profile.findMany({
      where: {
        userId: { notIn: excludeIds },
        locationLat: { gte: minLat, lte: maxLat },
        locationLng: { gte: minLng, lte: maxLng },
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        gender: true,
        bio: true,
        photos: true,
        interests: true,
        locationFuzzyLat: true,
        locationFuzzyLng: true,
      },
      take: 100,
    });

    // Compute similarity score for each candidate using interest vectors
    const userVector = this.qdrant.generateInterestsVector(
      userProfile.interests,
    );

    const scoredCandidates = candidates.map((cand) => {
      const candVector = this.qdrant.generateInterestsVector(cand.interests);
      const similarityScore = this.calculateCosineSimilarity(
        userVector,
        candVector,
      );

      return {
        ...cand,
        matchScore: Math.round(similarityScore * 100), // convert to percentage
      };
    });

    // Sort by match score descending
    return scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
  }

  async getMatches(userId: string) {
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    });

    const userSelect = {
      id: true,
      email: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          photos: true,
        },
      },
    };

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    const result = await Promise.all(
      matches.map(async (m) => {
        const opponentId = m.user1Id === userId ? m.user2Id : m.user1Id;
        const opponent = await this.prisma.user.findUnique({
          where: { id: opponentId },
          select: userSelect,
        });

        return {
          id: m.id,
          user1Id: m.user1Id,
          user2Id: m.user2Id,
          createdAt: m.createdAt,
          user1: m.user1Id === userId ? currentUser : opponent,
          user2: m.user2Id === userId ? currentUser : opponent,
        };
      }),
    );

    return result;
  }
}
