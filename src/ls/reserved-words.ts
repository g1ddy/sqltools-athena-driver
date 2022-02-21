import { NSDatabase } from '@sqltools/types';

// from: https://docs.aws.amazon.com/athena/latest/ug/reserved-words.html
const reservedWordsArr = [
  'ALL', 'ALTER', 'AND', 'ARRAY', 'AS', 'AUTHORIZATION', 'BETWEEN', 'BIGINT', 'BINARY', 'BOOLEAN', 'BOTH',
  'BY', 'CASE', 'CASHE', 'CAST', 'CHAR', 'COLUMN', 'CONF', 'CONSTRAINT', 'COMMIT', 'CREATE', 'CROSS', 'CUBE',
  'CURRENT', 'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'CURSOR', 'DATABASE', 'DATE', 'DAYOFWEEK', 'DECIMAL',
  'DELETE', 'DESCRIBE', 'DISTINCT', 'DOUBLE', 'DROP', 'ELSE', 'END', 'EXCHANGE', 'EXISTS', 'EXTENDED',
  'EXTERNAL', 'EXTRACT', 'FALSE', 'FETCH', 'FLOAT', 'FLOOR', 'FOLLOWING', 'FOR', 'FOREIGN', 'FROM', 'FULL',
  'FUNCTION', 'GRANT', 'GROUP', 'GROUPING', 'HAVING', 'IF', 'IMPORT', 'IN', 'INNER', 'INSERT', 'INT', 'INTEGER',
  'INTERSECT', 'INTERVAL', 'INTO', 'IS', 'JOIN', 'LATERAL', 'LEFT', 'LESS', 'LIKE', 'LOCAL', 'MACRO', 'MAP', 'MORE',
  'NONE', 'NOT', 'NULL', 'NUMERIC', 'OF', 'ON', 'ONLY', 'OR', 'ORDER', 'OUT', 'OUTER', 'OVER', 'PARTIALSCAN', 'PARTITION',
  'PERCENT', 'PRECEDING', 'PRECISION', 'PRESERVE', 'PRIMARY', 'PROCEDURE', 'RANGE', 'READS', 'REDUCE', 'REGEXP',
  'REFERENCES', 'REVOKE', 'RIGHT', 'RLIKE', 'ROLLBACK', 'ROLLUP', 'ROW', 'ROWS', 'SELECT', 'SET', 'SMALLINT', 'START,TABLE',
  'TABLESAMPLE', 'THEN', 'TIME', 'TIMESTAMP', 'TO', 'TRANSFORM', 'TRIGGER', 'TRUE', 'TRUNCATE', 'UNBOUNDED,UNION',
  'UNIQUEJOIN', 'UPDATE', 'USER', 'USING', 'UTC_TIMESTAMP', 'VALUES', 'VARCHAR', 'VIEWS', 'WHEN', 'WHERE', 'WINDOW', 'WITH',

  'ALTER', 'AND', 'AS', 'BETWEEN', 'BY', 'CASE', 'CAST',
  'CONSTRAINT', 'CREATE', 'CROSS', 'CUBE', 'CURRENT_DATE', 'CURRENT_PATH',
  'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'CURRENT_USER', 'DEALLOCATE',
  'DELETE', 'DESCRIBE', 'DISTINCT', 'DROP', 'ELSE', 'END', 'ESCAPE', 'EXCEPT',
  'EXECUTE', 'EXISTS', 'EXTRACT', 'FALSE', 'FIRST', 'FOR', 'FROM', 'FULL', 'GROUP',
  'GROUPING', 'HAVING', 'IN', 'INNER', 'INSERT', 'INTERSECT', 'INTO',
  'IS', 'JOIN', 'LAST', 'LEFT', 'LIKE', 'LOCALTIME', 'LOCALTIMESTAMP', 'NATURAL',
  'NORMALIZE', 'NOT', 'NULL', 'OF', 'ON', 'OR', 'ORDER', 'OUTER', 'PREPARE',
  'RECURSIVE', 'RIGHT', 'ROLLUP', 'SELECT', 'TABLE', 'THEN', 'TRUE',
  'UNESCAPE', 'UNION', 'UNNEST', 'USING', 'VALUES', 'WHEN', 'WHERE', 'WITH'
];

const reservedWordsCompletion: { [w: string]: NSDatabase.IStaticCompletion } = reservedWordsArr.reduce((agg, word) => {
  agg[word] = {
    label: word,
    detail: word,
    filterText: word,
    sortText: (['SELECT', 'CREATE', 'UPDATE', 'DELETE'].includes(word) ? '2:' : '') + word,
    documentation: {
      value: `\`\`\`yaml\nWORD: ${word}\n\`\`\``,
      kind: 'markdown'
    }
  };
  return agg;
}, {});

export default reservedWordsCompletion;
