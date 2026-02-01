export type Notebook = {
  index: number;
  key: string;
  title: string;
  details: string | null;
  icon: string; // Material icon name (e.g., 'sticky_note_2', 'audio_magic_eraser')
  color: string; // Icon color class (e.g., 'blue', 'green', 'pink', 'yellow', 'orange', 'cyan', 'grey')
};
