import {
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsDateString,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;


  @IsOptional()
  poll?: string;
}
