import { HiveWorkerType } from "@withonevision/omnihive-hive-common/enums/HiveWorkerType";
import { AwaitHelper } from "@withonevision/omnihive-hive-common/helpers/AwaitHelper";
import { OmniHiveConstants } from "@withonevision/omnihive-hive-common/models/OmniHiveConstants";
import { StoredProcSchema } from "@withonevision/omnihive-hive-common/models/StoredProcSchema";
import { HiveWorkerFactory } from "@withonevision/omnihive-hive-worker/HiveWorkerFactory";
import { IDatabaseWorker } from "@withonevision/omnihive-hive-worker/interfaces/IDatabaseWorker";
import { IFileSystemWorker } from "@withonevision/omnihive-hive-worker/interfaces/IFileSystemWorker";
import { FieldNode, GraphQLResolveInfo, SelectionNode } from "graphql";

export class ParseStoredProcedure {
    public parse = async (workerName: string, resolveInfo: GraphQLResolveInfo): Promise<{ procName: string, results: any[][] }[]> => {

        const fileSystemWorker: IFileSystemWorker | undefined = await AwaitHelper.execute<IFileSystemWorker | undefined>(
            HiveWorkerFactory.getInstance().getHiveWorker<IFileSystemWorker | undefined>(HiveWorkerType.FileSystem));

        if (!fileSystemWorker) {
            throw new Error("FileSystem Worker Not Defined.  This graph converter will not work without a FileSystem worker.");
        }

        const databaseWorker: IDatabaseWorker | undefined = await AwaitHelper.execute<IDatabaseWorker | undefined>(
            HiveWorkerFactory.getInstance().getHiveWorker<IDatabaseWorker | undefined>(HiveWorkerType.Database, workerName));

        if (!databaseWorker) {
            throw new Error("FileSystem Worker Not Defined.  This graph converter will not work without a FileSystem worker.");
        }

        const schemaFilePath: string = `${fileSystemWorker.getCurrentExecutionDirectory()}/${OmniHiveConstants.SERVER_OUTPUT_DIRECTORY}/connections/${workerName}.json`;
        const jsonSchema: any = JSON.parse(fileSystemWorker.readFile(schemaFilePath));
        const fullSchema: StoredProcSchema[] = jsonSchema["storedProcs"];
        const response: { procName: string, results: any[][] }[] = [];

        const storedProcCall: readonly SelectionNode[] = resolveInfo.operation.selectionSet.selections;

        for (const call of storedProcCall) {
            const callFieldNode = call as FieldNode;
            const inputArgs: readonly SelectionNode[] | undefined = callFieldNode.selectionSet?.selections;

            if (!inputArgs) {
                throw new Error("Stored Procedure Graph Construction is Incorrect");
            }

            for (const selection of inputArgs) {
                const selectionFieldNode = selection as FieldNode;
                const proc: StoredProcSchema | undefined = fullSchema.find((s) => {
                    return s.storedProcName === selectionFieldNode.name.value;
                });

                if (!proc) {
                    throw new Error("Stored Procedure Graph Construction is Incorrect");
                }

                const procArgs: { name: string, value: any, isString: boolean }[] = [];

                selectionFieldNode.arguments?.forEach((args: any) => {

                    procArgs.push({
                        name: args.name.value,
                        value: args.value.value,
                        isString: args.value.kind === "StringValue"
                    });

                });

                response.push({ procName: proc.storedProcName, results: await AwaitHelper.execute<any[][]>(databaseWorker.executeStoredProcedure(proc, procArgs)) });
            }
        }

        return response;
    }
}