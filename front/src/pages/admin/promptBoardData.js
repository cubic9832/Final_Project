import { sortTableRows } from './adminTableData.js';

const values = {
  version: row => row.prompt.version,
  description: row => row.prompt.description,
  answers: row => row.answers,
  likes: row => row.likes,
  dislikes: row => row.dislikes,
  unrated: row => row.unrated,
  positiveRate: row => row.likes + row.dislikes > 0 ? row.likes / (row.likes + row.dislikes) : null,
};

export function sortPromptVersions(rows, sort) {
  const numbered = rows.map((row, index) => ({ ...row, listNumber: rows.length - index }));
  return sortTableRows(numbered, sort, values);
}
