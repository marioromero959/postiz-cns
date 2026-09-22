import { Injectable } from '@nestjs/common';
import { AutopostRepository } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.repository';
import { AutopostDto } from '@gitroom/nestjs-libraries/dtos/autopost/autopost.dto';

/**
 * CNS: Autopost (RSS → social via LangChain) disabled.
 * Kept as no-op stubs so Nest modules / Temporal wiring still compile.
 */
@Injectable()
export class AutopostService {
  constructor(private _autopostsRepository: AutopostRepository) {}

  async stopAll(_org: string) {
    return;
  }

  getAutoposts(orgId: string) {
    return this._autopostsRepository.getAutoposts(orgId);
  }

  async createAutopost(_orgId: string, _body: AutopostDto, _id?: string) {
    return { id: '', active: false } as any;
  }

  async changeActive(orgId: string, id: string, active: boolean) {
    return this._autopostsRepository.changeActive(orgId, id, false);
  }

  async processCron(_active: boolean, _orgId: string, _id: string) {
    return false;
  }

  async deleteAutopost(orgId: string, id: string) {
    return this._autopostsRepository.deleteAutopost(orgId, id);
  }

  async loadXML(_url: string) {
    return { success: false };
  }

  async startAutopost(_id: string) {
    return false;
  }
}
