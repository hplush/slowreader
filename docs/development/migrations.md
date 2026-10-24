# How to Change the Data Format?

We sync state by sending Logux actions. Old actions stay in the cloud and in the device logs forever, so a change in the format of an existing column or action needs a migration, which converts actions from the previous format.

## New Column

Add it to the table in [`core/schema.ts`](../../core/schema.ts) as `optional()` or with `default`, so old actions without it stay valid. It needs no migration and no `SUBPROTOCOL` bump.

## Format Change

1. Change the table in [`core/schema.ts`](../../core/schema.ts).
2. Increase `SUBPROTOCOL` in [`api/index.ts`](../../api/index.ts) and `minSubprotocol` in [`server/index.ts`](../../server/index.ts) to the same number. Devices with the old client will show the “outdated” page and stop sending actions in the old format.
3. Add a migration with the new subprotocol number to [`core/migrations.ts`](../../core/migrations.ts). It gets an action in the previous format and must return a new object. Use `mapCrdtFields()` for table actions.
4. Add tests to [`core/test/migrations.test.ts`](../../core/test/migrations.test.ts). For a column change, also add a test like `converts the old tables by the migrations` in [`core/test/schema.test.ts`](../../core/test/schema.test.ts).

## How It Works

- Logux Client applies migrations to actions from the server and to entries read from the log, by `meta.subprotocol`.
- On a schema change, Logux Client rebuilds the tables. It reads the old tables by the old schema and converts the restored actions by migrations from the subprotocol, which wrote the tables.
- Old actions are not converted in the cloud: the server can’t read encrypted actions. Devices convert them on the download.
