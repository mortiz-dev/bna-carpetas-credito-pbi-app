/**
 * Function schema types for RayfinClient.
 *
 * AUTO-GENERATED — do not edit manually.
 * Re-generated automatically when function source files change.
 *
 * If this file is not updating automatically, run:
 *   rayfin dev functions apply
 *
 * The schema is a closed object type: only the function names listed
 * below are accepted by RayfinClient.functions.<name>.invoke(...).
 * Adding, renaming, or changing the signature of a udf.func() call
 * regenerates this file and surfaces type errors at every consumer.
 *
 * IMPORTANT: This file must NOT import any Node.js packages — it is
 * resolved by the frontend app's TypeScript compiler.
 */

export type AppFunctionsSchema = {
  consultarBcra: {
    input: { cuit: string };
    output: { cuit: string; consultedAt: string; current: { state: 'empty' } | { state: 'error'; message: string } | { state: 'ok'; subject: string; value: { period: string; entities: { name: string; amount: number; situation: number; daysLate: null | number; review: boolean; court: boolean }[] } }; history: { state: 'empty' } | { state: 'error'; message: string } | { state: 'ok'; subject: string; value: { period: string; total: number; situation: number }[] }; cheques: { state: 'empty' } | { state: 'error'; message: string } | { state: 'ok'; subject: string; value: { bank: string; number: string; cause: string; amount: number; rejected: string; lifted: null | string; finePaid: null | string; fineStatus: null | string; review: boolean; court: boolean }[] } };
  };
};
