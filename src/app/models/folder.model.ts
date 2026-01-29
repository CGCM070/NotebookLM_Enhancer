export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  collapsed: boolean;
  createdAt: number;
};
