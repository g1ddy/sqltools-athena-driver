import AbstractDriver from '@sqltools/base-driver';
import { IConnectionDriver, MConnectionExplorer, NSDatabase, Arg0, ContextValue } from '@sqltools/types';
import queries from './queries';
import { v4 as generateId } from 'uuid';
import { Athena, Credentials, SharedIniFileCredentials } from 'aws-sdk';
import reservedWordsCompletion from './reserved-words';

export default class AthenaDriver extends AbstractDriver<Athena, Athena.Types.ClientConfiguration> implements IConnectionDriver {

  queries = queries
  lastUsedDatabase = ''

  /**
   * If you driver depends on node packages, list it below on `deps` prop.
   * It will be installed automatically on first use of your driver.
   */
  public readonly deps: typeof AbstractDriver.prototype['deps'] = [{
    type: AbstractDriver.CONSTANTS.DEPENDENCY_PACKAGE,
    name: 'lodash',
    // version: 'x.x.x',
  }];

  /** if you need to require your lib in runtime and then
   * use `this.lib.methodName()` anywhere and vscode will take care of the dependencies
   * to be installed on a cache folder
   **/
  // private get lib() {
  //   return this.requireDep('node-packge-name') as DriverLib;
  // }

  public async open() {
    if (this.connection) {
      return this.connection;
    }

    if (this.credentials.connectionMethod.toLowerCase() !== 'profile')
      var credentials = new Credentials({
        accessKeyId: this.credentials.accessKeyId,
        secretAccessKey: this.credentials.secretAccessKey,
        sessionToken: this.credentials.sessionToken,
      });
    else
      var credentials = new SharedIniFileCredentials({ profile: this.credentials.profile });

    this.connection = Promise.resolve(new Athena({
      credentials: credentials,
      region: this.credentials.region || 'us-east-1',
    }));

    return this.connection;
  }

  public async close() { }

  private sleep = (time: number) => new Promise((resolve) => setTimeout(() => resolve(true), time));

  private rawQuery = async (query: string) => {
    const db = await this.open();

    const queryExecution = await db.startQueryExecution({
      QueryString: query,
      WorkGroup: this.credentials.workgroup
    }, (err/*, data*/) => {
      if (err)
        console.log(err, err.stack)
    }).promise();

    const endStatus = new Set(['FAILED', 'SUCCEEDED', 'CANCELLED']);

    let queryCheckExecution;

    do {
      queryCheckExecution = await db.getQueryExecution({
        QueryExecutionId: queryExecution.QueryExecutionId,
      }).promise();

      await this.sleep(200);
    } while (!endStatus.has(queryCheckExecution.QueryExecution.Status.State))

    if (queryCheckExecution.QueryExecution.Status.State === 'FAILED') {
      throw new Error(queryCheckExecution.QueryExecution.Status.StateChangeReason)
    }

    const result = await db.getQueryResults({
      QueryExecutionId: queryExecution.QueryExecutionId,
    }).promise();
    return result;
  }

  public query: (typeof AbstractDriver)['prototype']['query'] = async (queries, opt = {}) => {
    var queryString = queries.toString();
    const result = await this.rawQuery(queryString);

    const columns = result.ResultSet.ResultSetMetadata.ColumnInfo.map((info) => info.Name);
    const resultSet = result.ResultSet.Rows.slice(1).map(({ Data }) => Object.assign({}, ...Data.map((column, i) => ({ [columns[i]]: column.VarCharValue }))));

    const response: NSDatabase.IResult[] = [{
      cols: columns,
      connId: this.getId(),
      messages: [{ date: new Date(), message: `Query ok with ${result.ResultSet.Rows.length} results` }],
      results: resultSet,
      query: queryString,
      requestId: opt.requestId,
      resultId: generateId(),
    }];

    return response;
  }

  /** if you need a different way to test your connection, you can set it here.
   * Otherwise by default we open and close the connection only
   */
  public async testConnection() {
    await this.open();
    await this.query('SELECT 1', {});
  }

  /**
   * This method is a helper to generate the connection explorer tree.
   * it gets the child items based on current item
   */
  public async getChildrenForItem({ item, parent }: Arg0<IConnectionDriver['getChildrenForItem']>) {
    switch (item.type) {
      case ContextValue.CONNECTION:
      case ContextValue.CONNECTED_CONNECTION:
        return <MConnectionExplorer.IChildItem[]>[
          { label: 'Catalogs', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.SCHEMA },
        ]
      case ContextValue.SCHEMA:
        return <MConnectionExplorer.IChildItem[]>[
          { label: 'Databases', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.DATABASE },
        ];
      case ContextValue.DATABASE:
        return <MConnectionExplorer.IChildItem[]>[
          { label: 'Tables', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.TABLE },
          { label: 'Views', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.VIEW },
        ];
      case ContextValue.TABLE:
        return await this.getColumns(item);
      case ContextValue.VIEW:
      case ContextValue.RESOURCE_GROUP:
        return this.getChildrenForGroup({ item, parent });
    }

    return [];
  }

