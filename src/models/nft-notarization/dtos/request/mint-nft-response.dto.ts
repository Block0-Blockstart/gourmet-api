import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

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

export class Blockchain {
  @ApiProperty({
    description: 'transaction hash from the NFT minting',
    type: String,
  })
  @IsString()
  mintTransactionHash: string;

  @ApiProperty({
    description: 'transaction hash from the notarization',
    type: String,
  })
  @IsString()
  notarizationTransactionHash: string;

  @ApiProperty({
    description: 'smart contract address of the NFT',
    type: String,
  })
  @IsString()
  tokenSmartContractAddress: string;

  @ApiProperty({
    description: 'smart contract address of the notarization smart contract',
    type: String,
  })
  @IsString()
  notarizationSmartContractAddress: string;

  @ApiProperty({
    description: 'token Id of the NFT',
    type: Number,
  })
  @IsNumber()
  tokenId: number;
}

export class Batch {
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

export class MintNftResponseDto {
  @ApiProperty({ description: 'The data that was notarized', type: Batch })
  @ValidateNested()
  batch: Batch;
  @ApiProperty({ description: 'The blockchain info from notarization and minting', type: Blockchain })
  @ValidateNested()
  blockchain: Blockchain;
}
