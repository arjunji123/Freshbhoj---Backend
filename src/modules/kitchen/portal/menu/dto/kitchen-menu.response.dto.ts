import { ApiProperty } from '@nestjs/swagger';
import { GoalTag } from '@prisma/client';

export class NutritionAnalysisResultDto {
  @ApiProperty({ example: 420 })
  calories: number;

  @ApiProperty({ example: 18 })
  proteinG: number;

  @ApiProperty({ example: 32 })
  carbsG: number;

  @ApiProperty({ example: 24 })
  fatG: number;

  @ApiProperty({ example: 3 })
  fiberG: number;

  @ApiProperty({ example: 62, description: '0-100, higher means healthier' })
  healthScore: number;

  @ApiProperty({ example: false })
  isJunkFood: boolean;

  @ApiProperty({ example: 'Balanced protein and fat from paneer and cream; moderate calories for a main course.' })
  reason: string;

  @ApiProperty({ enum: GoalTag, isArray: true })
  suggestedGoalTags: GoalTag[];
}

export class MealMutationResultDto {
  @ApiProperty({ example: 'f1e2d3c4-b5a6-4978-8b6c-5d4e3f2a1b0c' })
  id: string;
}

export class MealAvailabilityDto {
  @ApiProperty({ example: 'f1e2d3c4-b5a6-4978-8b6c-5d4e3f2a1b0c' })
  id: string;

  @ApiProperty({ example: true })
  isAvailable: boolean;
}
