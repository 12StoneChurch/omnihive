/// <reference path="../../../types/globals.omnihive.d.ts" />

import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { ITokenWorker } from "@withonevision/omnihive-core/interfaces/ITokenWorker";
import { ConnectionSchema } from "@withonevision/omnihive-core/models/ConnectionSchema";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { TableSchema } from "@withonevision/omnihive-core/models/TableSchema";
import { Knex } from "knex";
import { IsHelper } from "@withonevision/omnihive-core/helpers/IsHelper";

export class ParseDelete {
    public parse = async (
        workerName: string,
        tableName: string,
        whereObject: any,
        _customDmlArgs: any,
        omniHiveContext: GraphContext
    ): Promise<number> => {
        if (IsHelper.isNullOrUndefined(whereObject) || IsHelper.isEmptyObject(whereObject)) {
            throw new Error("Delete cannot have no where objects/clause.  That is too destructive.");
        }

        const databaseWorker: IDatabaseWorker | undefined = global.omnihive.getWorker<IDatabaseWorker | undefined>(
            HiveWorkerType.Database,
            workerName
        );

        if (IsHelper.isNullOrUndefined(databaseWorker)) {
            throw new Error(
                "Database Worker Not Defined.  This graph converter will not work without a Database worker."
            );
        }

        let disableSecurity: boolean =
            !global.omnihive.getEnvironmentVariable<boolean>("OH_SECURITY_TOKEN_VERIFY") ?? false;

        const tokenWorker: ITokenWorker | undefined = global.omnihive.getWorker<ITokenWorker | undefined>(
            HiveWorkerType.Token
        );

        if (!disableSecurity && IsHelper.isNullOrUndefined(tokenWorker)) {
            throw new Error("[ohAccessError] No token worker defined.");
        }

        if (
            !disableSecurity &&
            !IsHelper.isNullOrUndefined(tokenWorker) &&
            (IsHelper.isNullOrUndefined(omniHiveContext) ||
                IsHelper.isNullOrUndefined(omniHiveContext.access) ||
                IsHelper.isEmptyStringOrWhitespace(omniHiveContext.access))
        ) {
            throw new Error("[ohAccessError] Access token is invalid or expired.");
        }

        if (
            !disableSecurity &&
            !IsHelper.isNullOrUndefined(tokenWorker) &&
            !IsHelper.isNullOrUndefined(omniHiveContext) &&
            !IsHelper.isNullOrUndefined(omniHiveContext.access) &&
            !IsHelper.isEmptyStringOrWhitespace(omniHiveContext.access)
        ) {
            const verifyToken: boolean = await AwaitHelper.execute(tokenWorker.verify(omniHiveContext.access));
            if (!verifyToken) {
                throw new Error("[ohAccessError] Access token is invalid or expired.");
            }
        }

        const schema: ConnectionSchema | undefined = global.omnihive.registeredSchemas.find(
            (value: ConnectionSchema) => value.workerName === workerName
        );
        let tableSchema: TableSchema[] = [];

        if (!IsHelper.isNullOrUndefined(schema)) {
            tableSchema = schema.tables;
        }
        tableSchema = tableSchema.filter((tableSchema: TableSchema) => tableSchema.tableName === tableName);

        const queryBuilder: Knex.QueryBuilder = (databaseWorker.connection as Knex).queryBuilder();
        queryBuilder.from(tableName);

        Object.keys(whereObject).forEach((key: string, index: number) => {
            let columnSchema: TableSchema | undefined = tableSchema.find((column: TableSchema) => {
                return column.columnNameDatabase === key;
            });

            if (IsHelper.isNullOrUndefined(columnSchema)) {
                columnSchema = tableSchema.find((column: TableSchema) => {
                    return column.columnNameEntity === key;
                });
            }

            if (IsHelper.isNullOrUndefined(columnSchema)) {
                return;
            }

            const whereSplitter: string[] = whereObject[key].toString().split("||");

            if (index === 0 && whereSplitter.length === 1) {
                queryBuilder.whereRaw(`${columnSchema.columnNameDatabase} ${whereObject[key]}`);
            }

            if (index > 0 && whereSplitter.length === 1) {
                queryBuilder.andWhereRaw(`${columnSchema.columnNameDatabase} ${whereObject[key]}`);
            }

            if (index === 0 && whereSplitter.length > 1) {
                queryBuilder.where((subWhere) => {
                    whereSplitter.forEach((split, subIndex) => {
                        if (subIndex === 0) {
                            subWhere.whereRaw(`${columnSchema?.columnNameDatabase} ${split}`);
                        } else {
                            subWhere.orWhereRaw(`${columnSchema?.columnNameDatabase} ${split}`);
                        }
                    });
                });
            }

            if (index > 0 && whereSplitter.length > 1) {
                queryBuilder.andWhere((subWhere) => {
                    whereSplitter.forEach((split, subIndex) => {
                        if (subIndex === 0) {
                            subWhere.whereRaw(`${columnSchema?.columnNameDatabase} ${split}`);
                        } else {
                            subWhere.orWhereRaw(`${columnSchema?.columnNameDatabase} ${split}`);
                        }
                    });
                });
            }
        });

        return await AwaitHelper.execute(queryBuilder.del());
    };
}
