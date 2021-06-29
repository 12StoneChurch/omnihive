import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { GraphQLResolveInfo } from "graphql";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { ParseAstQuery } from "./ParseAstQuery";
import { TableSchema } from "@withonevision/omnihive-core/models/TableSchema";
import { ParseInsert } from "./ParseInsert";
import { ParseDelete } from "./ParseDelete";
import { ParseUpdate } from "./ParseUpdate";
import { ProcFunctionSchema } from "src/packages/omnihive-core/models/ProcFunctionSchema";
import { ParseProcedure } from "./ParseProcedure";

export class ParseMaster {
    public parseAstQuery = async (
        workerName: string,
        args: any,
        resolveInfo: GraphQLResolveInfo,
        omniHiveContext: GraphContext,
        schema: { [tableName: string]: TableSchema[] }
    ): Promise<any> => {
        const parser: ParseAstQuery = new ParseAstQuery();
        return await AwaitHelper.execute(parser.parse(workerName, args, resolveInfo, omniHiveContext, schema));
    };

    public parseDelete = async (
        workerName: string,
        tableKey: string,
        args: any,
        omniHiveContext: GraphContext,
        schema: { [tableName: string]: TableSchema[] }
    ): Promise<number> => {
        const parser: ParseDelete = new ParseDelete();

        return await AwaitHelper.execute(parser.parse(workerName, tableKey, args, omniHiveContext, schema));
    };

    public parseInsert = async (
        workerName: string,
        tableKey: string,
        resolveInfo: GraphQLResolveInfo,
        omniHiveContext: GraphContext,
        schema: { [tableName: string]: TableSchema[] }
    ): Promise<any[]> => {
        const parser: ParseInsert = new ParseInsert();
        return await AwaitHelper.execute(parser.parse(workerName, tableKey, resolveInfo, omniHiveContext, schema));
    };

    public parseUpdate = async (
        workerName: string,
        tableKey: string,
        resolveInfo: any,
        omniHiveContext: GraphContext,
        schema: { [tableName: string]: TableSchema[] }
    ): Promise<any[]> => {
        const parser: ParseUpdate = new ParseUpdate();
        return await AwaitHelper.execute(parser.parse(workerName, tableKey, resolveInfo, omniHiveContext, schema));
    };

    public parseProcedure = async (
        workerName: string,
        resolveInfo: GraphQLResolveInfo,
        omniHiveContext: GraphContext,
        procedureData: ProcFunctionSchema[]
    ): Promise<any[][]> => {
        const parser: ParseProcedure = new ParseProcedure();
        return await AwaitHelper.execute(parser.parse(workerName, resolveInfo, omniHiveContext, procedureData));
    };

    public parseCustomSql = async (
        _workerName: string,
        _encryptedSql: string,
        _omniHiveContext: GraphContext
    ): Promise<any[][]> => {
        return [];
    };
}
