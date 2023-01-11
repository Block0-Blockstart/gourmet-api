import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiHeader, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MintNftRequestDto } from './dtos/request/mint-nft-request.dto';
import { MintNftResponseDto } from './dtos/request/mint-nft-response.dto';
import { NftNotarizationService } from './nft-notarization.service';

@ApiTags('batch')
@Controller('batch')
export class NftNotarizationController {
  constructor(private readonly nftNotarizationService: NftNotarizationService) {}

  /* **************************************************
   * WRITE => require admin-like accesskey
   * *********************************************** */
  @ApiHeader({
    name: 'accesskey',
    description: 'Key required to mint NFT proof.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notarization was done and NFT was successfully minted.',
    type: MintNftResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid accesskey or accesskey not matching the NFT contract owner.',
  })
  @Post()
  async mintNft(@Headers() headers: { accesskey: string }, @Body() dto: MintNftRequestDto) {
    return await this.nftNotarizationService.mintNft(headers.accesskey, dto);
  }

  /* **************************************************
   * READ => require user-like or admin-like accesskey
   * *********************************************** */

  @ApiHeader({
    name: 'accesskey',
    description: 'Key required to read NFT proof.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Notarized data about the batch ID, and blockchain references for these data. If multiple notarizations for same batch ID, returns all of them.',
    type: [MintNftResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid accesskey.',
  })
  @ApiResponse({
    status: 404,
    description: 'Notarization not found for the batch ID.',
  })
  @Get(':id')
  async getNftData(@Headers() headers: { accesskey: string }, @Param('id') id: string) {
    return await this.nftNotarizationService.getNftData(headers.accesskey, id);
  }
}