  private getColumns = async (item: any) => {
    const db = await this.connection;

    const tableMetadata = await db.getTableMetadata({
      CatalogName: item.schema,
      DatabaseName: item.database,
      TableName: item.label
    }).promise();

    return [
      ...tableMetadata.TableMetadata.Columns,
      ...tableMetadata.TableMetadata.PartitionKeys,
    ].map(column => ({
      label: column.Name,
      type: ContextValue.COLUMN,
      dataType: column.Type,
      schema: item.schema,
      database: item.database,
      childType: ContextValue.NO_CHILD,
      isNullable: true,
      iconName: 'column',
      table: item.label,
    }));
  }

  /**
   * This method is a helper to generate the connection explorer tree.
   * It gets the child based on child types
   */
  private async getChildrenForGroup({ item, parent }: Arg0<IConnectionDriver['getChildrenForItem']>) {
    const db = await this.connection;

    switch (item.childType) {
      case ContextValue.SCHEMA:
        const catalogs = await db.listDataCatalogs().promise();

        return catalogs.DataCatalogsSummary.map((catalog) => ({
          database: '',
          label: catalog.CatalogName,
          type: item.childType,
          schema: catalog.CatalogName,
          childType: ContextValue.DATABASE,
        }));
      case ContextValue.DATABASE:
        return await this.getDatabases(parent, item.childType);
      case ContextValue.TABLE:
      case ContextValue.VIEW:
        return await this.getTablesAndViews(parent, item.childType);
    }
    return [];
  }

  private getDatabases = async(parent: NSDatabase.SearchableItem, itemType?: ContextValue) => {
    const db = await this.connection;
    
    const catalog = await db.listDatabases({
      CatalogName: parent.schema,
    }).promise();

    return catalog.DatabaseList.map((database) => ({
      database: database.Name,
      label: database.Name,
      type: itemType,
      schema: parent.schema,
      childType: ContextValue.TABLE,
    }));
  }

  private getTablesAndViews = async (parent: any, itemType?: ContextValue, expression?: string) => {
    const db = await this.connection;

    const tableMetadata = await db.listTableMetadata({
      CatalogName: parent.schema,
      DatabaseName: parent.database,
      Expression: expression,
    }).promise();

    let result = tableMetadata.TableMetadataList.map(row => ({
      database: parent.database,
      label: row.Name,
      type: row.TableType == 'EXTERNAL_TABLE' ? ContextValue.TABLE : ContextValue.VIEW,
      schema: parent.schema,
      childType: ContextValue.COLUMN,
    }));

    if (itemType != null)
      result = result.filter((row) => row.type === itemType);

    return result;
  }

  /**
   * This method is a helper for intellisense and quick picks.
   */
  public async searchItems(itemType: ContextValue, search: string, _extraParams: any = {}): Promise<NSDatabase.SearchableItem[]> {
    // todo figure out other way to retrieve schema
    let schema = 'AwsDataCatalog'

    switch (itemType) {
      case ContextValue.TABLE:
      case ContextValue.VIEW:
        
        let tableParts = search.split('.');
        let databaseName = tableParts[0].toLowerCase();

        if (tableParts.length <= 1){
          const databases = await this.rawQuery(`SHOW DATABASES LIKE '.*${databaseName}.*'`);

          return databases.ResultSet.Rows
            .map((row) => ({
              database: row.Data[0].VarCharValue,
              label: row.Data[0].VarCharValue,
              type: ContextValue.DATABASE,
              schema: schema,
              childType: ContextValue.TABLE,
            }));
        }
        
        this.lastUsedDatabase = databaseName;
        let tableName = tableParts[1].toLowerCase();
        let expression = `.*${tableName}.*`;
        
        let tablesAndViews = await this.getTablesAndViews({ schema: schema, database: this.lastUsedDatabase}, null, expression)

        return tablesAndViews;
      case ContextValue.COLUMN:
        if (!_extraParams
            || !_extraParams.tables
            || !_extraParams.tables.length)
          return [];

        let table = _extraParams.tables[0];
          
        let columns = await this.getColumns({
          schema: schema,
          // todo database isn't properly populated, using lastUsed workaround for now
          database: table.database || this.lastUsedDatabase,
          label: table.label
        });

        return columns;
    }
    return [];
  }

  public getStaticCompletions: IConnectionDriver['getStaticCompletions'] = async () => {
    return reservedWordsCompletion;
  }
}
