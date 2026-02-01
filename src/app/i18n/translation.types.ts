export type Language = 'en' | 'es';

export interface Translations {
  app: {
    title: string;
    inbox: string;
  };
  common: {
    close: string;
  };
  buttons: {
    newFolder: string;
    createSubfolder: string;
    rename: string;
    delete: string;
    options: string;
    drag: string;
    accept: string;
    cancel: string;
    yes: string;
  };
  states: {
    emptyInbox: string;
    expand: string;
    collapse: string;
    expandInbox: string;
    collapseInbox: string;
  };
  placeholders: {
    writeHere: string;
  };
  modals: {
    newFolder: { title: string };
    newSubfolder: { title: string };
    renameFolder: { title: string };
    deleteFolder: { title: string; message: string };
  };
  tooltips: {
    newFolder: string;
    createSubfolder: string;
    renameFolder: string;
    deleteFolder: string;
    options: string;
    drag: string;
    expand: string;
    collapse: string;
    expandInbox: string;
    collapseInbox: string;
    language: string;
    theme: string;
  };
  aria: {
    expandInbox: string;
    collapseInbox: string;
    expandFolder: string;
    collapseFolder: string;
    options: string;
    drag: string;
  };
}
