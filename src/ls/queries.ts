import { IBaseQueries, NSDatabase } from '@sqltools/types';
import queryFactory from '@sqltools/base-driver/dist/lib/factory';

function escapeTableName(table: Partial<NSDatabase.ITable> | string) {
  let items: string[] = [];
  let tableObj = typeof table === 'string' ? <NSDatabase.ITable>{ label: table } : table;

  tableObj.schema && items.push(`"${tableObj.schema}"`);
  tableObj.database && items.push(`"${tableObj.database}"`);
  items.push(`"${tableObj.label}"`);
  return items.join('.');
}

/** write your queries here go fetch desired data. This queries are just examples copied from SQLite driver */

const describeTable: IBaseQueries['describeTable'] = () => { throw new Error("Not Implemented: describeTable"); };

const fetchColumns: IBaseQueries['fetchColumns'] = () => { throw new Error("Not Implemented: fetchColumns"); };

const fetchRecords: IBaseQueries['fetchRecords'] = queryFactory`
SELECT *
FROM ${p => escapeTableName(p.table)}
OFFSET ${p => p.offset || 0}
LIMIT ${p => p.limit || 50};
`;

const countRecords: IBaseQueries['countRecords'] = queryFactory`
SELECT count(1) AS total
FROM ${p => escapeTableName(p.table)};
`;

const fetchTables: IBaseQueries['fetchTables'] = () => { throw new Error("Not Implemented: fetchTables"); };
const fetchViews: IBaseQueries['fetchTables'] = () => { throw new Error("Not Implemented: fetchViews"); };
const searchTables: IBaseQueries['searchTables'] = () => { throw new Error("Not Implemented: searchTables"); };
const searchColumns: IBaseQueries['searchColumns'] = () => { throw new Error("Not Implemented: searchColumns"); };

export default {
  describeTable,
  countRecords,
  fetchColumns,
  fetchRecords,
  fetchTables,
  fetchViews,
  searchTables,
  searchColumns
}
