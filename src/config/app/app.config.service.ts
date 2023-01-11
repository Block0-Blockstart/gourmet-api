import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigNumber, ethers } from 'ethers';

export enum Environment {
  Development = 'dev',
  Production = 'prod',
  Test = 'test',
}

@Injectable()
export class AppConfigService {
  constructor(private cs: ConfigService) {}

  //reminder: environment is set in package.json, not in .env
  get NODE_ENV(): Environment {
    const v = this.cs.get('NODE_ENV');
    return v === Environment.Production
      ? Environment.Production
      : v === Environment.Test
      ? Environment.Test
      : Environment.Development;
  }

  // Optional (the app can be deployed with read features only)
  get ADMIN_KEY(): string {
    return this.cs.get<string>('ADMIN_KEY');
  }

  // ! Always required, even for read
  get ADMIN_ADDRESS(): string {
    return this.toStringRequired('ADMIN_ADDRESS');
  }

  get NFT_CONTRACT_ADDRESS(): string {
    return this.toStringRequired('NFT_CONTRACT_ADDRESS');
  }

  get NOTARIZATION_CONTRACT_ADDRESS(): string {
    return this.toStringRequired('NOTARIZATION_CONTRACT_ADDRESS');
  }

  // Optional (the app can be deployed with read features only)
  get MINTER_KEY(): string {
    return this.cs.get<string>('MINTER_KEY');
  }

  // Optional (Notes:
  // - If provided, the MINTER_KEY also allows to read
  // - If not READER_KEY and no MINTER_KEY, nft-notarization service will throw appropriate error
  get READER_KEY(): string {
    return this.cs.get<string>('READER_KEY');
  }

  get WITH_SWAGGER(): boolean {
    return !!this.cs.get<string>('WITH_SWAGGER');
  }

  get API_PORT(): number {
    return this.toNumberRequired('API_PORT');
  }

  get BLOCKCHAIN_RPC_URL_PORT(): string {
    return this.toStringRequired('BLOCKCHAIN_RPC_URL_PORT');
  }

  private toNumberRequired(key: string): number {
    try {
      return Number.parseInt(this.cs.get<string>(key) || 'IWILLTHROW');
    } catch (e) {
      throw new Error(`Missing or bad environment variable: ${key}`);
    }
  }

  private toStringRequired(key: string): string {
    const v = this.cs.get(key);
    if (v) return v;
    throw new Error(`Missing or bad environment variable: ${key}`);
  }

  private toBigNumberRequired(key: string): BigNumber {
    const v = this.cs.get<string>(key);
    if (v === undefined || v === null) {
      throw new Error(`Missing or bad environment variable: ${key}`);
    }
    return ethers.BigNumber.from(v);
  }
}
