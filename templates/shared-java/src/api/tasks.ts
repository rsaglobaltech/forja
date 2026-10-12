/** What the Java API returns (TaskResponse). Keep in sync with apps/api, or generate it from the OpenAPI spec. */
export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  doneAt: string | null;
}
