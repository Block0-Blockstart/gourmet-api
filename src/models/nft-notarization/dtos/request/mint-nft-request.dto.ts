import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

class File {
  @ApiProperty({
    description: 'name of the file',
    type: String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'hashed content of the file',
    type: String,
  })
  @IsString()
  hash: string;
}

class Link {
  @ApiProperty({
    description: 'name of the link',
    type: String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'url',
    type: String,
  })
  @IsString()
  url: string;
}

class Field {
  @ApiProperty({
    description: 'name of the data field',
    type: String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'hashed data',
    type: String,
  })
  @IsString()
  hash: string;
}

export class MintNftRequestDto {
  @ApiProperty({
    description: 'id of the batch',
    type: String,
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'files data',
    type: [File],
  })
  @ValidateNested({ each: true })
  @Type(() => File)
  @IsArray()
  files: File[];

  @ApiProperty({
    description: 'links data',
    type: [Link],
  })
  @ValidateNested({ each: true })
  @Type(() => Link)
  @IsArray()
  links: Link[];

  @ApiProperty({
    description: 'fields data',
    type: [Field],
  })
  @ValidateNested({ each: true })
  @Type(() => Field)
  @IsArray()
  fields: Field[];
}
