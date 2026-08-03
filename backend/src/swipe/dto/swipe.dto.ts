import { IsNotEmpty, IsUUID, IsEnum } from 'class-validator';

export enum SwipeType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
  SUPERLIKE = 'SUPERLIKE',
}

export class CreateSwipeDto {
  @IsNotEmpty()
  @IsUUID()
  targetUserId!: string;

  @IsNotEmpty()
  @IsEnum(SwipeType, {
    message: 'type must be LIKE, DISLIKE, or SUPERLIKE',
  })
  type!: SwipeType;
}
