import { authenticated, date, entity, int, set, text, uuid } from '@microsoft/rayfin-core';
import type { CreditArea, CreditFileRecord } from '@rayfin-app/shared';

@entity()
@authenticated(['read', 'create'], {
  policy: (claims, file) => claims.sub.eq(file.owner_id),
})
@authenticated('update', {
  policy: (claims, file) => claims.sub.eq(file.owner_id),
  include: ['opinionChoice', 'opinionNote', 'opinionAt'],
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
  @text({ optional: true, max: 80 }) opinionChoice?: string;
  @text({ optional: true, max: 3000 }) opinionNote?: string;
  @date({ optional: true }) opinionAt?: Date;
}
