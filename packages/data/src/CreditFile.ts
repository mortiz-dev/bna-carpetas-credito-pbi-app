import {
  authenticated,
  boolean,
  date,
  decimal,
  entity,
  int,
  set,
  text,
  uuid,
} from '@microsoft/rayfin-core';
import type {
  CreditArea,
  CreditFileRecord,
  CreditInstance,
  CreditOutcome,
} from '@rayfin-app/shared';

/**
 * A credit case shared by everyone signed in to the app, as the areas' spreadsheets are today.
 * Creation stamps the caller as owner; identity fields (company, area, CUIT, owner) stay fixed after creation.
 */
@entity()
@authenticated('create', {
  policy: (claims, file) => claims.sub.eq(file.owner_id),
})
@authenticated('read')
@authenticated('update', {
  include: [
    'segment',
    'holderCount',
    'entryDate',
    'zonal',
    'branch',
    'responsible',
    'reentry',
    'stage',
    'subStatus',
    'outcome',
    'instance',
    'riskSentAt',
    'riskReturnedAt',
    'legalSentAt',
    'legalOpinionAt',
    'committeeAt',
    'resolvedAt',
    'ratingDueAt',
    'zonalAmount',
    'creditAmount',
    'zonalMonths',
    'creditMonths',
    'zonalGuarantee',
    'creditGuarantee',
    'followUpNote',
    'updatedAt',
    'updatedBy',
    'opinionChoice',
    'opinionNote',
    'opinionAt',
    'opinionBy',
  ],
})
export class CreditFile implements CreditFileRecord {
  @uuid() id!: string;
  @text({ min: 1, max: 160 }) company!: string;
  @set('ge', 'py') area!: CreditArea;
  @text({ min: 1, max: 40 }) segment!: string;
  @int({ min: 1, max: 5 }) holderCount!: number;
  @text({ optional: true, min: 11, max: 11 }) primaryCuit?: string;
  @date() createdAt!: Date;
  @text({ max: 200 }) owner_id!: string;
  @text({ optional: true, max: 200 }) createdBy?: string;

  @date({ optional: true }) entryDate?: Date;
  @text({ optional: true, max: 60 }) zonal?: string;
  @text({ optional: true, max: 60 }) branch?: string;
  @text({ optional: true, max: 80 }) responsible?: string;
  @boolean({ optional: true }) reentry?: boolean;

  @int({ optional: true, min: 0, max: 4 }) stage?: number;
  @text({ optional: true, max: 60 }) subStatus?: string;
  @set({ optional: true }, 'aprobada', 'devuelta', 'stand_by') outcome?: CreditOutcome;
  @set({ optional: true }, 'D', 'C', 'SGC', 'SGD', 'GD', 'SG', 'SGP', 'GG', 'HD') instance?: CreditInstance;

  @date({ optional: true }) riskSentAt?: Date;
  @date({ optional: true }) riskReturnedAt?: Date;
  @date({ optional: true }) legalSentAt?: Date;
  @date({ optional: true }) legalOpinionAt?: Date;
  @date({ optional: true }) committeeAt?: Date;
  @date({ optional: true }) resolvedAt?: Date;
  @date({ optional: true }) ratingDueAt?: Date;

  @decimal({ optional: true, min: 0, precision: 18, scale: 2 }) zonalAmount?: number;
  @decimal({ optional: true, min: 0, precision: 18, scale: 2 }) creditAmount?: number;
  @int({ optional: true, min: 1, max: 360 }) zonalMonths?: number;
  @int({ optional: true, min: 1, max: 360 }) creditMonths?: number;
  @text({ optional: true, max: 60 }) zonalGuarantee?: string;
  @text({ optional: true, max: 60 }) creditGuarantee?: string;

  @text({ optional: true, max: 2000 }) followUpNote?: string;
  @date({ optional: true }) updatedAt?: Date;
  @text({ optional: true, max: 200 }) updatedBy?: string;

  @text({ optional: true, max: 80 }) opinionChoice?: string;
  @text({ optional: true, max: 3000 }) opinionNote?: string;
  @date({ optional: true }) opinionAt?: Date;
  @text({ optional: true, max: 200 }) opinionBy?: string;
}
