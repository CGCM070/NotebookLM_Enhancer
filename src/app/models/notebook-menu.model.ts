import type { Notebook } from './notebook.model';

export type NotebookMenuRequest = {
  notebook: Notebook;
  x: number;
  y: number;
};
