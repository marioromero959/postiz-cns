import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';

type AdsProviderConfig = {
  enabled?: boolean;
  accountId?: string;
  accountName?: string;
  notes?: string;
  customerId?: string;
  developerToken?: string;
  adAccountId?: string;
  businessId?: string;
  pixelId?: string;
};

type AdsClientSettings = {
  google?: AdsProviderConfig;
  meta?: AdsProviderConfig;
  instagram?: AdsProviderConfig;
};

/** Ads settings keyed by channel-group (customer) id */
type AdsSettings = {
  byCustomer?: Record<string, AdsClientSettings>;
  // legacy flat shape (pre–per-client) — still accepted on read
  google?: AdsProviderConfig;
  meta?: AdsProviderConfig;
  instagram?: AdsProviderConfig;
};

@ApiTags('Ads')
@Controller('/ads-settings')
export class AdsSettingsController {
  private dir() {
    return process.env.UPLOAD_DIRECTORY || '/uploads';
  }

  private fileFor(orgId: string) {
    return path.join(this.dir(), `ads-settings-${orgId}.json`);
  }

  @Get()
  async get(@GetOrgFromRequest() org: Organization): Promise<AdsSettings> {
    try {
      const raw = await fs.readFile(this.fileFor(org.id), 'utf8');
      return JSON.parse(raw);
    } catch {
      return { byCustomer: {} };
    }
  }

  @Post()
  async save(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AdsSettings
  ) {
    const dir = this.dir();
    await fs.mkdir(dir, { recursive: true });
    const payload: AdsSettings = {
      byCustomer: body?.byCustomer ?? {},
    };
    await fs.writeFile(
      this.fileFor(org.id),
      JSON.stringify(payload, null, 2),
      'utf8'
    );
    return { ok: true };
  }
}
