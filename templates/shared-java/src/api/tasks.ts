/** Lo que devuelve la API Java (TaskResponse). Mantener en sincronía con apps/api o generarlo del OpenAPI. */
export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  doneAt: string | null;
}
