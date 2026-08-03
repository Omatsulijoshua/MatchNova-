import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QdrantService } from '../qdrant/qdrant.service';
import {
  CreateProfileDto,
  UpdateProfileDto,
  ProfileSearchQueryDto,
} from './dto/profile.dto';
import { Prisma } from '@prisma/client';

export interface RawSearchProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  gender: string;
  bio: string | null;
  photos: string[];
  interests: string[];
  locationFuzzyLat: number | null;
  locationFuzzyLng: number | null;
  distance: number;
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrant: QdrantService,
  ) {}

  // Round coordinates to 2 decimal places (approx. 1.1km / 0.7mi precision)
  private blurCoordinate(coord: number): number {
    return Math.round(coord * 100) / 100;
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  async createProfile(userId: string, dto: CreateProfileDto) {
    const existing = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new BadRequestException('Profile already exists for this user');
    }

    const fuzzyLat = this.blurCoordinate(dto.locationLat);
    const fuzzyLng = this.blurCoordinate(dto.locationLng);

    const profile = await this.prisma.profile.create({
      data: {
        userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthDate: new Date(dto.birthDate),
        gender: dto.gender,
        sexualOrientation: dto.sexualOrientation,
        bio: dto.bio,
        photos: dto.photos,
        interests: dto.interests,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
        locationFuzzyLat: fuzzyLat,
        locationFuzzyLng: fuzzyLng,
      },
    });

    await this.qdrant.upsertProfileVector(userId, dto.interests);
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const updateData: Prisma.ProfileUpdateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      gender: dto.gender,
      sexualOrientation: dto.sexualOrientation,
      bio: dto.bio,
      photos: dto.photos,
      interests: dto.interests,
      locationLat: dto.locationLat,
      locationLng: dto.locationLng,
    };

    if (dto.birthDate) {
      updateData.birthDate = new Date(dto.birthDate);
    }

    if (dto.locationLat !== undefined && dto.locationLng !== undefined) {
      updateData.locationFuzzyLat = this.blurCoordinate(dto.locationLat);
      updateData.locationFuzzyLng = this.blurCoordinate(dto.locationLng);
    }

    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: updateData,
    });

    if (dto.interests) {
      await this.qdrant.upsertProfileVector(userId, dto.interests);
    }

    return updatedProfile;
  }

  async searchProfiles(userId: string, query: ProfileSearchQueryDto) {
    const userProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!userProfile || !userProfile.locationLat || !userProfile.locationLng) {
      throw new BadRequestException(
        'User profile must have a valid location to perform search.',
      );
    }

    const centerLat = userProfile.locationLat;
    const centerLng = userProfile.locationLng;
    const radiusMiles = query.radius;

    // Calculate approximate bounding box in degrees to utilize DB indexes
    const deltaLat = radiusMiles / 69.0;
    const cosLat = Math.cos((centerLat * Math.PI) / 180.0);
    // Protect division by zero if close to poles
    const deltaLng =
      cosLat > 0.001 ? radiusMiles / (69.0 * cosLat) : radiusMiles / 69.0;

    const minLat = centerLat - deltaLat;
    const maxLat = centerLat + deltaLat;
    const minLng = centerLng - deltaLng;
    const maxLng = centerLng + deltaLng;

    // Compute age limit date thresholds
    const now = new Date();
    const minBirthDate = new Date(
      now.getFullYear() - query.ageMax - 1,
      now.getMonth(),
      now.getDate(),
    );
    const maxBirthDate = new Date(
      now.getFullYear() - query.ageMin,
      now.getMonth(),
      now.getDate(),
    );

    // Build composed WHERE clause using Prisma.Sql segments
    const whereConditions: Prisma.Sql[] = [
      Prisma.sql`"userId" != ${userId}::uuid`,
      Prisma.sql`"locationLat" BETWEEN ${minLat} AND ${maxLat}`,
      Prisma.sql`"locationLng" BETWEEN ${minLng} AND ${maxLng}`,
      Prisma.sql`"birthDate" BETWEEN ${minBirthDate} AND ${maxBirthDate}`,
    ];

    if (query.gender) {
      whereConditions.push(Prisma.sql`"gender" = ${query.gender}`);
    }

    const whereClause = Prisma.join(whereConditions, ' AND ');

    // Run highly optimized SQL query using bounding box filters followed by exact Haversine calculation
    const results = await this.prisma.$queryRaw<RawSearchProfile[]>`
      SELECT 
        id, "userId", "firstName", "lastName", "birthDate", "gender", "bio", "photos", "interests", "locationFuzzyLat", "locationFuzzyLng",
        (3959 * acos(
          cos(radians(${centerLat})) * cos(radians("locationLat")) * cos(radians("locationLng") - radians(${centerLng})) +
          sin(radians(${centerLat})) * sin(radians("locationLat"))
        )) AS distance
      FROM "Profile"
      WHERE ${whereClause}
      ORDER BY distance ASC
      LIMIT 50
    `;

    return results;
  }
}
