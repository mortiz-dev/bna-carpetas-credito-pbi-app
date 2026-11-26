import {
  RayfinContext,
  UserDataFunctions,
} from '@microsoft/fabric-user-data-functions';
import { queryBcra, type BcraReport } from './bcra.js';

const udf = new UserDataFunctions();

udf.func(
  'consultarBcra',
  async (ctx: RayfinContext, cuit: string): Promise<BcraReport> => {
    if (!ctx.user.id) throw new Error('Iniciá sesión para consultar el BCRA.');
    return queryBcra(cuit);
  },
  [],
);
